import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/AuthProvider";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#6366F1",
};

export const metadata: Metadata = {
  title: "AnkiFlow",
  description: "Smart flashcard study platform with spaced repetition",
  openGraph: {
    title: "AnkiFlow",
    description: "Smart flashcard study platform with spaced repetition",
  },
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E⚡%3C/text%3E%3C/svg%3E",
  },
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
        <script src="/js/theme.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js"></script>
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
