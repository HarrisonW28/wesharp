import type { MetadataRoute } from "next";

/** PWA baseline for technician route mode — icons can be added under `public/icons/` later. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WeSharp Route Manager",
    short_name: "Routes",
    description: "WeSharp technician route manifests and stops.",
    start_url: "/admin/routes/today",
    scope: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#020617",
    orientation: "portrait-primary",
    categories: ["business", "productivity"],
  };
}
