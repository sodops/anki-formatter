/**
 * Supabase Middleware Client
 * Refreshes auth tokens on every request
 * Handles role-based route protection
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Skip auth checks if Supabase is not configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }: { name: string; value: string }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: Record<string, unknown> }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          );
        },
      },
    }
  );

  // Refresh session — important for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users away from protected routes
  const isPublicPath =
    request.nextUrl.pathname === "/" ||
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/auth") ||
    request.nextUrl.pathname.startsWith("/js") ||
    request.nextUrl.pathname.startsWith("/style.css") ||
    request.nextUrl.pathname.startsWith("/about.css") ||
    request.nextUrl.pathname.startsWith("/privacy") ||
    request.nextUrl.pathname.startsWith("/terms") ||
    request.nextUrl.pathname === "/favicon.ico";

  const isApiPath = request.nextUrl.pathname.startsWith("/api");

  if (!user && !isPublicPath && !isApiPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Helper to get user role
  const getUserRoleFromDB = async () => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user!.id)
      .single();
    return profile?.role || "student";
  };

  // Redirect logged-in users away from login page → role-based dashboard
  if (user && request.nextUrl.pathname === "/login") {
    const role = await getUserRoleFromDB();
    const url = request.nextUrl.clone();
    url.pathname = (role === "teacher" || role === "admin") ? "/teacher" : "/student";
    return NextResponse.redirect(url);
  }

  // Redirect /app to role-based dashboard (the old app is now at /app/study)
  if (user && request.nextUrl.pathname === "/app") {
    const role = await getUserRoleFromDB();
    const url = request.nextUrl.clone();
    url.pathname = (role === "teacher" || role === "admin") ? "/teacher" : "/student";
    return NextResponse.redirect(url);
  }

  // Role-based route protection for teacher/admin routes
  if (user && (request.nextUrl.pathname.startsWith("/teacher") || request.nextUrl.pathname.startsWith("/admin"))) {
    const role = await getUserRoleFromDB();
    const isTeacherRoute = request.nextUrl.pathname.startsWith("/teacher");
    const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");

    // Check env-var based admin access (legacy)
    const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
    const adminUserIds = (process.env.ADMIN_USER_IDS || "").split(",").map(id => id.trim()).filter(Boolean);
    const isEnvAdmin = (user.email && adminEmails.includes(user.email.toLowerCase())) || adminUserIds.includes(user.id);

    if (isAdminRoute && role !== "admin" && !isEnvAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/student";
      return NextResponse.redirect(url);
    }

    if (isTeacherRoute && role !== "teacher" && role !== "admin" && !isEnvAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/student";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
