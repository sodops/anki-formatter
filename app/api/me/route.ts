export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ user: null, role: "student" });
    }

    // Fetch role from profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, display_name, avatar_url, total_xp, current_streak")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("[/api/me] Profile fetch error:", profileError.message);
    }

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
    console.error("[/api/me] Error:", err);
    return NextResponse.json({ user: null, role: "student" }, { status: 500 });
  }
}
