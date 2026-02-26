import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from '@/lib/logger';

/**
 * GET /api/assignments/[id] — Get assignment detail with progress
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Get assignment with decks
    const { data: assignment, error } = await admin
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
      // Teacher: get all student progress
      const { data: progress } = await admin
        .from("student_progress")
        .select("*")
        .eq("assignment_id", id)
        .order("updated_at", { ascending: false });

      // Fetch profiles separately for reliability (profiles:student_id join can fail)
      const studentIds = (progress || []).map(p => p.student_id);
      let profilesMap: Record<string, any> = {};
      if (studentIds.length > 0) {
        const { data: profiles } = await admin
          .from("profiles")
          .select("id, display_name, avatar_url, total_xp, current_streak")
          .in("id", studentIds);

        if (profiles) {
          for (const p of profiles) {
            profilesMap[p.id] = p;
          }
        }
      }

      // Merge progress with profiles
      const progressWithProfiles = (progress || []).map(p => ({
        ...p,
        profiles: profilesMap[p.student_id] || {
          display_name: "Unknown",
          avatar_url: null,
          total_xp: 0,
          current_streak: 0,
        },
      }));

      return NextResponse.json({
        assignment,
        progress: progressWithProfiles,
        isTeacher: true,
      });
    } else {
      // Student: get own progress
      const { data: myProgress } = await admin
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
    logger.error("GET /api/assignments/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/assignments/[id] — Update assignment (teacher only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.description !== undefined) updates.description = body.description?.trim() || null;
    if (body.deadline !== undefined) updates.deadline = body.deadline;
    if (body.xp_reward !== undefined) updates.xp_reward = body.xp_reward;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    const { data: updated, error } = await admin
      .from("assignments")
      .update(updates)
      .eq("id", id)
      .eq("teacher_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ assignment: updated });
  } catch (error) {
    logger.error("PATCH /api/assignments/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/assignments/[id] — Delete assignment (teacher only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    const { error } = await admin
      .from("assignments")
      .delete()
      .eq("id", id)
      .eq("teacher_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("DELETE /api/assignments/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
