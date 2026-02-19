import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIP } from "@/lib/rate-limit";

/**
 * GET /api/profile — Get current user's profile
 */
export async function GET(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rl = await rateLimit(`profile:${ip}`, { limit: 30, windowSec: 60 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: profile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      profile: {
        id: user.id,
        email: user.email,
        display_name: profile?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0],
        avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url,
        bio: profile?.bio || "",
        nickname: profile?.nickname || "",
        phone: profile?.phone || "",
        role: profile?.role || "student",
        total_xp: profile?.total_xp || 0,
        current_streak: profile?.current_streak || 0,
        longest_streak: profile?.longest_streak || 0,
        last_activity_date: profile?.last_activity_date,
        created_at: profile?.created_at || user.created_at,
      },
    });
  } catch (error) {
    console.error("GET /api/profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/profile — Update current user's profile
 * Body: { display_name?, bio?, avatar_url? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rl = await rateLimit(`profile-update:${ip}`, { limit: 10, windowSec: 60 });
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

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.display_name !== undefined) {
      const name = String(body.display_name).trim().slice(0, 100);
      if (name.length < 1) {
        return NextResponse.json({ error: "Display name is required" }, { status: 400 });
      }
      updates.display_name = name;
    }

    if (body.bio !== undefined) {
      updates.bio = String(body.bio).trim().slice(0, 500);
    }

    if (body.nickname !== undefined) {
      updates.nickname = String(body.nickname).trim().slice(0, 50);
    }

    if (body.phone !== undefined) {
      updates.phone = String(body.phone).trim().slice(0, 20);
    }

    if (body.avatar_url !== undefined) {
      const url = String(body.avatar_url).trim();
      if (url && !url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("data:image/")) {
        return NextResponse.json({ error: "Invalid avatar URL" }, { status: 400 });
      }
      updates.avatar_url = url || null;
    }

    const { data: updated, error } = await admin
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();

    if (error) throw error;

    // Also update Supabase auth metadata
    if (updates.display_name || updates.avatar_url !== undefined) {
      const metaUpdates: Record<string, unknown> = {};
      if (updates.display_name) metaUpdates.full_name = updates.display_name;
      if (updates.avatar_url !== undefined) metaUpdates.avatar_url = updates.avatar_url;
      
      await supabase.auth.updateUser({ data: metaUpdates });
    }

    return NextResponse.json({ profile: updated });
  } catch (error) {
    console.error("PATCH /api/profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
