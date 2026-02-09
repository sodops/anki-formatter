import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/sync — Load user's state from cloud
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("user_data")
      .select("state, settings, daily_progress, updated_at")
      .eq("user_id", user.id)
      .single();

    if (error) {
      // No data yet — return empty state
      if (error.code === "PGRST116") {
        return NextResponse.json({
          state: null,
          settings: {},
          daily_progress: {},
          updated_at: null,
        });
      }
      throw error;
    }

    return NextResponse.json({
      state: data.state,
      settings: data.settings,
      daily_progress: data.daily_progress,
      updated_at: data.updated_at,
    });
  } catch (err: any) {
    console.error("[SYNC GET]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/sync — Save user's state to cloud
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { state, settings, daily_progress } = body;

    // Validate payload
    if (!state && !settings && !daily_progress) {
      return NextResponse.json({ error: "No data to sync" }, { status: 400 });
    }

    // Build update object — only include fields that were sent
    const updateData: Record<string, any> = { user_id: user.id };
    if (state !== undefined) updateData.state = state;
    if (settings !== undefined) updateData.settings = settings;
    if (daily_progress !== undefined) updateData.daily_progress = daily_progress;

    const { error } = await supabase
      .from("user_data")
      .upsert(updateData, { onConflict: "user_id" });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      synced_at: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[SYNC POST]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
