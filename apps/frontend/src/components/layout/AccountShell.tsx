"use client";

import { useMemo, useState, type ReactNode } from "react";

import { useUser } from "@clerk/nextjs";

import { ACCOUNT_NAV_SECTIONS, filterNavSections } from "@/config/navigation";

import { WeSharpLogo } from "@/components/brand/WeSharpLogo";
import { TenantRouteGate } from "@/components/auth/TenantRouteGate";
import { ShellPermissionBoundary } from "@/components/auth/ShellPermissionBoundary";
import { UserMenu } from "@/components/auth/UserMenu";
import { MobileDrawer } from "@/components/navigation/MobileDrawer";
import { NavSectionsProvider } from "@/components/navigation/NavSectionsContext";
import { AccountMobileDrawerProfile } from "@/components/navigation/AccountMobileDrawerProfile";
import { InAppNotificationBell } from "@/components/notifications/InAppNotificationBell";
import { SidebarNav } from "@/components/navigation/SidebarNav";
import { TopBar } from "@/components/navigation/TopBar";

import { useBackendMe } from "@/hooks/use-backend-me";

export function AccountShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data } = useBackendMe();
  const { user } = useUser();

  const permissions = useMemo(() => new Set(data?.data?.permissions ?? []), [data?.data?.permissions]);
  const navSections = useMemo(
    () => filterNavSections(ACCOUNT_NAV_SECTIONS, permissions),
    [permissions],
  );

  const accountDrawerQuickLinks = useMemo(
    () => [
      { href: "/account/bookings/new", label: "Book a collection" },
      { href: "/", label: "Visit marketing site" },
    ],
    [],
  );

  const mobileTopTitle = useMemo(() => {
    const profileName = data?.data?.user.name?.trim() || user?.fullName?.trim() || "";
    const first = profileName.split(/\s+/)[0] || "";
    return (
      <>
        <span className="sm:hidden">{first !== "" ? `Hi, ${first}` : "Your account"}</span>
        <span className="hidden sm:inline">Customer portal</span>
      </>
    );
  }, [data?.data?.user.name, user?.fullName]);

  const accountLead = useMemo(
    () => <AccountMobileDrawerProfile onNavigate={() => setDrawerOpen(false)} />,
    [],
  );

  return (
    <TenantRouteGate>
      <ShellPermissionBoundary scope="account" label="Checking your account access…">
        <NavSectionsProvider sections={navSections}>
          <div className="flex min-h-svh bg-muted/25 print:min-h-0 print:bg-white">
          <aside className="app-chrome hidden h-svh shrink-0 print:hidden md:flex md:w-60 md:flex-col md:border-r md:bg-background">
            <div className="flex shrink-0 flex-col border-b px-4 py-3">
              <WeSharpLogo className="h-8" href="/" />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              <SidebarNav sections={navSections} className="p-2 md:p-3" />
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar
              className="app-chrome print:hidden"
              title={mobileTopTitle}
              showMenu
              onMenuClick={() => setDrawerOpen(true)}
              trailing={
                <div className="flex items-center gap-2">
                  <InAppNotificationBell variant="account" />
                  <UserMenu variant="tenant" />
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
              brandSuffix="Account"
              quickLinks={accountDrawerQuickLinks}
              logoHref="/"
              leadContent={accountLead}
            />
          </div>
        </div>
        </NavSectionsProvider>
      </ShellPermissionBoundary>
    </TenantRouteGate>
  );
}
