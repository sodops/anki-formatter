"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.push("/admin/dashboard");
  }, [router]);
  
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚡</div>
        <p>Redirecting to new admin panel...</p>
      </div>
    </div>
  );
}
