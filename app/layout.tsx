import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Analytics } from "@vercel/analytics/react";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#6366F1",
};

export const metadata: Metadata = {
  title: {
    default: "AnkiFlow — Ilmiy O'rganish Platformasi",
    template: "%s | AnkiFlow"
  },
  description: "Flashcard yaratish, import qilish va SM-2 spaced repetition algoritmi bilan samarali o'rganish. Xotirangizni ilmiy usulda kuchaytiring. Bepul cloud sync, offline rejim, Anki export.",
  keywords: ["flashcard", "spaced repetition", "anki", "o'rganish", "memorization", "uzbek", "SM-2", "cloud sync", "bepul"],
  authors: [{ name: "AnkiFlow Team" }],
  creator: "AnkiFlow",
  publisher: "AnkiFlow",
  metadataBase: new URL("https://anki.sodops.uz"),
  openGraph: {
    title: "AnkiFlow — Ilmiy O'rganish Platformasi",
    description: "Flashcard yaratish, import qilish va SM-2 spaced repetition algoritmi bilan samarali o'rganish. Bepul cloud sync va offline rejim.",
    url: "https://anki.sodops.uz",
    siteName: "AnkiFlow",
    type: "website",
    locale: "uz_UZ",
    images: [
      {
        url: "/og.svg",
        width: 1200,
        height: 630,
        alt: "AnkiFlow — Smart flashcard study platform with spaced repetition",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AnkiFlow — Ilmiy O'rganish Platformasi",
    description: "Flashcard yaratish, import qilish va SM-2 spaced repetition algoritmi bilan samarali o'rganish",
    images: ["/og.svg"],
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
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E⚡%3C/text%3E%3C/svg%3E",
    apple: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E⚡%3C/text%3E%3C/svg%3E",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/style.css" />
        <link rel="stylesheet" href="/about.css" />
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
