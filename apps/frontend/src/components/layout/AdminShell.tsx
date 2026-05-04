"use client";

import { useMemo, useState, type ReactNode } from "react";

import {
  ADMIN_NAV_SECTIONS,
  ROUTE_MANAGER_NAV_SECTIONS,
  filterNavSections,
} from "@/config/navigation";

import { Toaster } from "sonner";
import { AdminDashboardSearch } from "@/components/admin/AdminDashboardSearch";
import { WeSharpLogo } from "@/components/brand/WeSharpLogo";
import { StaffRouteGate } from "@/components/auth/StaffRouteGate";
import { ShellPermissionBoundary } from "@/components/auth/ShellPermissionBoundary";
import { UserMenu } from "@/components/auth/UserMenu";
import { MobileDrawer } from "@/components/navigation/MobileDrawer";
import { InAppNotificationBell } from "@/components/notifications/InAppNotificationBell";
import { SidebarNav } from "@/components/navigation/SidebarNav";
import { TopBar } from "@/components/navigation/TopBar";

import { useBackendMe } from "@/hooks/use-backend-me";

export function AdminShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data } = useBackendMe();

  const permissions = useMemo(() => new Set(data?.data?.permissions ?? []), [data?.data?.permissions]);

  const role = data?.data?.user.role;
  const navSections = useMemo(
    () =>
      filterNavSections(
        role === "route_manager" ? ROUTE_MANAGER_NAV_SECTIONS : ADMIN_NAV_SECTIONS,
        permissions,
      ),
    [role, permissions],
  );

  /** Mobile drawer: optional shortcuts only (sidebar already lists dashboard & work queue). */
  const drawerQuickLinks = useMemo(() => {
    if (role === "route_manager") {
      return [{ href: "/admin/routes/today", label: "Today's stops" }];
    }
    return [];
  }, [role]);

  const topBarTitle = role === "route_manager" ? "Route manager" : "Operations console";

  return (
    <StaffRouteGate>
      <Toaster richColors closeButton position="top-right" />
      <ShellPermissionBoundary scope="admin" label="Checking operations permissions…">
        <div className="flex min-h-svh bg-gradient-to-br from-muted/35 via-background to-muted/20 print:min-h-0 print:bg-white">
          <aside className="app-chrome hidden shrink-0 print:hidden md:sticky md:top-0 md:flex md:h-svh md:max-h-svh md:w-64 md:flex-col md:self-start md:border-r md:bg-background/95 md:backdrop-blur">
            <div className="flex shrink-0 flex-col border-b px-4 py-3">
              <WeSharpLogo className="h-9" href="/admin/dashboard" />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              <SidebarNav sections={navSections} className="p-2 md:p-3" />
            </div>
            <div className="sticky bottom-0 z-10 mt-auto shrink-0 border-t bg-background/95 p-4 text-xs text-muted-foreground backdrop-blur supports-[backdrop-filter]:bg-background/80">
              Internal ops · Manchester &amp; Liverpool
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar
              className="app-chrome print:hidden"
              title={topBarTitle}
              center={<AdminDashboardSearch />}
              showMenu
              onMenuClick={() => setDrawerOpen(true)}
              trailing={
                <div className="flex items-center gap-2">
                  <InAppNotificationBell variant="admin" />
                  <UserMenu variant="internal" />
                </div>
              }
            />
            <main className="flex-1 min-w-0 overflow-x-hidden px-4 py-6 sm:px-6 md:px-8 print:px-4 print:py-3">
              {children}
            </main>
          </div>

          <div className="app-chrome print:hidden">
            <MobileDrawer
              open={drawerOpen}
              onOpenChange={setDrawerOpen}
              sections={navSections}
              quickLinks={drawerQuickLinks.length > 0 ? drawerQuickLinks : undefined}
              logoHref="/admin/dashboard"
            />
          </div>
        </div>
      </ShellPermissionBoundary>
    </StaffRouteGate>
  );
}
