"use client";

"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";

import Link from "next/link";

import { Bell } from "lucide-react";

import { ROUTE_MANAGER_BOTTOM_NAV, filterNav } from "@/config/navigation";

import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { Button } from "@/components/ui/button";

import { useBackendMe } from "@/hooks/use-backend-me";

export function RouteManagerShell({
  title,
  subtitle,
  stickyFooter,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Fixed above the mobile bottom nav — primary CTAs for the active screen. */
  stickyFooter?: ReactNode;
  children: ReactNode;
}) {
  const { data } = useBackendMe();
  const permissions = useMemo(() => new Set(data?.data?.permissions ?? []), [data?.data?.permissions]);
  const bottomItems = useMemo(() => filterNav(ROUTE_MANAGER_BOTTOM_NAV, permissions), [permissions]);

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-x-hidden bg-slate-950 text-slate-50 md:max-w-none md:bg-background md:text-foreground">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl md:border-border md:bg-background/85 md:text-foreground">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0 pr-2">
            <div className="text-sm font-semibold uppercase tracking-wide text-slate-400 md:text-muted-foreground">
              Route manager
            </div>
            <div className="truncate text-xl font-bold leading-tight md:text-lg">{title}</div>
            {subtitle ? <div className="mt-0.5 truncate text-base text-slate-300 md:text-sm md:text-muted-foreground">{subtitle}</div> : null}
          </div>
          <Button
            size="icon"
            variant="secondary"
            className="h-12 w-12 shrink-0 rounded-full bg-white/10 text-white hover:bg-white/15 md:h-10 md:w-10 md:bg-muted md:text-foreground"
            type="button"
            aria-label="Notifications"
          >
            <Bell className="h-6 w-6 md:h-5 md:w-5" />
          </Button>
        </div>
      </header>

      <main
        className={
          stickyFooter
            ? "flex-1 px-4 pb-[calc(env(safe-area-inset-bottom)+10.5rem)] pt-4 md:mx-auto md:max-w-5xl md:px-8 md:pb-10"
            : "flex-1 px-4 pb-[calc(env(safe-area-inset-bottom)+5rem)] pt-4 md:mx-auto md:max-w-5xl md:px-8 md:pb-10"
        }
      >
        {children}
      </main>

      {stickyFooter !== undefined ? (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+3.5rem)] left-0 right-0 z-40 md:static md:z-auto md:border-t md:border-border md:bg-muted/30 md:px-8 md:py-4">
          <div className="mx-auto max-w-md px-4 md:max-w-5xl">{stickyFooter}</div>
        </div>
      ) : null}

      <div className="border-t border-white/10 bg-slate-950/90 px-4 py-3 text-sm text-slate-400 md:hidden">
        Field mode · Large controls for on-site use.
      </div>

      <div className="md:hidden">
        <MobileBottomNav items={bottomItems} />
      </div>

      <div className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] left-1/2 hidden -translate-x-1/2 md:block">
        <Button asChild variant="outline" size="sm" className="pointer-events-auto shadow-lg">
          <Link href="/admin/dashboard">Exit route mode</Link>
        </Button>
      </div>
    </div>
  );
}
