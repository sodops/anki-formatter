import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logger } from '@/lib/logger';

/**
 * POST /api/decks/share — Share a deck with another user
 * Body: { deck_id: string, recipient_username: string }
 * 
 * Duplicates the deck and its cards for the recipient.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rl = await rateLimit(`deck-share:${ip}`, { limit: 10, windowSec: 60 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const body = await request.json();
    const { deck_id, recipient_username } = body;

    if (!deck_id) {
      return NextResponse.json({ error: "Deck ID is required" }, { status: 400 });
    }
    if (!recipient_username?.trim()) {
      return NextResponse.json({ error: "Recipient username is required" }, { status: 400 });
    }

    // Verify sender owns the deck
    const { data: deck, error: deckError } = await admin
      .from("decks")
      .select("id, name, description, settings, user_id")
      .eq("id", deck_id)
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .single();

    if (deckError || !deck) {
      return NextResponse.json({ error: "Deck not found or you don't own it" }, { status: 404 });
    }

    // Find recipient by username
    const { data: recipient, error: recipientError } = await admin
      .from("profiles")
      .select("id, display_name, username")
      .eq("username", recipient_username.trim().toLowerCase())
      .single();

    if (recipientError || !recipient) {
      return NextResponse.json({ error: "User not found. Check the username." }, { status: 404 });
    }

    if (recipient.id === user.id) {
      return NextResponse.json({ error: "You can't share a deck with yourself" }, { status: 400 });
    }

    // Get all cards from the deck
    const { data: cards, error: cardsError } = await admin
      .from("cards")
      .select("term, definition, tags")
      .eq("deck_id", deck_id)
      .eq("is_deleted", false);

    if (cardsError) throw cardsError;

    if (!cards || cards.length === 0) {
      return NextResponse.json({ error: "This deck has no cards to share" }, { status: 400 });
    }

    // Create a copy of the deck for the recipient
    const { data: newDeck, error: newDeckError } = await admin
      .from("decks")
      .insert({
        user_id: recipient.id,
        name: `${deck.name} (shared)`,
        description: deck.description ? `${deck.description}\n\nShared by ${user.user_metadata?.full_name || user.email?.split("@")[0]}` : `Shared by ${user.user_metadata?.full_name || user.email?.split("@")[0]}`,
        settings: deck.settings,
      })
      .select("id")
      .single();

    if (newDeckError || !newDeck) throw newDeckError;

    // Copy all cards to the new deck (reset review data)
    const newCards = cards.map(card => ({
      deck_id: newDeck.id,
      user_id: recipient.id,
      term: card.term,
      definition: card.definition,
      tags: card.tags,
    }));

    const { error: insertError } = await admin
      .from("cards")
      .insert(newCards);

    if (insertError) throw insertError;

    // Send notification to recipient
    await admin.from("notifications").insert({
      user_id: recipient.id,
      type: "deck_shared",
      title: "Deck shared with you",
      message: `${user.user_metadata?.full_name || user.email?.split("@")[0]} shared "${deck.name}" (${cards.length} cards) with you!`,
      data: { deck_id: newDeck.id, from_user_id: user.id, original_deck_name: deck.name },
    });

    return NextResponse.json({
      success: true,
      message: `Deck shared with ${recipient.display_name || recipient.username}!`,
      cards_count: cards.length,
      recipient: recipient.display_name || recipient.username,
    });
  } catch (error) {
    logger.error("POST /api/decks/share error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
