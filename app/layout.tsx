import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Analytics } from "@vercel/analytics/react";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#7C5CFC",
};

export const metadata: Metadata = {
  title: {
    default: "AnkiFlow — Scientific Learning Platform",
    template: "%s | AnkiFlow"
  },
  description: "Create, import, and efficiently learn flashcards with SM-2 spaced repetition algorithm. Strengthen your memory scientifically. Free cloud sync, offline mode, Anki export.",
  keywords: ["flashcard", "spaced repetition", "anki", "learning", "memorization", "study", "SM-2", "cloud sync", "free"],
  authors: [{ name: "AnkiFlow Team" }],
  creator: "AnkiFlow",
  publisher: "AnkiFlow",
  metadataBase: new URL("https://anki.sodops.uz"),
  openGraph: {
    title: "AnkiFlow — Scientific Learning Platform",
    description: "Create, import, and efficiently learn flashcards with SM-2 spaced repetition algorithm. Free cloud sync and offline mode.",
    url: "https://anki.sodops.uz",
    siteName: "AnkiFlow",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "AnkiFlow — Smart flashcard study platform with spaced repetition",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AnkiFlow — Scientific Learning Platform",
    description: "Create, import, and efficiently learn flashcards with SM-2 spaced repetition algorithm",
    images: ["/og.png"],
    creator: "@ankiflow",
  },
  alternates: {
    canonical: "https://anki.sodops.uz",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to external origins for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        {/* Single entry CSS — style.css @imports all others */}
        <link rel="stylesheet" href="/style.css" />
        {/* Inline theme detection — must run before paint to prevent FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Migration: clear old auto-saved values from previous code
                if (localStorage.getItem("ankiflow-theme") && !localStorage.getItem("ankiflow-theme-explicit")) {
                  localStorage.removeItem("ankiflow-theme");
                }
                // Detect theme
                var theme = "dark";
                if (localStorage.getItem("ankiflow-theme-explicit") === "true") {
                  var saved = localStorage.getItem("ankiflow-theme");
                  if (saved === "light" || saved === "dark") theme = saved;
                } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
                  theme = "light";
                }
                document.documentElement.setAttribute("data-theme", theme);
              })();
            `,
          }}
        />
        <script src="/js/theme.js"></script>
        <script
          src="https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js"
          integrity="sha384-zbcZAIxlvJtNE3Dp5nxLXdXtXyxwOdnILY1TDPVmKFhl4r4nSUG1r8bcFXGVa4Te"
          crossOrigin="anonymous"
        ></script>
        <script
          src="https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js"
          integrity="sha384-nFoSjZIoH3CCp8W639jJyQkuPHinJ2NHe7on1xvlUA7SuGfJAfvMldrsoAVm6ECz"
          crossOrigin="anonymous"
        ></script>
        <script type="module" src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js"></script>
        {/* Global error monitoring */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var errorLog = [];
                var MAX_ERRORS = 50;
                window.addEventListener('error', function(e) {
                  if (errorLog.length >= MAX_ERRORS) return;
                  var entry = { type: 'error', msg: e.message, src: e.filename, line: e.lineno, col: e.colno, ts: Date.now() };
                  errorLog.push(entry);
                  if (navigator.sendBeacon) {
                    navigator.sendBeacon('/api/logs', JSON.stringify({ level: 'error', message: e.message, source: e.filename, line: e.lineno, context: 'client' }));
                  }
                });
                window.addEventListener('unhandledrejection', function(e) {
                  if (errorLog.length >= MAX_ERRORS) return;
                  var msg = e.reason ? (e.reason.message || String(e.reason)) : 'Unknown rejection';
                  errorLog.push({ type: 'rejection', msg: msg, ts: Date.now() });
                  if (navigator.sendBeacon) {
                    navigator.sendBeacon('/api/logs', JSON.stringify({ level: 'error', message: 'Unhandled rejection: ' + msg, context: 'client' }));
                  }
                });
                window.__ankiflow_errors = errorLog;
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <ErrorBoundary>
          <AuthProvider>{children}</AuthProvider>
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  );
}
