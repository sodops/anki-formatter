import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Simple pass-through middleware
  // Auth is handled client-side by AuthProvider
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|js/|style\\.css|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
