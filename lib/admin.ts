import type { User } from "@supabase/supabase-js";

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