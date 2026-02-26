import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { backupImportSchema } from "@/lib/validations";
import { logger } from '@/lib/logger';

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
    const rl = await rateLimit(`backup-import:${ip}`, { limit: 5, windowSec: 60 });
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

    const raw = await request.json();
    const parsed = backupImportSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid backup format", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data.data;

    // Sanitize: overwrite user_id to prevent injection, pick only known fields
    const decks = data.decks.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description ?? null,
      settings: d.settings,
      is_deleted: d.is_deleted,
      created_at: d.created_at,
      updated_at: d.updated_at,
      user_id: user.id,
    }));
    const cards = data.cards.map((c) => ({
      id: c.id,
      deck_id: c.deck_id,
      term: c.term,
      definition: c.definition ?? null,
      tags: c.tags,
      review_data: c.review_data,
      is_suspended: c.is_suspended,
      is_deleted: c.is_deleted,
      created_at: c.created_at,
      updated_at: c.updated_at,
      user_id: user.id,
    }));
    const reviewLogs = data.review_logs.map((r) => ({
      id: r.id,
      card_id: r.card_id,
      deck_id: r.deck_id,
      grade: r.grade,
      elapsed_time: r.elapsed_time,
      review_state: r.review_state,
      created_at: r.created_at,
      user_id: user.id,
    }));
    const userData = data.user_data;

    // Clear existing data (review_logs -> cards -> decks)
    await supabase.from("review_logs").delete().eq("user_id", user.id);
    await supabase.from("cards").delete().eq("user_id", user.id);
    await supabase.from("decks").delete().eq("user_id", user.id);

    // Insert decks and cards in chunks
    for (const chunk of chunkArray(decks, CHUNK_SIZE)) {
      const { error } = await supabase.from("decks").insert(chunk);
      if (error) {
        logger.error("[BACKUP IMPORT]", error);
        return NextResponse.json({ error: "Failed to insert decks" }, { status: 500 });
      }
    }

    for (const chunk of chunkArray(cards, CHUNK_SIZE)) {
      const { error } = await supabase.from("cards").insert(chunk);
      if (error) {
        logger.error("[BACKUP IMPORT]", error);
        return NextResponse.json({ error: "Failed to insert cards" }, { status: 500 });
      }
    }

    if (reviewLogs.length > 0) {
      for (const chunk of chunkArray(reviewLogs, CHUNK_SIZE)) {
        const { error } = await supabase.from("review_logs").insert(chunk);
        if (error) {
          logger.error("[BACKUP IMPORT]", error);
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
    logger.error("[BACKUP IMPORT]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
