"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

/**
 * /app — Role-based redirector
 * Teachers → /teacher
 * Students → /student
 * The flashcard study tool is now at /app/study
 */
export default function AppRedirector() {
  const { user, loading, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (role === "teacher" || role === "admin") {
      router.replace("/teacher");
    } else {
      router.replace("/student");
    }
  }, [loading, user, role, router]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--bg-primary, #0f0f14)',
      color: 'var(--text-secondary, #9ca3af)',
      gap: '12px',
    }}>
      <div style={{
        width: '24px',
        height: '24px',
        border: '3px solid var(--border, #2a2a3a)',
        borderTopColor: '#6366F1',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <span>Loading dashboard...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
