import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { generateSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 30 requests per minute per IP
    const ip = getClientIP(request);
    const rl = await rateLimit(`generate:${ip}`, { limit: 30, windowSec: 60 });
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

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = await request.json();
    const parsed = generateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { cards, deck_name: deckName } = parsed.data;

    // Generate a simple tab-separated text file for Anki import
    // (Since genanki is Python-only, we generate a TSV that Anki can import)
    const lines = cards.map((c) => `${c.question}\t${c.answer}`);
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
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
