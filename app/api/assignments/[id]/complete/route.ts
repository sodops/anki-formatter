import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIP } from "@/lib/rate-limit";

/**
 * POST /api/assignments/[id]/complete — Student manually completes an assignment
 * This awards XP and marks the assignment as done.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: assignmentId } = params;
    const ip = getClientIP(request);
    const rl = await rateLimit(`complete:${ip}`, { limit: 10, windowSec: 60 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Get existing progress
    const { data: progress } = await admin
      .from("student_progress")
      .select("*")
      .eq("assignment_id", assignmentId)
      .eq("student_id", user.id)
      .single();

    if (!progress) {
      return NextResponse.json(
        { error: "Progress record not found" },
        { status: 404 }
      );
    }

    const wasCompleted = progress.status === "completed";

    // Must have studied at least once
    if (!wasCompleted && (progress.cards_studied === 0 || progress.status === "pending")) {
      return NextResponse.json(
        { error: "You need to study at least once before completing" },
        { status: 400 }
      );
    }

    // Mark as completed
    const now = new Date().toISOString();

    // Award XP
    const { data: assignment } = await admin
      .from("assignments")
      .select("xp_reward, title, teacher_id")
      .eq("id", assignmentId)
      .single();

    const xpBreakdown: { type: string; amount: number }[] = [];
    let xpAddedThisRequest = 0;
    let totalXpAwarded = Number(progress.xp_earned || 0);
    const accuracy = progress.accuracy || 0;
    const maxXP = assignment?.xp_reward || 10;

    if (assignment) {
      const { data: profile } = await admin
        .from("profiles")
        .select("total_xp, current_streak, longest_streak, last_activity_date")
        .eq("id", user.id)
        .single();

      // 1. Base XP — proportional to accuracy
      // Formula: baseXP = maxXP * (accuracy / 100)
      // Minimum 10% of maxXP if they studied
      const accuracyMultiplier = Math.max(0.1, accuracy / 100);
      const baseXP = Math.round(maxXP * accuracyMultiplier);
      xpBreakdown.push({ type: "assignment_complete", amount: baseXP });

      // 2. Perfect score bonus (+20 XP for 100% accuracy)
      if (accuracy === 100) {
        xpBreakdown.push({ type: "perfect_score", amount: 20 });
      }

      // 3. Mastery bonus — extra XP if all cards mastered
      const cardsTotal = progress.cards_total || 0;
      const cardsMastered = progress.cards_mastered || 0;
      if (cardsTotal > 0 && cardsMastered >= cardsTotal) {
        const masteryBonus = Math.round(maxXP * 0.1); // 10% bonus
        xpBreakdown.push({ type: "full_mastery", amount: masteryBonus });
      }

      if (profile) {
        const today = new Date().toISOString().split("T")[0];
        const lastDate = profile.last_activity_date;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        let newStreak = profile.current_streak || 0;
        if (!lastDate || lastDate < yesterdayStr) {
          newStreak = 1;
        } else if (lastDate === yesterdayStr) {
          newStreak = (profile.current_streak || 0) + 1;
        }
        // if lastDate === today, keep same streak

        // Daily streak bonus (+10 XP if streak increased)
        if (lastDate !== today && newStreak > 0) {
          xpBreakdown.push({ type: "streak_bonus", amount: 10 });
        }

        const xpTypes = xpBreakdown.map((x) => x.type);
        const { data: existingEvents } = await admin
          .from("xp_events")
          .select("event_type, xp_amount")
          .eq("user_id", user.id)
          .eq("source_id", assignmentId)
          .in("event_type", xpTypes);

        const existingByType = new Map<string, number>();
        for (const event of existingEvents || []) {
          if (!existingByType.has(event.event_type)) {
            existingByType.set(event.event_type, Number(event.xp_amount || 0));
          }
        }

        for (const xpItem of xpBreakdown) {
          if (existingByType.has(xpItem.type)) {
            continue;
          }

          const metadata =
            xpItem.type === "streak_bonus"
              ? { streak: newStreak }
              : {
                  title: assignment.title,
                  accuracy,
                  cards_mastered: progress.cards_mastered || 0,
                  cards_total: progress.cards_total || 0,
                };

          const { error: insertError } = await admin.from("xp_events").insert({
            user_id: user.id,
            event_type: xpItem.type,
            xp_amount: xpItem.amount,
            source_id: assignmentId,
            metadata,
          });

          if (!insertError) {
            xpAddedThisRequest += xpItem.amount;
          }
        }

        const alreadyAwarded = Array.from(existingByType.values()).reduce((sum, value) => sum + value, 0);
        totalXpAwarded = alreadyAwarded + xpAddedThisRequest;

        await admin
          .from("profiles")
          .update({
            total_xp: (profile.total_xp || 0) + xpAddedThisRequest,
            current_streak: newStreak,
            longest_streak: Math.max(profile.longest_streak || 0, newStreak),
            last_activity_date: today,
          })
          .eq("id", user.id);
      }

      // Notify teacher
      const { data: studentProfile } = await admin
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      if (!wasCompleted) {
        try {
          await admin.from("notifications").insert({
            user_id: assignment.teacher_id,
            type: "assignment_graded",
            title: "Assignment Completed",
            message: `${studentProfile?.display_name || "A student"} completed "${assignment.title}" with ${Math.round(accuracy)}% accuracy and earned ${totalXpAwarded} XP`,
            data: { assignment_id: assignmentId, student_id: user.id },
          });
        } catch {
          // notification insert failure is non-critical
        }
      }
    }

    // Update student_progress with completion + xp_earned
    const { data: updated, error: updateError } = await admin
      .from("student_progress")
      .update({
        status: "completed",
        completed_at: progress.completed_at || now,
        xp_earned: totalXpAwarded,
      })
      .eq("assignment_id", assignmentId)
      .eq("student_id", user.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      idempotent: wasCompleted || xpAddedThisRequest === 0,
      progress: updated,
      xp_awarded: xpAddedThisRequest,
      xp_total_for_assignment: totalXpAwarded,
      xp_breakdown: xpBreakdown,
    });
  } catch (error) {
    console.error("POST /api/assignments/[id]/complete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
