import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Default max readable width for portal forms (admin + account). */
export function PortalFormWidth({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("w-full max-w-2xl", className)}>{children}</div>;
}
