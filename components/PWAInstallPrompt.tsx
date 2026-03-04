"use client";

import { useEffect, useState, useRef } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [hiding, setHiding] = useState(false);
  const autoDismissRef = useRef<NodeJS.Timeout | null>(null);

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

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (deferredPrompt && !dismissed && !isInstalled) {
      autoDismissRef.current = setTimeout(() => {
        setHiding(true);
        setTimeout(() => setDismissed(true), 300);
      }, 8000);
    }
    return () => {
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    };
  }, [deferredPrompt, dismissed, isInstalled]);

  const handleInstall = async () => {
    if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    setHiding(true);
    setTimeout(() => {
      setDismissed(true);
      localStorage.setItem("ankiflow-pwa-dismissed", "1");
    }, 300);
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
        background: "var(--pwa-bg, #1a1a2e)",
        border: "1px solid var(--pwa-border, rgba(124,92,252,0.2))",
        borderRadius: "16px",
        padding: "1rem 1.25rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        boxShadow: "var(--pwa-shadow, 0 8px 32px rgba(0,0,0,0.4))",
        maxWidth: "min(420px, calc(100vw - 2rem))",
        width: "100%",
        animation: hiding ? "pwa-slide-down 0.3s ease-in forwards" : "pwa-slide-up 0.3s ease-out",
      }}
    >
      <style>{`
        @keyframes pwa-slide-up {
          from { opacity: 0; transform: translateX(-50%) translateY(100%); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes pwa-slide-down {
          from { opacity: 1; transform: translateX(-50%) translateY(0); }
          to   { opacity: 0; transform: translateX(-50%) translateY(100%); }
        }
        :root {
          --pwa-bg: #1a1a2e;
          --pwa-border: rgba(124,92,252,0.2);
          --pwa-shadow: 0 8px 32px rgba(0,0,0,0.4);
          --pwa-text: #fff;
          --pwa-text-sub: #94a3b8;
          --pwa-dismiss: #94a3b8;
        }
        [data-theme="light"] {
          --pwa-bg: #ffffff;
          --pwa-border: #e2e8f0;
          --pwa-shadow: 0 8px 32px rgba(0,0,0,0.12);
          --pwa-text: #1e293b;
          --pwa-text-sub: #64748b;
          --pwa-dismiss: #94a3b8;
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
        <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--pwa-text, #fff)" }}>
          Install AnkiFlow
        </div>
        <div style={{ fontSize: "0.8rem", color: "var(--pwa-text-sub, #94a3b8)", marginTop: 2 }}>
          Add to your home screen for the best experience
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
        <button
          onClick={handleDismiss}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--pwa-dismiss, #94a3b8)",
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
