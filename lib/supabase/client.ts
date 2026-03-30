/**
 * Supabase Browser Client
 * Used in "use client" components and vanilla JS
 */
import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

export function createClient() {
  const { url, anonKey } = env.supabase;
  return createBrowserClient(url, anonKey);
}
