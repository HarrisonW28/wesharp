"use client";

import { useMemo, useState, type ReactNode } from "react";

import { ACCOUNT_NAV, type NavItem } from "@/config/navigation";

import { WeSharpLogo } from "@/components/brand/WeSharpLogo";
import { TenantRouteGate } from "@/components/auth/TenantRouteGate";
import { ShellPermissionBoundary } from "@/components/auth/ShellPermissionBoundary";
import { UserMenu } from "@/components/auth/UserMenu";
import { MobileDrawer } from "@/components/navigation/MobileDrawer";
import { SidebarNav } from "@/components/navigation/SidebarNav";
import { TopBar } from "@/components/navigation/TopBar";

import { useBackendMe } from "@/hooks/use-backend-me";

function filterNav(items: NavItem[], permissions: Set<string>): NavItem[] {
  return items.filter((item) => !item.permission || permissions.has(item.permission));
}

export function AccountShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data } = useBackendMe();

  const permissions = useMemo(() => new Set(data?.data?.permissions ?? []), [data?.data?.permissions]);
  const navItems = filterNav(ACCOUNT_NAV, permissions);

  return (
    <TenantRouteGate>
      <ShellPermissionBoundary scope="account" label="Checking your account access…">
        <div className="flex min-h-screen bg-muted/25 print:min-h-0 print:bg-white">
          <aside className="app-chrome hidden print:hidden md:flex md:w-60 md:flex-col md:border-r md:bg-background">
            <div className="flex h-14 items-center border-b px-4">
              <WeSharpLogo className="h-10" />
            </div>
            <SidebarNav items={navItems} />
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
            <MobileDrawer open={drawerOpen} onOpenChange={setDrawerOpen} items={navItems} />
          </div>
        </div>
      </ShellPermissionBoundary>
    </TenantRouteGate>
  );
}
