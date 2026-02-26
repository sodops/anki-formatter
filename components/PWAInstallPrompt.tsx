"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if user previously dismissed
    if (localStorage.getItem("ankiflow-pwa-dismissed")) {
      setDismissed(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Listen for successful install
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("ankiflow-pwa-dismissed", "1");
  };

  // Don't show if already installed, dismissed, or no prompt available
  if (isInstalled || dismissed || !deferredPrompt) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "1rem",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        background: "var(--bg-secondary, #1a1a2e)",
        border: "1px solid var(--border, #333)",
        borderRadius: "16px",
        padding: "1rem 1.25rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        maxWidth: "min(420px, calc(100vw - 2rem))",
        width: "100%",
        animation: "pwa-slide-up 0.3s ease-out",
      }}
    >
      <style>{`
        @keyframes pwa-slide-up {
          from { opacity: 0; transform: translateX(-50%) translateY(100%); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      <div
        style={{
          width: 40, height: 40, borderRadius: 10,
          background: "linear-gradient(135deg, #7C5CFC, #a78bfa)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, fontSize: 20, color: "#fff",
        }}
      >
        <ion-icon name="download-outline"></ion-icon>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary, #fff)" }}>
          Install AnkiFlow
        </div>
        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary, #94a3b8)", marginTop: 2 }}>
          Add to your home screen for the best experience
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
        <button
          onClick={handleDismiss}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-secondary, #94a3b8)",
            cursor: "pointer",
            padding: "0.4rem",
            borderRadius: 8,
            fontSize: 20,
            display: "flex",
            alignItems: "center",
          }}
          aria-label="Dismiss install prompt"
        >
          <ion-icon name="close-outline"></ion-icon>
        </button>
        <button
          onClick={handleInstall}
          style={{
            background: "#7C5CFC",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "0.5rem 1rem",
            fontWeight: 600,
            fontSize: "0.85rem",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Install
        </button>
      </div>
    </div>
  );
}
