import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logger } from '@/lib/logger';

/**
 * POST /api/groups/join — Join a group by join code
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rl = await rateLimit(`groups-join:${ip}`, { limit: 10, windowSec: 60 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const body = await request.json();
    const { join_code } = body;

    if (!join_code?.trim()) {
      return NextResponse.json({ error: "Join code is required" }, { status: 400 });
    }

    // Find group by join code
    const { data: group, error: groupError } = await admin
      .from("groups")
      .select("id, name, max_members, is_active, owner_id")
      .eq("join_code", join_code.trim().toLowerCase())
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: "Invalid join code" }, { status: 404 });
    }

    if (!group.is_active) {
      return NextResponse.json({ error: "This group is no longer active" }, { status: 400 });
    }

    // Can't join your own group
    if (group.owner_id === user.id) {
      return NextResponse.json({ error: "You already own this group" }, { status: 400 });
    }

    // Check if already a member
    const { data: existing } = await admin
      .from("group_members")
      .select("id")
      .eq("group_id", group.id)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: "You are already a member of this group" }, { status: 400 });
    }

    // Check member limit
    const { count } = await admin
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("group_id", group.id);

    if (count && count >= group.max_members) {
      return NextResponse.json({ error: "This group is full" }, { status: 400 });
    }

    // Get user role
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    // Add member
    const { error: joinError } = await admin
      .from("group_members")
      .insert({
        group_id: group.id,
        user_id: user.id,
        role: profile?.role === "teacher" ? "teacher" : "student",
      });

    if (joinError) throw joinError;

    // Create pending progress for all active assignments
    const { data: assignments } = await admin
      .from("assignments")
      .select(`
        id,
        assignment_decks(card_count)
      `)
      .eq("group_id", group.id)
      .eq("is_active", true);

    if (assignments?.length && profile?.role !== "teacher") {
      const progressRecords = assignments.map(a => ({
        assignment_id: a.id,
        student_id: user.id,
        status: "pending" as const,
        cards_total: (a.assignment_decks || []).reduce(
          (sum: number, d: { card_count: number }) => sum + (d.card_count || 0), 0
        ),
      }));

      await admin.from("student_progress").insert(progressRecords);
    }

    // Create notification for group owner
    await admin.from("notifications").insert({
      user_id: group.owner_id,
      type: "group_invite",
      title: "New member joined",
      message: `A new student joined ${group.name}`,
      data: { group_id: group.id, user_id: user.id },
    });

    return NextResponse.json({ 
      success: true, 
      group: { id: group.id, name: group.name } 
    });
  } catch (error) {
    logger.error("POST /api/groups/join error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
