import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { isAdminUser } from "@/lib/admin";

/**
 * GET /api/admin/metrics — Get aggregated Web Vitals metrics
 * Admin only endpoint
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limit: 30 requests per minute per IP
    const ip = getClientIP(request);
    const rl = rateLimit(`admin-metrics:${ip}`, { limit: 30, windowSec: 60 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "7");
    const metricName = searchParams.get("metric");

    // Get metrics summary
    let query = supabase
      .from("web_vitals")
      .select("*")
      .gte("created_at", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

    if (metricName) {
      query = query.eq("metric_name", metricName);
    }

    // Only show user's own metrics (unless you want to make this truly admin-only)
    query = query.eq("user_id", user.id);

    const { data: metrics, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("[ADMIN METRICS]", error);
      return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 });
    }

    // Calculate aggregations
    const aggregated: Record<string, any> = {};
    
    metrics?.forEach((metric) => {
      const name = metric.metric_name;
      if (!aggregated[name]) {
        aggregated[name] = {
          name,
          values: [],
          count: 0,
          good: 0,
          needsImprovement: 0,
          poor: 0,
        };
      }
      
      aggregated[name].values.push(metric.metric_value);
      aggregated[name].count++;
      
      if (metric.rating === "good") aggregated[name].good++;
      else if (metric.rating === "needs-improvement") aggregated[name].needsImprovement++;
      else if (metric.rating === "poor") aggregated[name].poor++;
    });

    // Calculate stats for each metric
    const summary = Object.values(aggregated).map((agg: any) => {
      const values = agg.values.sort((a: number, b: number) => a - b);
      const sum = values.reduce((a: number, b: number) => a + b, 0);
      
      return {
        name: agg.name,
        count: agg.count,
        avg: sum / agg.count,
        median: values[Math.floor(values.length / 2)],
        p75: values[Math.floor(values.length * 0.75)],
        p95: values[Math.floor(values.length * 0.95)],
        min: values[0],
        max: values[values.length - 1],
        rating: {
          good: agg.good,
          needsImprovement: agg.needsImprovement,
          poor: agg.poor,
        },
      };
    });

    return NextResponse.json({
      summary,
      raw: metrics?.slice(0, 100), // Latest 100 metrics
      period: `${days} days`,
    });
  } catch (err: unknown) {
    console.error("[ADMIN METRICS]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
