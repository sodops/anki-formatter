import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Separator list (same as Python parser)
const SEPARATORS = [
  " == ",
  "==",
  " -> ",
  "->",
  " => ",
  "=>",
  " ⇒ ",
  "⇒",
  " → ",
  "→",
  " - ",
  " – ",
  " — ",
  " : ",
  " = ",
  "=",  // Support tight equals (e.g. term=def)
  "\t",
];

function cleanLineStart(line: string): string {
  return line.replace(/^[\s]*((?:\d+\.)|[•\-–—>→⇒●*]+)[\s]*/, "").trim();
}

function findBestSplit(line: string): [string, string, string] | null {
  for (const sep of SEPARATORS) {
    if (line.includes(sep)) {
      const idx = line.indexOf(sep);
      return [sep, line.substring(0, idx), line.substring(idx + sep.length)];
    }
  }
  return null;
}

function isLikelyTitleOrGrammar(term: string, def: string): string | null {
  term = term.trim();
  def = def.trim();
  if (!term || !def) return "Empty Term/Def";
  if (term.includes("+") && term.toLowerCase().includes("verb")) return "Grammar Pattern (S+Verb)";
  if (term.split(/\s+/).length > 10) return "Term too long (>10 words)";
  if (term === term.toUpperCase() && term.split(/\s+/).length > 1) return "All Caps Header";
  return null;
}

function parseLines(lines: string[]) {
  const success: { question: string; answer: string }[] = [];
  const failures: string[] = [];

  for (const rawLine of lines) {
    const original = rawLine.trim();
    if (!original) continue;

    const cleaned = cleanLineStart(original);
    if (!cleaned) continue;

    const split = findBestSplit(cleaned);
    if (!split) {
      failures.push(`[No Separator] ${original}`);
      continue;
    }

    const [, rawTerm, rawDef] = split;
    const term = rawTerm.trim();
    const definition = rawDef.trim();

    const rejection = isLikelyTitleOrGrammar(term, definition);
    if (rejection) {
      failures.push(`[Ignored: ${rejection}] ${original}`);
      continue;
    }

    success.push({ question: term, answer: definition });
  }

  return {
    success,
    failures,
    stats: {
      total: lines.length,
      parsed: success.length,
      failed: failures.length,
    },
  };
}

async function fetchGoogleDoc(url: string): Promise<string[]> {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) throw new Error("Invalid Google Docs URL");

  const docId = match[1];
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(exportUrl, { signal: controller.signal });
    if (!res.ok) throw new Error(`Failed to download. Status: ${res.status}`);
    const text = await res.text();
    return text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";

    let lines: string[] = [];
    let filename = "deck";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const docUrl = formData.get("doc_url") as string | null;
      const rawText = formData.get("raw_text") as string | null;
      const file = formData.get("file") as File | null;

      if (docUrl) {
        lines = await fetchGoogleDoc(docUrl);
        filename = "google_doc";
      } else if (rawText) {
        lines = rawText
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        filename = "pasted_text";
      } else if (file) {
        const allowed = ["txt", "csv"];
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        if (!allowed.includes(ext)) {
          return NextResponse.json(
            { error: "Invalid file type. Supported: txt, csv" },
            { status: 400 }
          );
        }
        const text = await file.text();

        if (ext === "csv") {
          // Simple CSV parse — split by comma, join with " - "
          lines = text
            .split("\n")
            .map((row) => {
              const cells = row
                .split(",")
                .map((c) => c.trim())
                .filter(Boolean);
              return cells.length > 0 ? cells.join(" - ") : "";
            })
            .filter(Boolean);
        } else {
          lines = text
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
        }

        filename = file.name.replace(/\.[^.]+$/, "");
      } else {
        return NextResponse.json({ error: "No content provided" }, { status: 400 });
      }
    } else {
      // JSON body
      const body = await request.json();
      if (body.doc_url) {
        lines = await fetchGoogleDoc(body.doc_url);
        filename = "google_doc";
      } else if (body.raw_text) {
        lines = body.raw_text
          .split("\n")
          .map((l: string) => l.trim())
          .filter(Boolean);
        filename = "pasted_text";
      } else {
        return NextResponse.json({ error: "No content provided" }, { status: 400 });
      }
    }

    const result = parseLines(lines);

    return NextResponse.json({
      success: true,
      filename,
      cards: result.success,
      failures: result.failures,
      stats: result.stats,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
