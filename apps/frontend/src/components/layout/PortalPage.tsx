import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Standard vertical rhythm for authenticated portal pages (admin + account).
 * Prefer this over ad-hoc `space-y-8` / `space-y-10` so section gaps stay consistent.
 */
export function PortalPage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-7 sm:gap-9", className)}>{children}</div>;
}

/** Use inside {@link PageHeader} `actions` (or anywhere) for predictable primary/secondary button wrapping. */
export function PageActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}
