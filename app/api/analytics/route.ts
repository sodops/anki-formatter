import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIP } from "@/lib/rate-limit";

/**
 * POST /api/analytics — Store Web Vitals metrics
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 100 requests per minute per IP
    const ip = getClientIP(request);
    const rl = rateLimit(`analytics:${ip}`, { limit: 100, windowSec: 60 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
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

    const body = await request.json();
    const { name, value, rating, delta, id, navigationType } = body;

    // Validate required fields
    if (!name || value === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await supabase.from("web_vitals").insert({
      user_id: user.id,
      metric_name: name,
      metric_value: value,
      rating,
      delta,
      metric_id: id,
      navigation_type: navigationType,
      user_agent: request.headers.get("user-agent"),
      created_at: new Date().toISOString(),
    });

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.log(`[Web Vitals] ${name}:`, {
        value: Math.round(value),
        rating,
        delta: Math.round(delta || 0),
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[ANALYTICS]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
