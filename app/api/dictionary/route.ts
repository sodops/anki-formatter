import { NextRequest, NextResponse } from "next/server";
import { logger } from '@/lib/logger';

// Free Dictionary API - no key needed
const DICT_API = "https://api.dictionaryapi.dev/api/v2/entries/en";

interface DictionaryMeaning {
  partOfSpeech: string;
  definitions: {
    definition: string;
    example?: string;
    synonyms?: string[];
    antonyms?: string[];
  }[];
  synonyms?: string[];
  antonyms?: string[];
}

interface DictionaryResponse {
  word: string;
  phonetic?: string;
  phonetics?: {
    text?: string;
    audio?: string;
  }[];
  meanings: DictionaryMeaning[];
  sourceUrls?: string[];
}

export async function GET(req: NextRequest) {
  const word = req.nextUrl.searchParams.get("word");

  if (!word || word.trim().length === 0) {
    return NextResponse.json(
      { error: "Missing 'word' query parameter" },
      { status: 400 }
    );
  }

  const trimmed = word.trim().toLowerCase();

  // Basic validation - only allow alphabetic words (English)
  if (!/^[a-z\s'-]+$/i.test(trimmed)) {
    return NextResponse.json(
      { error: "Please enter a valid English word" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`${DICT_API}/${encodeURIComponent(trimmed)}`, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: `No definitions found for "${trimmed}"` },
          { status: 404 }
        );
      }
      throw new Error(`Dictionary API returned ${response.status}`);
    }

    const data: DictionaryResponse[] = await response.json();

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: `No definitions found for "${trimmed}"` },
        { status: 404 }
      );
    }

    // Format response
    const entry = data[0];
    const result = {
      word: entry.word,
      phonetic: entry.phonetic || entry.phonetics?.find(p => p.text)?.text || "",
      audio: entry.phonetics?.find(p => p.audio && p.audio.length > 0)?.audio || "",
      meanings: entry.meanings.map((m: DictionaryMeaning) => ({
        partOfSpeech: m.partOfSpeech,
        definitions: m.definitions.slice(0, 5).map(d => ({
          definition: d.definition,
          example: d.example || "",
        })),
        synonyms: (m.synonyms || []).slice(0, 8),
        antonyms: (m.antonyms || []).slice(0, 5),
      })),
      sourceUrls: entry.sourceUrls || [],
    };

    return NextResponse.json(result);
  } catch (error: any) {
    logger.error("Dictionary API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dictionary data. Please try again." },
      { status: 500 }
    );
  }
}
