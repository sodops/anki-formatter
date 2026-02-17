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

// Helper to get client identifier for rate limiting
async function getClientId(): Promise<string> {
  const headersList = await headers();
  const forwarded = headersList.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0] : headersList.get("x-real-ip") || "unknown";
  return `auth:${ip}`;
}

export async function login(formData: FormData) {
  // Rate limiting - 5 attempts per 15 minutes
  const clientId = await getClientId();
  const rateLimitResult = await rateLimit(clientId, { limit: 5, windowSec: 15 * 60 });
  
  if (!rateLimitResult.allowed) {
    const retryMinutes = Math.ceil((rateLimitResult.resetAt - Date.now()) / 60000);
    return { 
      error: `Haddan tashqari ko'p urinish. ${retryMinutes} daqiqadan keyin qaytadan urinib ko'ring.` 
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
  const { error } = await supabase.auth.signInWithPassword({
    email: validation.data.email,
    password: validation.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/app");
}

export async function signup(formData: FormData) {
  // Rate limiting - 3 attempts per hour (stricter for signups)
  const clientId = await getClientId();
  const rateLimitResult = await rateLimit(`${clientId}:signup`, { limit: 3, windowSec: 60 * 60 });
  
  if (!rateLimitResult.allowed) {
    const retryMinutes = Math.ceil((rateLimitResult.resetAt - Date.now()) / 60000);
    return { 
      error: `Too many signup attempts. Please try again in ${retryMinutes} minutes.` 
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
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: validation.data.email,
    password: validation.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        role: role,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: "Confirmation link sent! Please check your email." };
}

export async function resetPassword(formData: FormData) {
  // Rate limiting - 3 attempts per hour
  const clientId = await getClientId();
  const rateLimitResult = await rateLimit(`${clientId}:reset`, { limit: 3, windowSec: 60 * 60 });
  
  if (!rateLimitResult.allowed) {
    const retryMinutes = Math.ceil((rateLimitResult.resetAt - Date.now()) / 60000);
    return { 
      error: `Too many attempts. Please try again in ${retryMinutes} minutes.` 
    };
  }

  const email = formData.get("email") as string;

  // Validate input
  const validation = emailSchema.safeParse(email);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  const origin = (await headers()).get("origin");
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(validation.data, {
    redirectTo: `${origin}/auth/callback?next=/update-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: "Password reset link sent! Check your email." };
}
