import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { isAdminUser } from "@/lib/admin";

/**
 * GET /api/admin/overview — Summary data for admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rl = rateLimit(`admin-overview:${ip}`, { limit: 30, windowSec: 60 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [
      decksRes,
      cardsRes,
      logsRes,
      vitalsRes,
    ] = await Promise.all([
      supabase.from("decks").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("cards").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("system_logs").select("*", { count: "exact" }).eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("web_vitals").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);

    if (decksRes.error || cardsRes.error || logsRes.error || vitalsRes.error) {
      console.error("[ADMIN OVERVIEW]", decksRes.error || cardsRes.error || logsRes.error || vitalsRes.error);
      return NextResponse.json({ error: "Failed to fetch overview" }, { status: 500 });
    }

    return NextResponse.json({
      counts: {
        decks: decksRes.count || 0,
        cards: cardsRes.count || 0,
        logs: logsRes.count || 0,
        webVitals: vitalsRes.count || 0,
      },
      recentLogs: logsRes.data || [],
      user: {
        id: user.id,
        email: user.email || null,
      },
    });
  } catch (err: unknown) {
    console.error("[ADMIN OVERVIEW]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}