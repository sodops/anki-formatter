import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type UserRole = "student" | "teacher" | "admin";

/**
 * Check if user is an admin via env vars (legacy) or DB role
 */
export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;

  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const adminUserIds = (process.env.ADMIN_USER_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const email = user.email?.toLowerCase();
  return (email && adminEmails.includes(email)) || adminUserIds.includes(user.id);
}

/**
 * Get user's role from the profiles table
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (error || !data) return "student";
    return (data.role as UserRole) || "student";
  } catch {
    return "student";
  }
}

/**
 * Check if user is a teacher (or admin)
 */
export async function isTeacher(user: User | null | undefined): Promise<boolean> {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  const role = await getUserRole(user.id);
  return role === "teacher" || role === "admin";
}

/**
 * Get user profile with role
 */
export async function getUserProfile(userId: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, role, total_xp, current_streak, longest_streak, last_activity_date, created_at")
      .eq("id", userId)
      .single();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Update user role
 */
export async function updateUserRole(userId: string, role: UserRole): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId);

    return !error;
  } catch {
    return false;
  }
}
