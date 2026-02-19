import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/assignments/[id]/study — Get cards for assignment study session
 * Returns all cards from the assignment's source decks
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: assignmentId } = params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Get the assignment
    const { data: assignment, error: assignError } = await admin
      .from("assignments")
      .select(`
        id, title, xp_reward, deadline, group_id,
        assignment_decks(id, source_deck_id, deck_name, card_count)
      `)
      .eq("id", assignmentId)
      .eq("is_active", true)
      .single();

    if (assignError || !assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    // Get source deck IDs
    const sourceDeckIds = (assignment.assignment_decks || [])
      .map((d: any) => d.source_deck_id)
      .filter(Boolean);

    if (sourceDeckIds.length === 0) {
      return NextResponse.json({ error: "No decks attached to this assignment" }, { status: 400 });
    }

    // Fetch all cards from source decks (teacher's cards)
    const { data: cards, error: cardsError } = await admin
      .from("cards")
      .select("id, term, definition, tags, deck_id")
      .in("deck_id", sourceDeckIds)
      .eq("is_deleted", false)
      .eq("is_suspended", false);

    if (cardsError) throw cardsError;

    // Get student's progress for this assignment
    const { data: progress } = await admin
      .from("student_progress")
      .select("*")
      .eq("assignment_id", assignmentId)
      .eq("student_id", user.id)
      .single();

    return NextResponse.json({
      assignment: {
        id: assignment.id,
        title: assignment.title,
        xp_reward: assignment.xp_reward,
        deadline: assignment.deadline,
        decks: assignment.assignment_decks,
      },
      cards: (cards || []).map(c => ({
        id: c.id,
        term: c.term,
        definition: c.definition,
        tags: c.tags,
      })),
      progress: progress || null,
      total_cards: (cards || []).length,
    });
  } catch (error) {
    console.error("GET /api/assignments/[id]/study error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/assignments/[id]/study — Submit study session results
 * Body: { cards_studied, cards_mastered, accuracy, total_reviews, time_spent_seconds, ratings: {again, hard, good, easy} }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: assignmentId } = params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const body = await request.json();
    const { cards_studied, cards_mastered, accuracy, total_reviews, time_spent_seconds, ratings } = body;

    // Get existing progress
    const { data: existing } = await admin
      .from("student_progress")
      .select("*")
      .eq("assignment_id", assignmentId)
      .eq("student_id", user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Progress record not found" }, { status: 404 });
    }

    // Build update - accumulate stats
    const newCardsStudied = Math.max(existing.cards_studied || 0, cards_studied || 0);
    const newCardsMastered = Math.max(existing.cards_mastered || 0, cards_mastered || 0);
    const newTotalReviews = (existing.total_reviews || 0) + (total_reviews || 0);
    const newTimeSpent = (existing.time_spent_seconds || 0) + (time_spent_seconds || 0);
    
    // Weighted average accuracy
    const oldWeight = existing.total_reviews || 0;
    const newWeight = total_reviews || 0;
    const totalWeight = oldWeight + newWeight;
    const newAccuracy = totalWeight > 0 
      ? Math.round(((existing.accuracy || 0) * oldWeight + (accuracy || 0) * newWeight) / totalWeight)
      : accuracy || 0;

    const updates: Record<string, unknown> = {
      cards_studied: newCardsStudied,
      cards_mastered: newCardsMastered,
      accuracy: newAccuracy,
      total_reviews: newTotalReviews,
      time_spent_seconds: newTimeSpent,
      last_studied_at: new Date().toISOString(),
    };

    // Update status
    if (existing.status === "pending") {
      updates.status = "in_progress";
      updates.started_at = new Date().toISOString();
    }

    // Check if completed (all cards mastered or high accuracy after reviewing all)
    const cardsTotal = existing.cards_total || 0;
    if (newCardsMastered >= cardsTotal && cardsTotal > 0) {
      updates.status = "completed";
      updates.completed_at = new Date().toISOString();
    }

    const { data: updated, error: updateError } = await admin
      .from("student_progress")
      .update(updates)
      .eq("assignment_id", assignmentId)
      .eq("student_id", user.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // If just completed, award XP
    if (updates.status === "completed" && existing.status !== "completed") {
      const { data: assignment } = await admin
        .from("assignments")
        .select("xp_reward, title, teacher_id")
        .eq("id", assignmentId)
        .single();

      if (assignment) {
        // Award XP
        await admin.from("xp_events").insert({
          user_id: user.id,
          event_type: "assignment_complete",
          xp_amount: assignment.xp_reward || 10,
          source_id: assignmentId,
          metadata: { title: assignment.title, accuracy: newAccuracy },
        });

        // Update profile XP
        const { data: profile } = await admin
          .from("profiles")
          .select("total_xp")
          .eq("id", user.id)
          .single();

        if (profile) {
          await admin
            .from("profiles")
            .update({ total_xp: (profile.total_xp || 0) + (assignment.xp_reward || 10) })
            .eq("id", user.id);
        }

        // Notify teacher
        const { data: studentProfile } = await admin
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single();

        await admin.from("notifications").insert({
          user_id: assignment.teacher_id,
          type: "assignment_graded",
          title: "Assignment Completed",
          message: `${studentProfile?.display_name || "A student"} completed "${assignment.title}" with ${newAccuracy}% accuracy`,
          data: { assignment_id: assignmentId, student_id: user.id },
        });
      }
    }

    return NextResponse.json({ 
      progress: updated,
      completed: updates.status === "completed",
    });
  } catch (error) {
    console.error("POST /api/assignments/[id]/study error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
