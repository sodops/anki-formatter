import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIP } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/groups — List groups for the current user
 * Uses admin client (service role) to bypass RLS for reads
 */
export async function GET(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rl = await rateLimit(`groups-get:${ip}`, { limit: 30, windowSec: 60 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Auth check with user's session
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use admin client for all DB queries (bypasses RLS)
    const admin = createAdminClient();

    const [
      { data: profile },
      { data: ownedGroups, error: ownedError },
      { data: memberships, error: memberError },
    ] = await Promise.all([
      admin.from("profiles").select("role").eq("id", user.id).single(),
      admin
        .from("groups")
        .select("*")
        .eq("owner_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
      admin
        .from("group_members")
        .select(`
          group_id,
          joined_at,
          groups (
            id, name, description, color, join_code, owner_id, created_at, is_active
          )
        `)
        .eq("user_id", user.id),
    ]);

    const role = profile?.role || "student";

    if (memberError) {
      console.error("[/api/groups] Memberships error:", memberError.message);
    }

    // Get all group IDs for count queries
    const allGroupIds = new Set<string>();
    (ownedGroups || []).forEach(g => allGroupIds.add(g.id));
    (memberships || []).forEach(m => {
      const g = m.groups as { id?: string } | null;
      if (g?.id) allGroupIds.add(g.id);
    });

    // Query member counts for all groups
    const memberCounts = new Map<string, number>();
    const assignmentCounts = new Map<string, number>();

    if (allGroupIds.size > 0) {
      const groupIdsArray = Array.from(allGroupIds);
      
      // Get member counts
      const [{ data: memberCountsData }, { data: assignmentCountsData }] = await Promise.all([
        admin.from("group_members").select("group_id").in("group_id", groupIdsArray),
        admin.from("assignments").select("group_id").in("group_id", groupIdsArray),
      ]);

      // Count members per group
      (memberCountsData || []).forEach((mc: { group_id: string }) => {
        const count = memberCounts.get(mc.group_id) || 0;
        memberCounts.set(mc.group_id, count + 1);
      });

      // Count assignments per group
      (assignmentCountsData || []).forEach((ac: { group_id: string }) => {
        const count = assignmentCounts.get(ac.group_id) || 0;
        assignmentCounts.set(ac.group_id, count + 1);
      });
    }

    // Deduplicate and add counts
    const groupMap = new Map<string, Record<string, unknown>>();

    (ownedGroups || []).forEach(g => {
      groupMap.set(g.id, {
        ...g,
        member_count: memberCounts.get(g.id) || 0,
        assignment_count: assignmentCounts.get(g.id) || 0,
        is_owner: true,
      });
    });

    (memberships || []).forEach(m => {
      const g = m.groups as {
        id?: string;
        owner_id?: string;
        is_active?: boolean;
      } | null;
      if (g && g.id && !groupMap.has(g.id) && g.is_active !== false) {
        groupMap.set(g.id, {
          ...g,
          member_count: memberCounts.get(g.id) || 0,
          assignment_count: assignmentCounts.get(g.id) || 0,
          joined_at: m.joined_at,
          is_owner: g.owner_id === user.id,
        });
      }
    });

    const groups = Array.from(groupMap.values());

    return NextResponse.json({ groups, role });
  } catch (error: any) {
    console.error("GET /api/groups error:", error?.message || error);
    if (error?.code === '42P01' || error?.message?.includes('relation') || error?.message?.includes('does not exist')) {
      return NextResponse.json({ groups: [], role: 'student' });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/groups — Create a new group (Teachers only)
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rl = await rateLimit(`groups-post:${ip}`, { limit: 10, windowSec: 60 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Verify teacher role
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Profile query error:", profileError.message);
      return NextResponse.json({ error: "Failed to verify role: " + profileError.message }, { status: 500 });
    }

    if (profile?.role !== "teacher" && profile?.role !== "admin") {
      return NextResponse.json({ 
        error: `Only teachers can create groups. Your current role is: "${profile?.role || 'unknown'}".` 
      }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, color } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }

    // Create the group
    const { data: group, error } = await admin
      .from("groups")
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        color: color || "#6366F1",
        owner_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Group insert error:", error.message, error.code);
      return NextResponse.json({ error: "Failed to create group: " + error.message }, { status: 500 });
    }

    // Auto-add teacher as a member
    const { error: memberError } = await admin.from("group_members").insert({
      group_id: group.id,
      user_id: user.id,
      role: "teacher",
    });

    if (memberError) {
      console.error("Member insert error:", memberError.message);
    }

    return NextResponse.json({ group }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/groups error:", error?.message || error);
    return NextResponse.json({ error: "Internal server error: " + (error?.message || "unknown") }, { status: 500 });
  }
}
