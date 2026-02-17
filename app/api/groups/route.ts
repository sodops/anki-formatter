import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIP } from "@/lib/rate-limit";

/**
 * GET /api/groups — List groups for the current user
 * Teachers see groups they own; Students see groups they've joined
 */
export async function GET(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rl = await rateLimit(`groups-get:${ip}`, { limit: 30, windowSec: 60 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user role
    let role = "student";
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      role = profile?.role || "student";
    } catch (profileError: any) {
      // If profiles table doesn't exist or query fails, default to student role
      console.warn("Profile query failed, defaulting to student role:", profileError?.message);
    }

    if (role === "teacher" || role === "admin") {
      // Teachers see groups they own + member counts
      const { data: ownedGroups, error } = await supabase
        .from("groups")
        .select(`
          *,
          group_members(count),
          assignments(count)
        `)
        .eq("owner_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const groups = (ownedGroups || []).map(g => ({
        ...g,
        member_count: g.group_members?.[0]?.count || 0,
        assignment_count: g.assignments?.[0]?.count || 0,
        is_owner: true,
      }));

      return NextResponse.json({ groups, role });
    } else {
      // Students see groups they've joined
      const { data: memberships, error } = await supabase
        .from("group_members")
        .select(`
          group_id,
          joined_at,
          groups (
            id, name, description, color, join_code, owner_id, created_at,
            group_members(count),
            assignments(count)
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;

      const groups = (memberships || []).map(m => {
        const g = m.groups as any;
        return {
          ...g,
          member_count: g?.group_members?.[0]?.count || 0,
          assignment_count: g?.assignments?.[0]?.count || 0,
          joined_at: m.joined_at,
          is_owner: false,
        };
      });

      return NextResponse.json({ groups, role });
    }
  } catch (error: any) {
    console.error("GET /api/groups error:", error?.message || error);
    // If table doesn't exist yet, return empty
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

    // Verify teacher role
    const { data: profile, error: profileError } = await supabase
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
        error: `Only teachers can create groups. Your current role is: "${profile?.role || 'unknown'}". Update your role to "teacher" in Supabase Dashboard → profiles table.` 
      }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, color } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }

    // Create the group
    const { data: group, error } = await supabase
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
    const { error: memberError } = await supabase.from("group_members").insert({
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
