import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anki Formatter",
  description: "Convert documents to Anki flashcards",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
