import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIP } from "@/lib/rate-limit";

/**
 * PATCH /api/assignments/[id]/progress — Update student progress on assignment
 * Body: { cards_studied, cards_mastered, accuracy, time_spent_seconds, total_reviews }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await params;
    const ip = getClientIP(request);
    const rl = await rateLimit(`progress-patch:${ip}`, { limit: 60, windowSec: 60 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Get existing progress
    const { data: existing } = await supabase
      .from("student_progress")
      .select("*")
      .eq("assignment_id", assignmentId)
      .eq("student_id", user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Progress record not found" }, { status: 404 });
    }

    // Build update
    const updates: Record<string, unknown> = {
      last_studied_at: new Date().toISOString(),
    };

    if (body.cards_studied !== undefined) updates.cards_studied = body.cards_studied;
    if (body.cards_mastered !== undefined) updates.cards_mastered = body.cards_mastered;
    if (body.accuracy !== undefined) updates.accuracy = body.accuracy;
    if (body.total_reviews !== undefined) updates.total_reviews = body.total_reviews;
    if (body.time_spent_seconds !== undefined) {
      updates.time_spent_seconds = (existing.time_spent_seconds || 0) + body.time_spent_seconds;
    }

    // Update status
    if (existing.status === "pending") {
      updates.status = "in_progress";
      updates.started_at = new Date().toISOString();
    }

    // Check if completed (all cards mastered)
    const cardsTotal = existing.cards_total || 0;
    const cardsMastered = body.cards_mastered !== undefined ? body.cards_mastered : existing.cards_mastered;
    if (cardsMastered >= cardsTotal && cardsTotal > 0) {
      updates.status = "completed";
      updates.completed_at = new Date().toISOString();
    }

    const { data: updated, error } = await supabase
      .from("student_progress")
      .update(updates)
      .eq("assignment_id", assignmentId)
      .eq("student_id", user.id)
      .select()
      .single();

    if (error) throw error;

    // If just completed, award XP
    if (updates.status === "completed" && existing.status !== "completed") {
      const { data: assignment } = await supabase
        .from("assignments")
        .select("xp_reward, title, teacher_id")
        .eq("id", assignmentId)
        .single();

      if (assignment) {
        // Award assignment XP
        await supabase.from("xp_events").insert({
          user_id: user.id,
          event_type: "assignment_complete",
          xp_amount: assignment.xp_reward || 10,
          source_id: assignmentId,
          metadata: { title: assignment.title },
        });

        // Update profile total
        try {
          await supabase.rpc("award_xp", {
            p_user_id: user.id,
            p_event_type: "assignment_complete",
            p_xp_amount: assignment.xp_reward || 10,
            p_source_id: assignmentId,
          });
        } catch {
          // Fallback: manually update if RPC not available
        }

        // Notify teacher
        await supabase.from("notifications").insert({
          user_id: assignment.teacher_id,
          type: "assignment_graded",
          title: "Assignment Completed",
          message: `A student completed "${assignment.title}" with ${Math.round(body.accuracy || 0)}% accuracy`,
          data: { assignment_id: assignmentId, student_id: user.id },
        });
      }
    }

    return NextResponse.json({ progress: updated });
  } catch (error) {
    console.error("PATCH /api/assignments/[id]/progress error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
