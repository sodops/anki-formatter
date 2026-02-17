import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIP } from "@/lib/rate-limit";

/**
 * GET /api/xp — Get user's XP summary, streak, and recent events
 */
export async function GET(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rl = await rateLimit(`xp-get:${ip}`, { limit: 30, windowSec: 60 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get profile with XP and streak
    const { data: profile } = await supabase
      .from("profiles")
      .select("total_xp, current_streak, longest_streak, last_activity_date")
      .eq("id", user.id)
      .single();

    // Get recent XP events
    const { data: recentEvents } = await supabase
      .from("xp_events")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Get today's XP
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: todayEvents } = await supabase
      .from("xp_events")
      .select("xp_amount")
      .eq("user_id", user.id)
      .gte("created_at", today.toISOString());

    const todayXP = (todayEvents || []).reduce((sum, e) => sum + e.xp_amount, 0);

    // Calculate level (100 XP per level)
    const totalXP = profile?.total_xp || 0;
    const level = Math.floor(totalXP / 100) + 1;
    const xpInLevel = totalXP % 100;

    return NextResponse.json({
      total_xp: totalXP,
      today_xp: todayXP,
      level,
      xp_in_level: xpInLevel,
      xp_to_next_level: 100 - xpInLevel,
      current_streak: profile?.current_streak || 0,
      longest_streak: profile?.longest_streak || 0,
      last_activity_date: profile?.last_activity_date,
      recent_events: recentEvents || [],
    });
  } catch (error: any) {
    console.error("GET /api/xp error:", error?.message || error);
    if (error?.code === '42P01' || error?.message?.includes('relation') || error?.message?.includes('does not exist')) {
      return NextResponse.json({ total_xp: 0, today_xp: 0, level: 1, xp_to_next: 100, current_streak: 0, longest_streak: 0, recent_events: [] });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/xp — Award XP for an activity
 * Body: { event_type, xp_amount, source_id?, metadata? }
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rl = await rateLimit(`xp-post:${ip}`, { limit: 60, windowSec: 60 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { event_type, xp_amount, source_id, metadata } = body;

    const validTypes = ["review", "assignment_complete", "streak_bonus", "perfect_score", "daily_goal", "first_review"];
    if (!validTypes.includes(event_type)) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }

    if (!xp_amount || xp_amount <= 0 || xp_amount > 100) {
      return NextResponse.json({ error: "Invalid XP amount" }, { status: 400 });
    }

    // Insert XP event
    const { error: xpError } = await supabase
      .from("xp_events")
      .insert({
        user_id: user.id,
        event_type,
        xp_amount,
        source_id: source_id || null,
        metadata: metadata || {},
      });

    if (xpError) throw xpError;

    // Update profile total_xp
    const { data: profile } = await supabase
      .from("profiles")
      .select("total_xp")
      .eq("id", user.id)
      .single();

    const newTotal = (profile?.total_xp || 0) + xp_amount;

    await supabase
      .from("profiles")
      .update({ total_xp: newTotal })
      .eq("id", user.id);

    // Update streak
    const today = new Date().toISOString().split("T")[0];
    const { data: streakProfile } = await supabase
      .from("profiles")
      .select("current_streak, longest_streak, last_activity_date")
      .eq("id", user.id)
      .single();

    if (streakProfile) {
      const lastDate = streakProfile.last_activity_date;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      let newStreak = streakProfile.current_streak;
      if (!lastDate || lastDate < yesterdayStr) {
        newStreak = 1;
      } else if (lastDate === yesterdayStr) {
        newStreak = streakProfile.current_streak + 1;
      }
      // if lastDate === today, keep same streak

      await supabase
        .from("profiles")
        .update({
          current_streak: newStreak,
          longest_streak: Math.max(streakProfile.longest_streak || 0, newStreak),
          last_activity_date: today,
        })
        .eq("id", user.id);
    }

    return NextResponse.json({
      total_xp: newTotal,
      xp_awarded: xp_amount,
      level: Math.floor(newTotal / 100) + 1,
    });
  } catch (error: any) {
    console.error("POST /api/xp error:", error?.message || error);
    if (error?.code === '42P01' || error?.message?.includes('relation') || error?.message?.includes('does not exist')) {
      return NextResponse.json({ error: "XP system is not yet configured." }, { status: 503 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
