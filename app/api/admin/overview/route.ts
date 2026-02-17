import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { isAdminUser } from "@/lib/admin";

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/overview — Comprehensive admin dashboard data
 */
export async function GET(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rl = await rateLimit(`admin-overview:${ip}`, { limit: 30, windowSec: 60 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const [
      decksRes,
      cardsRes,
      logsRes,
      vitalsRes,
      reviewLogsRes,
      todayReviewsRes,
      recentDecksRes,
      cardStatesRes,
    ] = await Promise.all([
      // Total decks
      supabase.from("decks").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_deleted", false),
      // Total cards
      supabase.from("cards").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_deleted", false),
      // System logs (recent 20)
      supabase.from("system_logs").select("*", { count: "exact" }).eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      // Web vitals count
      supabase.from("web_vitals").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      // Total review logs
      supabase.from("review_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      // Today's reviews
      supabase.from("review_logs").select("id, grade", { count: "exact" }).eq("user_id", user.id).gte("created_at", todayISO),
      // Recent decks (for quick overview)
      supabase.from("decks").select("id, name, created_at, updated_at").eq("user_id", user.id).eq("is_deleted", false).order("updated_at", { ascending: false }).limit(5),
      // Card state distribution
      supabase.from("cards").select("review_data").eq("user_id", user.id).eq("is_deleted", false),
    ]);

    // Calculate card state distribution
    const cardStates = { new: 0, learning: 0, review: 0, relearning: 0 };
    let dueCount = 0;
    const now = new Date();

    if (cardStatesRes.data) {
      for (const card of cardStatesRes.data) {
        const state = card.review_data?.state || "new";
        if (state in cardStates) {
          cardStates[state as keyof typeof cardStates]++;
        }
        // Check if due
        const dueDate = card.review_data?.due;
        if (dueDate && new Date(dueDate) <= now) {
          dueCount++;
        } else if (!dueDate && state === "new") {
          dueCount++; // New cards without a due date are available
        }
      }
    }

    // Calculate today's grade distribution
    const todayGrades = { again: 0, hard: 0, good: 0, easy: 0 };
    if (todayReviewsRes.data) {
      for (const review of todayReviewsRes.data) {
        switch (review.grade) {
          case 1: todayGrades.again++; break;
          case 2: todayGrades.hard++; break;
          case 3: todayGrades.good++; break;
          case 4: todayGrades.easy++; break;
        }
      }
    }

    const hasErrors = decksRes.error || cardsRes.error || logsRes.error || vitalsRes.error;
    if (hasErrors) {
      console.error("[ADMIN OVERVIEW]", decksRes.error || cardsRes.error || logsRes.error || vitalsRes.error);
    }

    return NextResponse.json({
      counts: {
        decks: decksRes.count || 0,
        cards: cardsRes.count || 0,
        logs: logsRes.count || 0,
        webVitals: vitalsRes.count || 0,
        totalReviews: reviewLogsRes.count || 0,
        todayReviews: todayReviewsRes.count || 0,
        dueCards: dueCount,
      },
      cardStates,
      todayGrades,
      recentDecks: recentDecksRes.data || [],
      recentLogs: logsRes.data || [],
      user: {
        id: user.id,
        email: user.email || null,
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Admin",
        avatar: user.user_metadata?.avatar_url || null,
        lastSignIn: user.last_sign_in_at || null,
        createdAt: user.created_at || null,
      },
    });
  } catch (err: unknown) {
    console.error("[ADMIN OVERVIEW]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}