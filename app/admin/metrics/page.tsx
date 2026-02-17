"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirect /admin/metrics → /admin/dashboard (vitals tab)
 */
export default function MetricsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/dashboard");
  }, [router]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--bg-primary)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
        <p style={{ color: "var(--text-secondary)" }}>Redirecting to dashboard...</p>
      </div>
    </div>
  );
}
