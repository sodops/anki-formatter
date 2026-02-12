import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/sync — Load user's state from cloud
 * Now constructs the state from relational tables.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch Decks
    const { data: decks, error: decksError } = await supabase
      .from("decks")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_deleted", false);

    if (decksError) throw decksError;

    // 2. Fetch Cards
    const { data: cards, error: cardsError } = await supabase
      .from("cards")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_deleted", false);

    if (cardsError) throw cardsError;

    // 3. Fetch Settings & Daily Progress (Still JSON for now, or new tables?)
    // For now, let's keep them in user_data or similar lighter table if we didn't migrate them yet.
    // The migration plan kept them in user_data.
    const { data: userData } = await supabase
      .from("user_data")
      .select("settings, daily_progress")
      .eq("user_id", user.id)
      .single();

    // 4. Construct State Object
    const state = {
      decks: decks.map(d => ({
        id: d.id,
        name: d.name,
        color: d.settings?.color || '#6366F1',
        createdAt: d.created_at,
        isDeleted: d.is_deleted,
        cards: cards
          .filter(c => c.deck_id === d.id)
          .map(c => ({
            id: c.id,
            term: c.term,
            def: c.definition,
            tags: c.tags || [],
            reviewData: c.review_data,
            suspended: c.is_suspended,
            createdAt: c.created_at
          }))
      })),
      // Default values for other state props
      activeDeckId: null,
      searchQuery: "",
      activeView: "library",
      showTrash: false,
      theme: "dark",
      trash: [],
      history: []
    };

    return NextResponse.json({
      state,
      settings: userData?.settings || {},
      daily_progress: userData?.daily_progress || {},
      updated_at: new Date().toISOString(), // Dynamic now
    });

  } catch (err: any) {
    console.error("[SYNC GET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/sync — Save user's state to cloud
 * Accepts a "Sync Payload" with changes.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { changes, settings, daily_progress } = body; 
    
    // Batch processing arrays
    const deckUpserts: any[] = [];
    const cardUpserts: any[] = [];
    const deckDeletes: string[] = [];
    const cardDeletes: string[] = [];
    const reviewLogInserts: any[] = [];

    if (changes && Array.isArray(changes)) {
        for (const change of changes) {
            const { type, data, id } = change;

            if (type === 'DECK_CREATE' || type === 'DECK_UPDATE') {
                deckUpserts.push({
                    id: data.id,
                    user_id: user.id,
                    name: data.name,
                    settings: { color: data.color },
                    is_deleted: data.isDeleted || false,
                    updated_at: new Date().toISOString()
                });
            } else if (type === 'CARD_CREATE' || type === 'CARD_UPDATE') {
                // Ensure deck_id is present for new cards
                if (!data.deckId && type === 'CARD_CREATE') {
                    console.warn(`Skipping CARD_CREATE ${data.id}: Missing deckId`);
                    continue;
                }

                cardUpserts.push({
                    id: data.id,
                    deck_id: data.deckId, // Required
                    user_id: user.id,
                    term: data.term,
                    definition: data.def, // Map 'def' to 'definition'
                    tags: data.tags || [],
                    review_data: data.reviewData,
                    is_suspended: data.suspended || false,
                    is_deleted: false,
                    updated_at: new Date().toISOString(),
                    // Only set created_at on creation if provided, else DB default
                    ...(type === 'CARD_CREATE' && data.createdAt ? { created_at: data.createdAt } : {})
                });
            } else if (type === 'DECK_DELETE') {
                if (id) deckDeletes.push(id);
            } else if (type === 'CARD_DELETE') {
                if (id) cardDeletes.push(id);
            } else if (type === 'REVIEW_LOG') {
                reviewLogInserts.push({
                    id: data.id,
                    card_id: data.cardId,
                    user_id: user.id,
                    deck_id: data.deckId,
                    grade: data.grade,
                    elapsed_time: data.elapsedTime,
                    review_state: data.reviewState,
                    created_at: data.createdAt
                });
            }
        }
    }

    // Execute Batched Operations in Parallel
    const promises = [];

    if (deckUpserts.length > 0) {
        promises.push(supabase.from('decks').upsert(deckUpserts));
    }
    if (cardUpserts.length > 0) {
        promises.push(supabase.from('cards').upsert(cardUpserts));
    }
    if (deckDeletes.length > 0) {
        promises.push(supabase.from('decks').update({ is_deleted: true, updated_at: new Date().toISOString() }).in('id', deckDeletes));
    }
    if (cardDeletes.length > 0) {
        promises.push(supabase.from('cards').update({ is_deleted: true, updated_at: new Date().toISOString() }).in('id', cardDeletes));
    }
    if (reviewLogInserts.length > 0) {
        promises.push(supabase.from('review_logs').insert(reviewLogInserts));
    }

    // Update Legacy Settings/Daily Progress (keep in user_data)
    if (settings || daily_progress) {
        const updateData: any = { user_id: user.id, updated_at: new Date().toISOString() };
        if (settings) updateData.settings = settings;
        if (daily_progress) updateData.daily_progress = daily_progress;
        promises.push(supabase.from('user_data').upsert(updateData));
    }

    // Wait for all operations to complete
    const results = await Promise.all(promises);

    // Check for errors
    const errors = results.filter(r => r.error).map(r => r.error?.message);
    if (errors.length > 0) {
        console.error("Sync Batch Errors:", errors);
        return NextResponse.json({ error: "Partial sync failure", details: errors }, { status: 500 });
    }

    return NextResponse.json({ success: true, processed: changes?.length || 0 });

  } catch (err: any) {
    console.error("[SYNC POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
