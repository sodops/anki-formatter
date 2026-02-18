export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error("[/api/me] Auth error:", authError.message);
    }

    if (!user) {
      console.log("[/api/me] No authenticated user found");
      return NextResponse.json({ user: null, role: "student" });
    }

    console.log("[/api/me] User found:", user.id, user.email);

    // Try admin client first (bypasses RLS), fall back to anon client
    let profile = null;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (url && serviceKey) {
      try {
        const admin = createSupabaseClient(url, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data, error } = await admin
          .from("profiles")
          .select("role, display_name, avatar_url, total_xp, current_streak")
          .eq("id", user.id)
          .single();
        
        if (error) {
          console.error("[/api/me] Admin profile query error:", error.message);
        } else {
          profile = data;
        }
      } catch (err) {
        console.error("[/api/me] Admin client failed:", err);
      }
    } else {
      console.warn("[/api/me] SUPABASE_SERVICE_ROLE_KEY not set, trying anon client");
      // Fallback: try with the anon key (may fail with RLS)
      const { data, error } = await supabase
        .from("profiles")
        .select("role, display_name, avatar_url, total_xp, current_streak")
        .eq("id", user.id)
        .single();
      
      if (error) {
        console.error("[/api/me] Anon profile query error:", error.message);
      } else {
        profile = data;
      }
    }

    console.log("[/api/me] Profile result:", { role: profile?.role, name: profile?.display_name });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
      },
      role: profile?.role || "student",
      profile: profile || null,
    });
  } catch (err) {
    console.error("[/api/me] Unexpected error:", err);
    return NextResponse.json({ user: null, role: "student" }, { status: 500 });
  }
}
