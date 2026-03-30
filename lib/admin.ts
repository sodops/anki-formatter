import type { User } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;

  const { emails: adminEmails, userIds: adminUserIds } = env.admin;

  const email = user.email?.toLowerCase();
  return (email && adminEmails.includes(email)) || adminUserIds.includes(user.id);
}
