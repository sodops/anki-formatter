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
    const { data: updated, error: updateError } = await admin
      .from("student_progress")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("assignment_id", assignmentId)
      .eq("student_id", user.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Award XP
    const { data: assignment } = await admin
      .from("assignments")
      .select("xp_reward, title, teacher_id")
      .eq("id", assignmentId)
      .single();

    let xpAwarded = 0;

    if (assignment) {
      xpAwarded = assignment.xp_reward || 10;

      // Insert XP event
      await admin.from("xp_events").insert({
        user_id: user.id,
        event_type: "assignment_complete",
        xp_amount: xpAwarded,
        source_id: assignmentId,
        metadata: {
          title: assignment.title,
          accuracy: progress.accuracy || 0,
          cards_mastered: progress.cards_mastered || 0,
          cards_total: progress.cards_total || 0,
        },
      });

      // Update profile total XP
      const { data: profile } = await admin
        .from("profiles")
        .select("total_xp")
        .eq("id", user.id)
        .single();

      if (profile) {
        await admin
          .from("profiles")
          .update({
            total_xp: (profile.total_xp || 0) + xpAwarded,
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
          message: `${studentProfile?.display_name || "A student"} completed "${assignment.title}" with ${Math.round(progress.accuracy || 0)}% accuracy`,
          data: { assignment_id: assignmentId, student_id: user.id },
        });
      } catch {
        // notification insert failure is non-critical
      }
    }

    return NextResponse.json({
      success: true,
      progress: updated,
      xp_awarded: xpAwarded,
    });
  } catch (error) {
    console.error("POST /api/assignments/[id]/complete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
