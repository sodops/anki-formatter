import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIP } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

/**
 * GET /api/groups/[id] — Get group details with members
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ip = getClientIP(request);
    const rl = await rateLimit(`group-detail:${ip}`, { limit: 30, windowSec: 60 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Get group
    const { data: group, error } = await admin
      .from("groups")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Check membership
    const isOwner = group.owner_id === user.id;
    if (!isOwner) {
      const { data: membership } = await admin
        .from("group_members")
        .select("id")
        .eq("group_id", id)
        .eq("user_id", user.id)
        .single();

      if (!membership) {
        return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
      }
    }

    // Get members with profiles
    const { data: members, error: membersError } = await admin
      .from("group_members")
      .select(`
        id, user_id, role, joined_at,
        profiles:user_id (display_name, avatar_url, total_xp, current_streak)
      `)
      .eq("group_id", id)
      .order("joined_at", { ascending: true });

    if (membersError) {
      console.error("Members query error:", membersError);
    }

    // Get assignments
    const { data: assignments } = await admin
      .from("assignments")
      .select(`
        *,
        assignment_decks(id, deck_name, card_count)
      `)
      .eq("group_id", id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    // If teacher, get student progress summary for each assignment
    let progressMap: Record<string, unknown[]> = {};
    if (isOwner && assignments?.length) {
      const assignmentIds = assignments.map(a => a.id);
      const { data: progress } = await admin
        .from("student_progress")
        .select("*")
        .in("assignment_id", assignmentIds);

      if (progress) {
        for (const p of progress) {
          if (!progressMap[p.assignment_id]) progressMap[p.assignment_id] = [];
          progressMap[p.assignment_id].push(p);
        }
      }
    }

    return NextResponse.json({
      group,
      members: members || [],
      assignments: (assignments || []).map(a => ({
        ...a,
        progress: progressMap[a.id] || [],
      })),
      isOwner,
    });
  } catch (error) {
    console.error("GET /api/groups/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/groups/[id] — Update group (owner only)
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

    const admin = createAdminClient();

    const { data: group } = await admin
      .from("groups")
      .select("owner_id")
      .eq("id", id)
      .single();

    if (!group || group.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.description !== undefined) updates.description = body.description?.trim() || null;
    if (body.color !== undefined) updates.color = body.color;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    const { data: updated, error } = await admin
      .from("groups")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ group: updated });
  } catch (error) {
    console.error("PATCH /api/groups/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/groups/[id] — Delete group (owner only)
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

    const admin = createAdminClient();
    const { error } = await admin
      .from("groups")
      .delete()
      .eq("id", id)
      .eq("owner_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/groups/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
