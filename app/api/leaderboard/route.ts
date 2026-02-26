import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/leaderboard — Get XP leaderboard
 * ?group_id=xxx for group-specific leaderboard
 * Otherwise returns global top 50
 */
export async function GET(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rl = await rateLimit(`leaderboard-get:${ip}`, { limit: 20, windowSec: 60 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("group_id");

    if (groupId) {
      // Group leaderboard — only members
      const { data: members } = await supabase
        .from("group_members")
        .select(`
          user_id,
          role,
          profiles:user_id (display_name, avatar_url, total_xp, current_streak)
        `)
        .eq("group_id", groupId);

      if (!members) {
        return NextResponse.json({ leaderboard: [] });
      }

      const leaderboard = members
        .map((m, idx) => {
          const p = m.profiles as any;
          return {
            user_id: m.user_id,
            display_name: p?.display_name || "Anonymous",
            avatar_url: p?.avatar_url || null,
            total_xp: p?.total_xp || 0,
            current_streak: p?.current_streak || 0,
            role: m.role,
            rank: idx + 1,
            is_me: m.user_id === user.id,
          };
        })
        .sort((a, b) => (b.total_xp as number) - (a.total_xp as number))
        .map((item, idx) => ({ ...item, rank: idx + 1 }));

      return NextResponse.json({ leaderboard, group_id: groupId });
    } else {
      // Global leaderboard — top 50
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, total_xp, current_streak")
        .order("total_xp", { ascending: false })
        .limit(50);

      const leaderboard = (profiles || []).map((p, idx) => ({
        user_id: p.id,
        display_name: p.display_name || "Anonymous",
        avatar_url: p.avatar_url,
        total_xp: p.total_xp || 0,
        current_streak: p.current_streak || 0,
        rank: idx + 1,
        is_me: p.id === user.id,
      }));

      return NextResponse.json({ leaderboard });
    }
  } catch (error) {
    logger.error("GET /api/leaderboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
