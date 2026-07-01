import type { MetadataRoute } from "next";

/** PWA baseline — route manager first; customer portal install path planned in Sprint 21. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WeSharp",
    short_name: "WeSharp",
    description: "Knife sharpening for hospitality — book, track, and manage collections.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    orientation: "any",
    categories: ["business", "productivity"],
  };
}
