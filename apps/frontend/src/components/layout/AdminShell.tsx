"use client";

import { useMemo, useState, type ReactNode } from "react";

import {
  ADMIN_NAV_SECTIONS,
  ROUTE_MANAGER_NAV_SECTIONS,
  filterNavSections,
} from "@/config/navigation";

import { Toaster } from "sonner";
import Link from "next/link";

import { WeSharpLogo } from "@/components/brand/WeSharpLogo";
import { StaffRouteGate } from "@/components/auth/StaffRouteGate";
import { ShellPermissionBoundary } from "@/components/auth/ShellPermissionBoundary";
import { UserMenu } from "@/components/auth/UserMenu";
import { MobileDrawer } from "@/components/navigation/MobileDrawer";
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

  return (
    <StaffRouteGate>
      <Toaster richColors closeButton position="top-right" />
      <ShellPermissionBoundary scope="admin" label="Checking operations permissions…">
        <div className="flex min-h-screen bg-gradient-to-br from-muted/35 via-background to-muted/20 print:min-h-0 print:bg-white">
          <aside className="app-chrome hidden print:hidden md:flex md:w-64 md:flex-col md:border-r md:bg-background/95 md:backdrop-blur">
            <div className="flex flex-col gap-1 border-b px-4 py-3">
              <WeSharpLogo className="h-9" href="/admin/dashboard" />
              <Link
                href="/"
                className="w-fit text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Public site
              </Link>
            </div>
            <SidebarNav sections={navSections} />
            <div className="mt-auto border-t p-4 text-xs text-muted-foreground">
              Manchester · Liverpool coverage · Internal console
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar
              className="app-chrome print:hidden"
              title="Operations console"
              showMenu
              onMenuClick={() => setDrawerOpen(true)}
              trailing={<UserMenu variant="internal" />}
            />
            <main className="flex-1 space-y-8 px-4 py-6 print:px-4 print:py-3 md:px-8">{children}</main>
          </div>

          <div className="app-chrome print:hidden">
            <MobileDrawer
              open={drawerOpen}
              onOpenChange={setDrawerOpen}
              sections={navSections}
              brandSuffix="Ops"
              logoHref="/admin/dashboard"
              quickLinks={[
            { href: "/", label: "Back to home" },
            { href: "/admin/dashboard", label: "Dashboard home" },
          ]}
            />
          </div>
        </div>
      </ShellPermissionBoundary>
    </StaffRouteGate>
  );
}
