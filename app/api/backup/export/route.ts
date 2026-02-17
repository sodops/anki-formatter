import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIP } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

/**
 * GET /api/backup/export — Export all user data as JSON
 */
export async function GET(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rl = await rateLimit(`backup-export:${ip}`, { limit: 10, windowSec: 60 });
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

    const { searchParams } = new URL(request.url);
    const includeLogs = searchParams.get("include_logs") !== "false";

    const [{ data: decks, error: decksError }, { data: cards, error: cardsError }, { data: userData }]
      = await Promise.all([
        supabase.from("decks").select("*").eq("user_id", user.id),
        supabase.from("cards").select("*").eq("user_id", user.id),
        supabase.from("user_data").select("settings, daily_progress").eq("user_id", user.id).single(),
      ]);

    if (decksError || cardsError) {
      console.error("[BACKUP EXPORT]", decksError || cardsError);
      return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }

    let reviewLogs: any[] = [];
    if (includeLogs) {
      const { data: logs, error: logsError } = await supabase
        .from("review_logs")
        .select("*")
        .eq("user_id", user.id);
      if (logsError) {
        console.error("[BACKUP EXPORT]", logsError);
        return NextResponse.json({ error: "Failed to fetch review logs" }, { status: 500 });
      }
      reviewLogs = logs || [];
    }

    const backup = {
      version: 1,
      exported_at: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email || null,
      },
      data: {
        decks: decks || [],
        cards: cards || [],
        review_logs: reviewLogs,
        user_data: userData || { settings: {}, daily_progress: {} },
      },
    };

    return NextResponse.json(backup);
  } catch (err: unknown) {
    console.error("[BACKUP EXPORT]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
