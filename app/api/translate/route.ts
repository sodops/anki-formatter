import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { translateSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    // Rate limit: 20 requests per minute per IP
    const ip = getClientIP(request);
    const rl = await rateLimit(`translate:${ip}`, { limit: 20, windowSec: 60 });
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

    const raw = await request.json();
    const parsed = translateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { text, target } = parsed.data;

    // Determine target language (Zod defaults to 'uz' if not specified)
    // Google auto-detects source language.
    // Smart logic: if result unchanged, try opposite direction.
    let targetLang = target;

    // Fetch translation using the public client API (Note: Use responsibly)
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

    const res = await fetch(url);
    const data = await res.json();

    let translatedText = data[0][0][0];
    const detectedSource = data[2]; // e.g., 'en'

    // Smart Logic:
    // 1. If detected as Uzbek, translate to English.
    // 2. If detected as NOT Uzbek (e.g. 'en'), but the result is same as input (e.g. "olma" -> "olma"),
    //    it means Google failed to translate it as English. Try treating it as Uzbek.

    const isSame = translatedText.toLowerCase().trim() === text.toLowerCase().trim();

    if ((detectedSource === "uz" && targetLang === "uz") || (detectedSource !== "uz" && isSame)) {
      const urlEn = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=uz&tl=en&dt=t&q=${encodeURIComponent(text)}`;
      const resEn = await fetch(urlEn);
      const dataEn = await resEn.json();

      // Only accept if it actually changed something
      if (dataEn[0][0][0].toLowerCase().trim() !== text.toLowerCase().trim()) {
        translatedText = dataEn[0][0][0];
        targetLang = "en";
      }
    }

    return NextResponse.json({
      original: text,
      translated: translatedText,
      sourceLang: targetLang === "en" ? "uz" : "en", // Infer source based on target
      targetLang: targetLang,
    });
  } catch (err: unknown) {
    console.error("Translation Error:", err);
    return NextResponse.json({ error: "Failed to translate" }, { status: 500 });
  }
}
