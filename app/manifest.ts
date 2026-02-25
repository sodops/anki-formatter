import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AnkiFlow",
    short_name: "AnkiFlow",
    description: "Smart flashcard study platform with spaced repetition",
    start_url: "/",
    display: "standalone",
    background_color: "#0f0f23",
    theme_color: "#7C5CFC",
    orientation: "any",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
