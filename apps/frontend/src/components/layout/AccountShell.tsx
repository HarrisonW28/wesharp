"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { ACCOUNT_NAV_SECTIONS, filterNavSections } from "@/config/navigation";

import { WeSharpLogo } from "@/components/brand/WeSharpLogo";
import { TenantRouteGate } from "@/components/auth/TenantRouteGate";
import { ShellPermissionBoundary } from "@/components/auth/ShellPermissionBoundary";
import { UserMenu } from "@/components/auth/UserMenu";
import { MobileDrawer } from "@/components/navigation/MobileDrawer";
import { SidebarNav } from "@/components/navigation/SidebarNav";
import { TopBar } from "@/components/navigation/TopBar";

import { useBackendMe } from "@/hooks/use-backend-me";

export function AccountShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data } = useBackendMe();

  const permissions = useMemo(() => new Set(data?.data?.permissions ?? []), [data?.data?.permissions]);
  const navSections = useMemo(
    () => filterNavSections(ACCOUNT_NAV_SECTIONS, permissions),
    [permissions],
  );

  return (
    <TenantRouteGate>
      <ShellPermissionBoundary scope="account" label="Checking your account access…">
        <div className="flex min-h-screen bg-muted/25 print:min-h-0 print:bg-white">
          <aside className="app-chrome hidden h-svh shrink-0 print:hidden md:flex md:w-60 md:flex-col md:border-r md:bg-background">
            <div className="flex shrink-0 flex-col gap-1 border-b px-4 py-3">
              <WeSharpLogo className="h-8" href="/" />
              <Link
                href="/"
                className="w-fit text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Back to home
              </Link>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              <SidebarNav sections={navSections} className="p-2 md:p-3" />
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar
              className="app-chrome print:hidden"
              title="Your account"
              showMenu
              onMenuClick={() => setDrawerOpen(true)}
              trailing={<UserMenu variant="tenant" />}
            />
            <main className="flex-1 space-y-8 px-4 py-6 print:px-4 print:py-3 md:px-8">{children}</main>
          </div>

          <div className="app-chrome print:hidden">
            <MobileDrawer
              open={drawerOpen}
              onOpenChange={setDrawerOpen}
              sections={navSections}
              logoHref="/"
              quickLinks={[
                { href: "/", label: "Back to home" },
                { href: "/account/dashboard", label: "Account home" },
              ]}
            />
          </div>
        </div>
      </ShellPermissionBoundary>
    </TenantRouteGate>
  );
}
