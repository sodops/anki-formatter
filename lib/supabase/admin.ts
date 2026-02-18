/**
 * Supabase Admin Client (Service Role)
 * Bypasses RLS — use ONLY in server-side API routes
 * NEVER expose this client to the browser
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient<any, "public", any> | null = null;

export function createAdminClient(): SupabaseClient<any, "public", any> {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error("[admin] Missing SUPABASE_SERVICE_ROLE_KEY — admin queries will fail");
    // Return a client with anon key as fallback (will be subject to RLS)
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      throw new Error("Missing Supabase environment variables entirely");
    }
    adminClient = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    return adminClient;
  }

  adminClient = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
