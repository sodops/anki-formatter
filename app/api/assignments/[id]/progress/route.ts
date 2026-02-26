import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logger } from '@/lib/logger';

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
    logger.error("PATCH /api/assignments/[id]/progress error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
