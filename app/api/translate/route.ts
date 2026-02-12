import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { text, target } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Determine target language (default to Uzbek if not specified)
    // We will let Google detect the source language automatically.
    // Ideally: If input is English -> Uzbek. If Uzbek -> English.
    // Simple logic: If we send 'auto', Google handles detection.
    // But we need to know WHICH direction to translate.
    
    // Quick Hack: If text contains Uzbek chars (o', g') or non-english structure, target EN.
    // Better: Translate to UZ. If result == source, translate to EN.
    
    let targetLang = target || 'uz';
    
    // Fetch translation using the public client API (Note: Use responsibly)
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    
    let res = await fetch(url);
    let data = await res.json();
    
    let translatedText = data[0][0][0];
    const detectedSource = data[2]; // e.g., 'en'

    // Smart Toggle: If user typed in Uzbek (detected 'uz'), translate to English instead
    if (detectedSource === 'uz' && targetLang === 'uz') {
        const urlEn = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=uz&tl=en&dt=t&q=${encodeURIComponent(text)}`;
        res = await fetch(urlEn);
        data = await res.json();
        translatedText = data[0][0][0];
        targetLang = 'en';
    }

    return NextResponse.json({
      original: text,
      translated: translatedText,
      sourceLang: detectedSource,
      targetLang: targetLang
    });

  } catch (err: any) {
    console.error("Translation Error:", err);
    return NextResponse.json({ error: "Failed to translate" }, { status: 500 });
  }
}
