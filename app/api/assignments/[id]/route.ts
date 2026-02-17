import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/assignments/[id] — Get assignment detail with progress
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get assignment with decks
    const { data: assignment, error } = await supabase
      .from("assignments")
      .select(`
        *,
        assignment_decks(id, deck_name, card_count, source_deck_id),
        groups(id, name, color, owner_id)
      `)
      .eq("id", id)
      .single();

    if (error || !assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const isTeacher = assignment.teacher_id === user.id;

    if (isTeacher) {
      // Teacher: get all student progress with profiles
      const { data: progress } = await supabase
        .from("student_progress")
        .select(`
          *,
          profiles:student_id (display_name, avatar_url, total_xp, current_streak)
        `)
        .eq("assignment_id", id)
        .order("updated_at", { ascending: false });

      return NextResponse.json({
        assignment,
        progress: progress || [],
        isTeacher: true,
      });
    } else {
      // Student: get own progress
      const { data: myProgress } = await supabase
        .from("student_progress")
        .select("*")
        .eq("assignment_id", id)
        .eq("student_id", user.id)
        .single();

      return NextResponse.json({
        assignment,
        my_progress: myProgress || null,
        isTeacher: false,
      });
    }
  } catch (error) {
    console.error("GET /api/assignments/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/assignments/[id] — Update assignment (teacher only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.description !== undefined) updates.description = body.description?.trim() || null;
    if (body.deadline !== undefined) updates.deadline = body.deadline;
    if (body.xp_reward !== undefined) updates.xp_reward = body.xp_reward;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    const { data: updated, error } = await supabase
      .from("assignments")
      .update(updates)
      .eq("id", id)
      .eq("teacher_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ assignment: updated });
  } catch (error) {
    console.error("PATCH /api/assignments/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/assignments/[id] — Delete assignment (teacher only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("assignments")
      .delete()
      .eq("id", id)
      .eq("teacher_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/assignments/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
