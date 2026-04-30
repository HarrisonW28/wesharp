"use client";

import Link from "next/link";

import { RouteManagerShell } from "@/components/layout/RouteManagerShell";
import { Button } from "@/components/ui/button";

/** Placeholder for a future offline shell once a service worker is registered. */
export default function OfflinePlaceholderPage() {
  return (
    <RouteManagerShell title="You're offline">
      <p className="text-sm leading-relaxed text-slate-300 md:text-muted-foreground">
        Route manifests will cache here once offline support ships. Stay on Wi‑Fi or mobile data to update stops.
      </p>
      <Button asChild variant="outline" size="lg" className="mt-6 h-12 w-full rounded-xl">
        <Link href="/admin/routes/today">Back to Today</Link>
      </Button>
    </RouteManagerShell>
  );
}
