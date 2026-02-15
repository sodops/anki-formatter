import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIP } from "@/lib/rate-limit";

const CHUNK_SIZE = 500;

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * POST /api/backup/import — Restore user data from JSON backup
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rl = rateLimit(`backup-import:${ip}`, { limit: 5, windowSec: 60 });
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

    const body = await request.json();
    const data = body?.data;

    if (!data || !Array.isArray(data.decks) || !Array.isArray(data.cards)) {
      return NextResponse.json({ error: "Invalid backup format" }, { status: 400 });
    }

    const decks = data.decks.map((d: any) => ({ ...d, user_id: user.id }));
    const cards = data.cards.map((c: any) => ({ ...c, user_id: user.id }));
    const reviewLogs = Array.isArray(data.review_logs)
      ? data.review_logs.map((r: any) => ({ ...r, user_id: user.id }))
      : [];
    const userData = data.user_data || { settings: {}, daily_progress: {} };

    // Clear existing data (review_logs -> cards -> decks)
    await supabase.from("review_logs").delete().eq("user_id", user.id);
    await supabase.from("cards").delete().eq("user_id", user.id);
    await supabase.from("decks").delete().eq("user_id", user.id);

    // Insert decks and cards in chunks
    for (const chunk of chunkArray(decks, CHUNK_SIZE)) {
      const { error } = await supabase.from("decks").insert(chunk);
      if (error) {
        console.error("[BACKUP IMPORT]", error);
        return NextResponse.json({ error: "Failed to insert decks" }, { status: 500 });
      }
    }

    for (const chunk of chunkArray(cards, CHUNK_SIZE)) {
      const { error } = await supabase.from("cards").insert(chunk);
      if (error) {
        console.error("[BACKUP IMPORT]", error);
        return NextResponse.json({ error: "Failed to insert cards" }, { status: 500 });
      }
    }

    if (reviewLogs.length > 0) {
      for (const chunk of chunkArray(reviewLogs, CHUNK_SIZE)) {
        const { error } = await supabase.from("review_logs").insert(chunk);
        if (error) {
          console.error("[BACKUP IMPORT]", error);
          return NextResponse.json({ error: "Failed to insert review logs" }, { status: 500 });
        }
      }
    }

    // Upsert user_data
    await supabase.from("user_data").upsert({
      user_id: user.id,
      settings: userData.settings || {},
      daily_progress: userData.daily_progress || {},
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[BACKUP IMPORT]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
