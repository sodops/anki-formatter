import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { syncPostSchema } from "@/lib/validations";

/**
 * GET /api/sync — Load user's state from cloud
 * Supports incremental sync via 'since' query parameter.
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limit: 30 requests per minute per IP
    const ip = getClientIP(request);
    const rl = await rateLimit(`sync-get:${ip}`, { limit: 30, windowSec: 60 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use admin client for database queries to bypass RLS
    const admin = createAdminClient();

    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since"); // ISO timestamp string or null

    // 1. Fetch Decks
    let decksQuery = admin.from("decks").select("*").eq("user_id", user.id);

    // 2. Fetch Cards
    let cardsQuery = admin.from("cards").select("*").eq("user_id", user.id);

    // Incremental Sync Logic
    if (since) {
      // If 'since' is provided, we want ALL changes (including deletions) that happened after that time
      decksQuery = decksQuery.gt("updated_at", since);
      cardsQuery = cardsQuery.gt("updated_at", since);
    } else {
      // Full Sync (snapshot): Only get active items.
      // We don't need to send deleted items because the client is starting from scratch.
      decksQuery = decksQuery.eq("is_deleted", false);
      cardsQuery = cardsQuery.eq("is_deleted", false);
    }

    const { data: decks, error: decksError } = await decksQuery;
    if (decksError) throw decksError;

    const { data: cards, error: cardsError } = await cardsQuery;
    if (cardsError) throw cardsError;

    // 3. Fetch Settings & Daily Progress
    // We always fetch these for now as they are single rows and small.
    // Optimization: We could also check updated_at for these if we wanted to be strict.
    const { data: userData } = await admin
      .from("user_data")
      .select("settings, daily_progress, updated_at")
      .eq("user_id", user.id)
      .single();

    // Server-side timestamp for the client to use as the next 'since' token
    const serverTime = new Date().toISOString();

    // 4. Construct State Object (Only for Full Sync usually, but here we return raw arrays for client to merge)
    // The previous implementation constructed a full 'state' object.
    // To maintain backward compatibility while supporting incremental sync:
    // If 'since' is missing -> Return full 'state' structure (Client clears local and uses this).
    // If 'since' is present -> Return 'changes' object (Client merges this).

    if (!since) {
      // --- FULL SYNC RESPONSE (Legacy Structure) ---
      const state = {
        decks: decks.map((d) => ({
          id: d.id,
          name: d.name,
          color: d.settings?.color || "#6366F1",
          createdAt: d.created_at,
          isDeleted: d.is_deleted, // Should be false here
          cards: cards
            .filter((c) => c.deck_id === d.id)
            .map((c) => ({
              id: c.id,
              term: c.term,
              def: c.definition,
              tags: c.tags || [],
              reviewData: c.review_data,
              suspended: c.is_suspended,
              createdAt: c.created_at,
            })),
        })),
        activeDeckId: null, // Client should decide
        searchQuery: "",
        activeView: "library",
        showTrash: false,
        theme: "dark",
        trash: [],
        history: [],
      };

      return NextResponse.json({
        type: "full",
        state,
        settings: userData?.settings || {},
        daily_progress: userData?.daily_progress || {},
        server_time: serverTime,
      });
    } else {
      // --- INCREMENTAL SYNC RESPONSE ---
      // Return flat arrays of changed items. Client maps them.

      const changes = {
        decks: decks.map((d) => ({
          id: d.id,
          name: d.name,
          color: d.settings?.color || "#6366F1",
          createdAt: d.created_at,
          isDeleted: d.is_deleted,
          updatedAt: d.updated_at,
        })),
        cards: cards.map((c) => ({
          id: c.id,
          deckId: c.deck_id,
          term: c.term,
          def: c.definition,
          tags: c.tags || [],
          reviewData: c.review_data,
          suspended: c.is_suspended,
          isDeleted: c.is_deleted,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
        })),
        settings: userData?.updated_at && userData.updated_at > since ? userData.settings : null,
        daily_progress:
          userData?.updated_at && userData.updated_at > since ? userData.daily_progress : null,
      };

      return NextResponse.json({
        type: "delta",
        changes,
        server_time: serverTime,
      });
    }
  } catch (err: unknown) {
    console.error("[SYNC GET]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/sync — Save user's state to cloud
 * Accepts a "Sync Payload" with changes.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 20 requests per minute per IP
    const ip = getClientIP(request);
    const rl = await rateLimit(`sync-post:${ip}`, { limit: 20, windowSec: 60 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use admin client for database operations to bypass RLS
    const admin = createAdminClient();

    const raw = await request.json();
    const parsed = syncPostSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid sync payload", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { changes, settings, daily_progress } = parsed.data;

    // Batch processing arrays
    interface DeckUpsert {
      id: string;
      user_id: string;
      name: string;
      description?: string;
      settings?: Record<string, unknown>;
      is_deleted: boolean;
      created_at: string;
      updated_at: string;
    }

    interface CardUpsert {
      id: string;
      user_id: string;
      deck_id: string;
      term: string;
      definition: string;
      tags?: string[];
      review_data?: Record<string, unknown>;
      is_suspended: boolean;
      is_deleted: boolean;
      created_at: string;
      updated_at: string;
    }

    interface ReviewLogInsert {
      id: string;
      user_id: string;
      card_id: string;
      deck_id: string;
      grade: number;
      elapsed_time: number;
      review_state: Record<string, unknown>;
      created_at: string;
    }

    const deckUpserts: DeckUpsert[] = [];
    const cardUpserts: CardUpsert[] = [];
    const deckDeletes: string[] = [];
    const cardDeletes: string[] = [];
    const reviewLogInserts: ReviewLogInsert[] = [];

    if (changes && Array.isArray(changes)) {
      for (const change of changes) {
        const { type, id } = change;
        // data is Record<string, unknown> — cast fields as needed per type
        const d = change.data as Record<string, string | number | boolean | string[] | Record<string, unknown> | undefined>;

        if (type === "DECK_CREATE" || type === "DECK_UPDATE") {
          deckUpserts.push({
            id: d.id as string,
            user_id: user.id,
            name: d.name as string,
            settings: { color: d.color },
            is_deleted: (d.isDeleted as boolean) || false,
            created_at: (d.createdAt as string) || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        } else if (type === "CARD_CREATE" || type === "CARD_UPDATE") {
          // Ensure deck_id is present for new cards
          if (!d.deckId && type === "CARD_CREATE") {
            console.warn(`Skipping CARD_CREATE ${d.id}: Missing deckId`);
            continue;
          }

          cardUpserts.push({
            id: d.id as string,
            deck_id: d.deckId as string, // Required
            user_id: user.id,
            term: d.term as string,
            definition: d.def as string, // Map 'def' to 'definition'
            tags: (d.tags as string[]) || [],
            review_data: d.reviewData as Record<string, unknown>,
            is_suspended: (d.suspended as boolean) || false,
            is_deleted: false,
            created_at: (d.createdAt as string) || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        } else if (type === "DECK_DELETE") {
          if (id) deckDeletes.push(id);
        } else if (type === "CARD_DELETE") {
          if (id) cardDeletes.push(id);
        } else if (type === "REVIEW_LOG") {
          reviewLogInserts.push({
            id: d.id as string,
            card_id: d.cardId as string,
            user_id: user.id,
            deck_id: d.deckId as string,
            grade: d.grade as number,
            elapsed_time: d.elapsedTime as number,
            review_state: d.reviewState as Record<string, unknown>,
            created_at: d.createdAt as string,
          });
        }
      }
    }

    // Execute Batched Operations in Parallel
    const promises = [];

    if (deckUpserts.length > 0) {
      promises.push(admin.from("decks").upsert(deckUpserts));
    }
    if (cardUpserts.length > 0) {
      promises.push(admin.from("cards").upsert(cardUpserts));
    }
    if (deckDeletes.length > 0) {
      promises.push(
        admin
          .from("decks")
          .update({ is_deleted: true, updated_at: new Date().toISOString() })
          .in("id", deckDeletes)
      );
    }
    if (cardDeletes.length > 0) {
      promises.push(
        admin
          .from("cards")
          .update({ is_deleted: true, updated_at: new Date().toISOString() })
          .in("id", cardDeletes)
      );
    }
    if (reviewLogInserts.length > 0) {
      promises.push(admin.from("review_logs").insert(reviewLogInserts));
    }

    // Update Legacy Settings/Daily Progress (keep in user_data)
    if (settings || daily_progress) {
      // 1. Fetch existing data first to perform a merge
      const { data: existingData } = await admin
        .from("user_data")
        .select("settings, daily_progress")
        .eq("user_id", user.id)
        .single();

      const updateData: {
        user_id: string;
        updated_at: string;
        settings?: Record<string, unknown>;
        daily_progress?: Record<string, unknown>;
      } = {
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };

      // 2. Merge Settings (Deep merge for 'devices', shallow for others)
      if (settings) {
        const currentSettings = existingData?.settings || {};

        // Special handling for devices: merge the objects, don't overwrite
        const mergedDevices = {
          ...(currentSettings.devices || {}),
          ...(settings.devices || {}),
        };

        updateData.settings = {
          ...currentSettings,
          ...settings,
          devices: mergedDevices,
        };
      }

      // 3. Merge Daily Progress (Last write wins for simple fields usually fine, but let's be safe)
      if (daily_progress) {
        const currentProgress = existingData?.daily_progress || {};
        updateData.daily_progress = {
          ...currentProgress,
          ...daily_progress,
        };
      }

      // If neither was provided in payload but we are here (unlikely given the outer if),
      // we shouldn't wipe data. But the outer if checks (settings || daily_progress).
      // If one is missing in payload, we shouldn't include it in updateData to overwrite with null?
      // Actually, upserting {settings: ...} might leave daily_progress alone if we don't specify it?
      // No, upsert replaces the row if we don't specify columns to ignore.
      // Better: We MUST include the existing data for the field we are NOT updating,
      // or ensure we construct a full object.

      if (!settings && existingData?.settings) {
        updateData.settings = existingData.settings;
      }
      if (!daily_progress && existingData?.daily_progress) {
        updateData.daily_progress = existingData.daily_progress;
      }

      promises.push(admin.from("user_data").upsert(updateData));
    }

    // Wait for all operations to complete
    const results = await Promise.all(promises);

    // Check for errors
    const errors = results.filter((r) => r.error).map((r) => r.error?.message);
    if (errors.length > 0) {
      console.error("Sync Batch Errors:", errors);
      return NextResponse.json({ error: "Partial sync failure", details: errors }, { status: 500 });
    }

    return NextResponse.json({ success: true, processed: changes?.length || 0 });
  } catch (err: unknown) {
    console.error("[SYNC POST]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
