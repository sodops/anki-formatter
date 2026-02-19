import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIP } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

/**
 * GET /api/profile/[username] — Get public profile by username
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const ip = getClientIP(request);
    const rl = await rateLimit(`public-profile:${ip}`, { limit: 30, windowSec: 60 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const admin = createAdminClient();

    // Find profile by username (check both username and nickname columns for compatibility)
    let profile = null;
    const { data: byUsername } = await admin
      .from("profiles")
      .select("id, display_name, avatar_url, bio, username, nickname, role, total_xp, current_streak, longest_streak, last_activity_date, created_at")
      .or(`username.eq.${username},nickname.eq.${username}`)
      .limit(1)
      .single();

    if (byUsername) {
      profile = byUsername;
    }

    if (!profile) {
      // Try finding by user ID as fallback
      const { data: byId } = await admin
        .from("profiles")
        .select("id, display_name, avatar_url, bio, username, nickname, role, total_xp, current_streak, longest_streak, last_activity_date, created_at")
        .eq("id", username)
        .single();
      if (byId) profile = byId;
    }

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Get user's groups (only public info)
    const { data: memberships } = await admin
      .from("group_members")
      .select("group_id, role, joined_at")
      .eq("user_id", profile.id);

    let groups: any[] = [];
    if (memberships && memberships.length > 0) {
      const groupIds = memberships.map(m => m.group_id);
      const { data: groupData } = await admin
        .from("groups")
        .select("id, name, color")
        .in("id", groupIds)
        .eq("is_active", true);
      
      groups = (groupData || []).map(g => {
        const m = memberships.find(mm => mm.group_id === g.id);
        return { ...g, role: m?.role || "student" };
      });
    }

    // Get XP stats
    const { data: xpEvents } = await admin
      .from("xp_events")
      .select("event_type, xp_amount, created_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Get completed assignments count
    const { count: completedCount } = await admin
      .from("student_progress")
      .select("id", { count: "exact", head: true })
      .eq("student_id", profile.id)
      .eq("status", "completed");

    // Check if viewer is logged in and connection status
    let connectionStatus: string | null = null;
    let viewerId: string | null = null;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        viewerId = user.id;
        // Check connection status
        const { data: conn } = await admin
          .from("connections")
          .select("id, status, requester_id")
          .or(`and(requester_id.eq.${user.id},target_id.eq.${profile.id}),and(requester_id.eq.${profile.id},target_id.eq.${user.id})`)
          .limit(1)
          .single();
        if (conn) {
          connectionStatus = conn.status;
        }
      }
    } catch {
      // Not logged in, that's fine
    }

    // Achievements
    const achievements = [];
    if ((completedCount || 0) >= 1) achievements.push({ id: "first_task", name: "First Task", icon: "🎯" });
    if ((completedCount || 0) >= 5) achievements.push({ id: "scholar", name: "Scholar", icon: "📚" });
    if (profile.current_streak >= 3) achievements.push({ id: "on_fire", name: "On Fire", icon: "🔥" });
    if (profile.current_streak >= 7) achievements.push({ id: "week_warrior", name: "Week Warrior", icon: "⚡" });
    if (profile.total_xp >= 100) achievements.push({ id: "century", name: "Century", icon: "💯" });
    if (profile.total_xp >= 500) achievements.push({ id: "star", name: "Star Student", icon: "🌟" });

    // Get connections count
    const { count: connectionsCount } = await admin
      .from("connections")
      .select("id", { count: "exact", head: true })
      .eq("status", "accepted")
      .or(`requester_id.eq.${profile.id},target_id.eq.${profile.id}`);

    return NextResponse.json({
      profile: {
        id: profile.id,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        username: profile.username || profile.nickname,
        role: profile.role,
        total_xp: profile.total_xp || 0,
        current_streak: profile.current_streak || 0,
        longest_streak: profile.longest_streak || 0,
        last_activity_date: profile.last_activity_date,
        created_at: profile.created_at,
        completed_assignments: completedCount || 0,
        connections_count: connectionsCount || 0,
      },
      groups,
      achievements,
      recent_xp: xpEvents || [],
      connection_status: connectionStatus,
      is_own_profile: viewerId === profile.id,
    });
  } catch (error) {
    console.error("GET /api/profile/[username] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
