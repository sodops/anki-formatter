import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth callback handler
 * Exchanges the auth code for a session, then redirects based on user role
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // If explicit next path given (e.g. password reset), use it
      if (next) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      // Otherwise, redirect based on role
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        const role = profile?.role || user.user_metadata?.role || "student";
        if (role === "teacher" || role === "admin") {
          return NextResponse.redirect(`${origin}/teacher`);
        }
      }
      return NextResponse.redirect(`${origin}/student`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
