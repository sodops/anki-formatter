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
    // Expecting 'changes' to be a list of operations, OR full state for backwards compat (but we want to move away from full state).
    
    // If client sends full state, we might need a "Legacy Mode" handler or just reject it.
    // For this refactor, let's assume we update the client to send `changes`.
    // But to be safe during transition, if `state` is present, we might warn or try to diff (complex).
    
    // Let's implement the "Changes" handler.
    if (changes && Array.isArray(changes)) {
        for (const change of changes) {
            if (change.type === 'DECK_UPDATE' || change.type === 'DECK_CREATE') {
                await supabase.from('decks').upsert({
                    id: change.data.id,
                    user_id: user.id,
                    name: change.data.name,
                    settings: { color: change.data.color },
                    is_deleted: change.data.isDeleted || false,
                    updated_at: new Date()
                });
            } else if (change.type === 'CARD_UPDATE' || change.type === 'CARD_CREATE') {
                await supabase.from('cards').upsert({
                    id: change.data.id,
                    deck_id: change.data.deckId, // Client must send this
                    user_id: user.id,
                    term: change.data.term,
                    definition: change.data.def,
                    tags: change.data.tags,
                    review_data: change.data.reviewData,
                    is_suspended: change.data.suspended,
                    is_deleted: false,
                    updated_at: new Date()
                });
            } else if (change.type === 'CARD_DELETE') {
                 await supabase.from('cards').update({ is_deleted: true }).eq('id', change.id);
            } else if (change.type === 'DECK_DELETE') {
                 await supabase.from('decks').update({ is_deleted: true }).eq('id', change.id);
            }
        }
    }

    // Update Legacy Settings/Daily Progress (keep in user_data for now)
    if (settings || daily_progress) {
        const updateData: any = { user_id: user.id };
        if (settings) updateData.settings = settings;
        if (daily_progress) updateData.daily_progress = daily_progress;
        await supabase.from('user_data').upsert(updateData);
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("[SYNC POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
