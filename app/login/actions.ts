"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

// Validation schemas
const emailSchema = z.string().email("Invalid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});
const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

function normalizeAuthError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error || "");
  const normalized = raw.toLowerCase();

  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("fetch failed") ||
    normalized.includes("networkerror")
  ) {
    return "Authentication service is temporarily unreachable. Please try again in a moment.";
  }

  if (normalized.includes("dns_probe_finished_nxdomain") || normalized.includes("enotfound")) {
    return "Authentication service is temporarily unavailable due to DNS issues. Please try again shortly.";
  }

  if (normalized.includes("supabase environment variables are not configured")) {
    return "Authentication is not configured correctly on the server.";
  }

  if (raw.length > 140) {
    return "Authentication failed. Please try again.";
  }

  return raw || "Authentication failed. Please try again.";
}

// Helper to get client identifier for rate limiting
async function getClientId(): Promise<string> {
  const headersList = await headers();
  const forwarded = headersList.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0] : headersList.get("x-real-ip") || "unknown";
  return `auth:${ip}`;
}

export async function login(formData: FormData) {
  try {
    // Rate limiting - 5 attempts per 15 minutes
    const clientId = await getClientId();
    const rateLimitResult = await rateLimit(clientId, { limit: 5, windowSec: 15 * 60 });

    if (!rateLimitResult.allowed) {
      const retryMinutes = Math.ceil((rateLimitResult.resetAt - Date.now()) / 60000);
      return {
        error: `Haddan tashqari ko'p urinish. ${retryMinutes} daqiqadan keyin qaytadan urinib ko'ring.`,
      };
    }

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    // Validate input
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      return { error: validation.error.issues[0].message };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validation.data.email,
      password: validation.data.password,
    });

    if (error) {
      return { error: normalizeAuthError(error.message) };
    }

    // Redirect based on user role
    const userId = data.user?.id;
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      const role = profile?.role || data.user?.user_metadata?.role || "student";
      if (role === "teacher" || role === "admin") {
        redirect("/teacher");
      }
    }

    redirect("/student");
  } catch (error) {
    return { error: normalizeAuthError(error) };
  }
}

export async function signup(formData: FormData) {
  try {
    // Rate limiting - 3 attempts per hour (stricter for signups)
    const clientId = await getClientId();
    const rateLimitResult = await rateLimit(`${clientId}:signup`, { limit: 3, windowSec: 60 * 60 });

    if (!rateLimitResult.allowed) {
      const retryMinutes = Math.ceil((rateLimitResult.resetAt - Date.now()) / 60000);
      return {
        error: `Too many signup attempts. Please try again in ${retryMinutes} minutes.`,
      };
    }

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const role = (formData.get("role") as string) || "student";

    // Validate role
    if (!["student", "teacher"].includes(role)) {
      return { error: "Invalid role selected." };
    }

    // Validate input
    const validation = signupSchema.safeParse({ email, password });
    if (!validation.success) {
      return { error: validation.error.issues[0].message };
    }

    // Get origin for email redirect
    const origin = (await headers()).get("origin");
    if (!origin) {
      return { error: "Unable to determine callback URL for signup." };
    }

    const callbackOrigin = origin.startsWith("http") ? origin : `https://${origin}`;
    const supabase = await createClient();

    const { error } = await supabase.auth.signUp({
      email: validation.data.email,
      password: validation.data.password,
      options: {
        emailRedirectTo: `${callbackOrigin}/auth/callback`,
        data: {
          role: role,
        },
      },
    });

    if (error) {
      return { error: normalizeAuthError(error.message) };
    }

    return { success: "Confirmation link sent! Please check your email." };
  } catch (error) {
    return { error: normalizeAuthError(error) };
  }
}

export async function resetPassword(formData: FormData) {
  try {
    // Rate limiting - 3 attempts per hour
    const clientId = await getClientId();
    const rateLimitResult = await rateLimit(`${clientId}:reset`, { limit: 3, windowSec: 60 * 60 });

    if (!rateLimitResult.allowed) {
      const retryMinutes = Math.ceil((rateLimitResult.resetAt - Date.now()) / 60000);
      return {
        error: `Too many attempts. Please try again in ${retryMinutes} minutes.`,
      };
    }

    const email = formData.get("email") as string;

    // Validate input
    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      return { error: validation.error.issues[0].message };
    }

    const origin = (await headers()).get("origin");
    if (!origin) {
      return { error: "Unable to determine callback URL for reset password." };
    }

    const callbackOrigin = origin.startsWith("http") ? origin : `https://${origin}`;
    const supabase = await createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(validation.data, {
      redirectTo: `${callbackOrigin}/auth/callback?next=/update-password`,
    });

    if (error) {
      return { error: normalizeAuthError(error.message) };
    }

    return { success: "Password reset link sent! Check your email." };
  } catch (error) {
    return { error: normalizeAuthError(error) };
  }
}
