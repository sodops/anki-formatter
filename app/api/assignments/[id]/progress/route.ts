import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIP } from "@/lib/rate-limit";

function parseNumericField(
  raw: unknown,
  field: string,
  options: { min: number; max?: number; integer?: boolean }
): { value?: number; error?: string } {
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value)) {
    return { error: `${field} must be a valid number` };
  }
  if (options.integer && !Number.isInteger(value)) {
    return { error: `${field} must be an integer` };
  }
  if (value < options.min) {
    return { error: `${field} must be at least ${options.min}` };
  }
  if (typeof options.max === "number" && value > options.max) {
    return { error: `${field} must be at most ${options.max}` };
  }
  return { value };
}

/**
 * PATCH /api/assignments/[id]/progress — Update student progress on assignment
 * Body: { cards_studied, cards_mastered, accuracy, time_spent_seconds, total_reviews }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: assignmentId } = params;
    const ip = getClientIP(request);
    const rl = await rateLimit(`progress-patch:${ip}`, { limit: 60, windowSec: 60 });
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
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    
    // Get existing progress
    const { data: existing } = await admin
      .from("student_progress")
      .select("*")
      .eq("assignment_id", assignmentId)
      .eq("student_id", user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Progress record not found" }, { status: 404 });
    }

    const cardsTotal = Number(existing.cards_total || 0);
    const nextCardsStudied =
      body.cards_studied !== undefined ? Number(body.cards_studied) : Number(existing.cards_studied || 0);
    const nextCardsMastered =
      body.cards_mastered !== undefined ? Number(body.cards_mastered) : Number(existing.cards_mastered || 0);

    if (body.cards_studied !== undefined) {
      const parsed = parseNumericField(body.cards_studied, "cards_studied", {
        min: 0,
        max: cardsTotal,
        integer: true,
      });
      if (parsed.error) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
    }

    if (body.cards_mastered !== undefined) {
      const parsed = parseNumericField(body.cards_mastered, "cards_mastered", {
        min: 0,
        max: nextCardsStudied,
        integer: true,
      });
      if (parsed.error) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
    }

    if (nextCardsMastered > nextCardsStudied) {
      return NextResponse.json(
        { error: "cards_mastered cannot be greater than cards_studied" },
        { status: 400 }
      );
    }

    if (body.accuracy !== undefined) {
      const parsed = parseNumericField(body.accuracy, "accuracy", {
        min: 0,
        max: 100,
        integer: false,
      });
      if (parsed.error) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
    }

    if (body.total_reviews !== undefined) {
      const parsed = parseNumericField(body.total_reviews, "total_reviews", {
        min: 0,
        integer: true,
      });
      if (parsed.error) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
    }

    if (body.time_spent_seconds !== undefined) {
      const parsed = parseNumericField(body.time_spent_seconds, "time_spent_seconds", {
        min: 0,
        max: 3600,
        integer: true,
      });
      if (parsed.error) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
    }

    // Build update
    const updates: Record<string, unknown> = {
      last_studied_at: new Date().toISOString(),
    };

    if (body.cards_studied !== undefined) updates.cards_studied = body.cards_studied;
    if (body.cards_mastered !== undefined) updates.cards_mastered = body.cards_mastered;
    if (body.accuracy !== undefined) updates.accuracy = body.accuracy;
    if (body.total_reviews !== undefined) updates.total_reviews = body.total_reviews;
    if (body.time_spent_seconds !== undefined) {
      updates.time_spent_seconds = (existing.time_spent_seconds || 0) + body.time_spent_seconds;
    }

    // Update status
    if (existing.status === "pending") {
      updates.status = "in_progress";
      updates.started_at = new Date().toISOString();
    }

    // Don't auto-complete — let student manually complete via /complete endpoint

    const { data: updated, error } = await admin
      .from("student_progress")
      .update(updates)
      .eq("assignment_id", assignmentId)
      .eq("student_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ progress: updated });
  } catch (error) {
    console.error("PATCH /api/assignments/[id]/progress error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
