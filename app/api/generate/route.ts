import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    if (!data || !data.cards || !Array.isArray(data.cards)) {
      return NextResponse.json(
        { error: "No cards data provided" },
        { status: 400 }
      );
    }

    const cards: { question: string; answer: string }[] = data.cards;
    const deckName = data.deck_name || "Smart Deck";

    // Generate a simple tab-separated text file for Anki import
    // (Since genanki is Python-only, we generate a TSV that Anki can import)
    const lines = cards.map(
      (c) => `${c.question}\t${c.answer}`
    );
    const content = lines.join("\n");

    return NextResponse.json({
      success: true,
      format: "tsv",
      content,
      deckName,
      totalCards: cards.length,
      message:
        "Generated TSV file. Import into Anki via File > Import and select Tab as separator.",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
