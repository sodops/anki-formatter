"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { AppSkeleton } from "@/components/app/AppSkeleton";
import { reportWebVitals } from "@/lib/web-vitals";
import StudyAppContainer from "./_components/StudyAppContainer";
import StudyModals from "./_components/StudyModals";

type AnkiFlowAuthPayload = {
  user: {
    id: string;
    email: string | undefined;
    name: string;
    avatar: string | null;
  } | null;
  accessToken: string | null;
  role: string;
};

type AnkiFlowWindow = Window & {
  __ankiflow_auth?: AnkiFlowAuthPayload;
  initAnkiFlow?: () => void;
};

export default function Home() {
  const { user, session, loading, role } = useAuth();
  const router = useRouter();

  // Report Web Vitals on mount
  useEffect(() => {
    reportWebVitals();
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (loading) return;
    if (!user) return; // Don't initialize app if not logged in

    const appWindow = window as AnkiFlowWindow;

    // Hide skeleton, show app after JS modules load
    const skeleton = document.getElementById("appSkeleton");
    const container = document.getElementById("appContainer");
    if (skeleton) skeleton.style.display = "none";
    if (container) {
      container.style.visibility = "visible";
      container.style.position = "static";
      container.removeAttribute("aria-hidden");
    }

    // Expose auth info to vanilla JS modules via window
    appWindow.__ankiflow_auth = {
      user: user
        ? {
            id: user.id,
            email: user.email,
            name:
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split("@")[0] ||
              "User",
            avatar: user.user_metadata?.avatar_url || null,
          }
        : null,
      accessToken: session?.access_token || null,
      role: role || "student",
    };

    // Fire auth event so store.js can pick it up
    window.dispatchEvent(
      new CustomEvent("ankiflow:auth-ready", {
        detail: appWindow.__ankiflow_auth,
      })
    );

    // Load Ionicons dynamically (avoids hydration mismatch from class="hydrated")
    const ionModule = document.createElement("script");
    ionModule.type = "module";
    ionModule.src = "https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js";
    document.head.appendChild(ionModule);

    const ionFallback = document.createElement("script");
    ionFallback.setAttribute("nomodule", "");
    ionFallback.src = "https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js";
    document.head.appendChild(ionFallback);

    // Load main.js as ES6 module via DOM injection
    // (Next.js strips <script> tags from JSX, so we do it programmatically)
    // Prevent duplicate loading in React Strict Mode (dev mode runs useEffect twice)
    const scriptSrc = "/js/main.js";
    if (!document.querySelector(`script[src="${scriptSrc}"]`)) {
      const script = document.createElement("script");
      script.type = "module";
      script.src = scriptSrc;
      document.body.appendChild(script);
    } else {
      // Script already exists (SPA navigation), manually re-init
      if (appWindow.initAnkiFlow) {
        appWindow.initAnkiFlow();
      }
    }
  }, [user, session, loading]);

  // Register Service Worker for offline support
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration);
          // Listen for updates — only show banner for genuinely new versions
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "activated" && navigator.serviceWorker.controller) {
                  // Only show if there was a previous SW (actual update, not first install)
                  const dismissedVersion = sessionStorage.getItem("sw-update-dismissed");
                  if (dismissedVersion === "shown") return;
                  sessionStorage.setItem("sw-update-dismissed", "shown");
                  const toast = document.createElement("div");
                  toast.className = "sw-update-toast";
                  toast.innerHTML =
                    '<ion-icon name="cloud-download-outline"></ion-icon> New version available <button onclick="location.reload()">Update</button>';
                  document.body.appendChild(toast);
                  setTimeout(() => toast.classList.add("visible"), 100);
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    }
  }, []);

  if (loading || !user) {
    return (
      <main id="app-main">
        <div className="app-background"></div>
        <AppSkeleton />
      </main>
    );
  }

  return (
    <main id="app-main">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <noscript>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            fontSize: "18px",
            color: "#888",
            textAlign: "center",
            padding: "20px",
          }}
        >
          AnkiFlow requires JavaScript to run. Please enable JavaScript in your browser.
        </div>
      </noscript>
      <StudyAppContainer role={role} />
      <StudyModals />
    </main>
  );
}
