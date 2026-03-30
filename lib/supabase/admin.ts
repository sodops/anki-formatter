/**
 * Supabase Admin Client (Service Role)
 * Bypasses RLS — use ONLY in server-side API routes
 * NEVER expose this client to the browser
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let adminClient: SupabaseClient<any, "public", any> | null = null;

export function createAdminClient(): SupabaseClient<any, "public", any> {
  if (adminClient) return adminClient;

  const { url, serviceRoleKey } = env.supabase;

  adminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
