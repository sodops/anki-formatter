import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AnkiFlow",
    short_name: "AnkiFlow",
    description: "Smart flashcard study platform with spaced repetition",
    start_url: "/",
    display: "standalone",
    background_color: "#0f0f23",
    theme_color: "#e8a317",
    orientation: "any",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E⚡%3C/text%3E%3C/svg%3E",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
