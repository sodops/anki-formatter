import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logger } from '@/lib/logger';

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

    // Already completed
    if (progress.status === "completed") {
      return NextResponse.json(
        { error: "Assignment already completed", progress },
        { status: 400 }
      );
    }

    // Must have studied at least once
    if (progress.cards_studied === 0 || progress.status === "pending") {
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

    let totalXpAwarded = 0;
    const xpBreakdown: { type: string; amount: number }[] = [];
    const accuracy = progress.accuracy || 0;
    const maxXP = assignment?.xp_reward || 10;

    if (assignment) {
      // 1. Base XP — proportional to accuracy
      // Formula: baseXP = maxXP * (accuracy / 100)
      // Minimum 10% of maxXP if they studied
      const accuracyMultiplier = Math.max(0.1, accuracy / 100);
      const baseXP = Math.round(maxXP * accuracyMultiplier);
      totalXpAwarded += baseXP;
      xpBreakdown.push({ type: "assignment_complete", amount: baseXP });

      // 2. Perfect score bonus (+20 XP for 100% accuracy)
      if (accuracy === 100) {
        totalXpAwarded += 20;
        xpBreakdown.push({ type: "perfect_score", amount: 20 });
      }

      // 3. Mastery bonus — extra XP if all cards mastered
      const cardsTotal = progress.cards_total || 0;
      const cardsMastered = progress.cards_mastered || 0;
      if (cardsTotal > 0 && cardsMastered >= cardsTotal) {
        const masteryBonus = Math.round(maxXP * 0.1); // 10% bonus
        totalXpAwarded += masteryBonus;
        xpBreakdown.push({ type: "full_mastery", amount: masteryBonus });
      }

      // Insert XP events
      for (const xpItem of xpBreakdown) {
        await admin.from("xp_events").insert({
          user_id: user.id,
          event_type: xpItem.type,
          xp_amount: xpItem.amount,
          source_id: assignmentId,
          metadata: {
            title: assignment.title,
            accuracy,
            cards_mastered: progress.cards_mastered || 0,
            cards_total: progress.cards_total || 0,
          },
        });
      }

      // Update profile total XP + streak
      const { data: profile } = await admin
        .from("profiles")
        .select("total_xp, current_streak, longest_streak, last_activity_date")
        .eq("id", user.id)
        .single();

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
          const streakBonus = 10;
          totalXpAwarded += streakBonus;
          xpBreakdown.push({ type: "streak_bonus", amount: streakBonus });
          await admin.from("xp_events").insert({
            user_id: user.id,
            event_type: "streak_bonus",
            xp_amount: streakBonus,
            source_id: assignmentId,
            metadata: { streak: newStreak },
          });
        }

        await admin
          .from("profiles")
          .update({
            total_xp: (profile.total_xp || 0) + totalXpAwarded,
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

    // Update student_progress with completion + xp_earned
    const { data: updated, error: updateError } = await admin
      .from("student_progress")
      .update({
        status: "completed",
        completed_at: now,
        xp_earned: totalXpAwarded,
      })
      .eq("assignment_id", assignmentId)
      .eq("student_id", user.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      progress: updated,
      xp_awarded: totalXpAwarded,
      xp_breakdown: xpBreakdown,
    });
  } catch (error) {
    logger.error("POST /api/assignments/[id]/complete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
