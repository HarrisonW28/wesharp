"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { ArrowRight, MapPin, Menu } from "lucide-react";

import { WeSharpLogo } from "@/components/brand/WeSharpLogo";
import { PublicSiteAccountControl } from "@/components/layout/PublicSiteAccountControl";
import { PublicSiteNavSectionCards, PublicSiteNavSectionsCards } from "@/components/layout/PublicSiteNavCards";
import { PublicSiteNavMenu } from "@/components/layout/PublicSiteNavMenu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { PublicSiteNavSection } from "@/config/public-site-nav";
import { publicSiteNavTriggerId } from "@/config/public-site-nav";
import { PUBLIC_SITE_CONTENT_CONTAINER_CLASS, PUBLIC_SITE_NAV_DROPDOWN_WIDTH_CLASS } from "@/lib/public-site-layout";
import { cn } from "@/lib/utils";

function hidePublicMobileStickyCta(pathname: string): boolean {
  return (
    pathname.startsWith("/book") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/auth/")
  );
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const hideStickyBar = hidePublicMobileStickyCta(pathname);
  const [open, setOpen] = useState(false);
  const [megaSection, setMegaSection] = useState<PublicSiteNavSection | null>(null);
  /** Mobile sticky CTA: on `/` wait until #hero scrolls out; other paths show immediately. */
  const [showMobileSticky, setShowMobileSticky] = useState(pathname !== "/");

  useEffect(() => {
    if (hideStickyBar) {
      setShowMobileSticky(false);
      return;
    }
    if (pathname !== "/") {
      setShowMobileSticky(true);
      return;
    }
    setShowMobileSticky(false);
    const hero = document.getElementById("hero");
    if (!hero) {
      setShowMobileSticky(true);
      return;
    }
    const obs = new IntersectionObserver(([entry]) => setShowMobileSticky(!entry.isIntersecting), {
      root: null,
      threshold: 0,
    });
    obs.observe(hero);
    return () => obs.disconnect();
  }, [hideStickyBar, pathname]);

  useEffect(() => {
    if (!megaSection) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMegaSection(null);
    };
    const onPointerDown = (e: PointerEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (el.closest("#public-site-mega-panel") || el.closest("[data-public-mega-triggers]")) return;
      setMegaSection(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [megaSection]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (!mq.matches) setMegaSection(null);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
        <div className={cn(PUBLIC_SITE_CONTENT_CONTAINER_CLASS, "relative")}>
          <div className="flex h-14 flex-nowrap items-center justify-between gap-2 md:h-16 md:gap-3">
            <div className="flex shrink-0 items-center gap-3">
              <Link
                href="/"
                className="group inline-flex shrink-0 items-center rounded-md text-foreground no-underline opacity-90 outline-none ring-offset-background transition-opacity duration-200 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="WeSharp home"
              >
                <WeSharpLogo className="h-8 w-auto sm:h-9 lg:h-10" />
              </Link>
              <span className="hidden h-7 w-px bg-border/70 lg:block" aria-hidden />
            </div>

            <nav
              aria-label="Primary"
              className="hidden items-center justify-center lg:absolute lg:left-1/2 lg:flex lg:-translate-x-1/2"
            >
              <PublicSiteNavMenu
                openSection={megaSection}
                onOpenSection={setMegaSection}
                onClose={() => setMegaSection(null)}
              />
            </nav>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Button size="sm" className="hidden rounded-lg md:inline-flex" asChild>
              <Link href="/book">
                Book
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
            <PublicSiteAccountControl variant="desktop" />
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button size="icon" variant="outline" type="button" className="lg:hidden" aria-label="Open menu">
                  <Menu className="h-5 w-5" aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="flex h-full max-h-[100dvh] w-[min(100vw-1rem,24rem)] flex-col gap-0 overflow-hidden p-0"
              >
                <SheetHeader className="flex shrink-0 flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-b py-4 pl-6 pr-14 text-left sm:pr-16">
                  <SheetTitle className="mb-0 shrink-0">Navigate</SheetTitle>
                  <div className="min-w-0 shrink justify-end">
                    <PublicSiteAccountControl variant="sheet-header" onNavigate={() => setOpen(false)} />
                  </div>
                </SheetHeader>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
                  <div className="flex flex-col gap-8 text-base">
                    <nav aria-label="Site pages">
                      <PublicSiteNavSectionsCards layout="sheet" onNavigate={() => setOpen(false)} />
                    </nav>
                    <Button asChild className="h-11 min-h-11 w-full shrink-0 touch-manipulation rounded-lg">
                      <Link href="/book" onClick={() => setOpen(false)}>
                        Book a collection <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                      </Link>
                    </Button>
                  </div>
                </div>
                <div className="flex shrink-0 items-center justify-between border-t px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  <span className="text-sm text-muted-foreground">Theme</span>
                  <ThemeToggle />
                </div>
              </SheetContent>
            </Sheet>

            <span className="hidden shrink-0 lg:inline-flex lg:items-center">
              <ThemeToggle />
            </span>
          </div>
          </div>

          {megaSection ? (
            <div
              id="public-site-mega-panel"
              role="region"
              aria-labelledby={publicSiteNavTriggerId(megaSection.label)}
              aria-label={megaSection.label}
              className={cn(
                PUBLIC_SITE_NAV_DROPDOWN_WIDTH_CLASS,
                "pointer-events-auto absolute left-1/2 top-full z-50 hidden -translate-x-1/2 pt-2 lg:block",
              )}
            >
              <div className="pointer-events-auto max-h-[min(85vh,40rem)] overflow-x-auto overflow-y-auto overscroll-contain rounded-xl border bg-popover p-4 text-popover-foreground shadow-lg sm:p-5">
                <PublicSiteNavSectionCards
                  section={megaSection}
                  layout="menu"
                  onNavigate={() => setMegaSection(null)}
                />
              </div>
            </div>
          ) : null}
        </div>
      </header>
      <div
        className={cn(
          "min-w-0 flex-1 overflow-x-hidden",
          !hideStickyBar && showMobileSticky && "pb-[4.75rem] md:pb-0",
        )}
      >
        {children}
      </div>
      {!hideStickyBar && showMobileSticky ? (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-background/95 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] backdrop-blur-md supports-[backdrop-filter]:bg-background/80 md:hidden">
          <div
            className={cn(PUBLIC_SITE_CONTENT_CONTAINER_CLASS, "grid grid-cols-2 gap-2 pt-3")}
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <Button className="h-11 min-h-11 min-w-0 touch-manipulation rounded-lg" asChild>
              <Link href="/book">
                Book a collection
                <ArrowRight className="ml-1.5 h-4 w-4 shrink-0" aria-hidden />
              </Link>
            </Button>
            <Button variant="outline" className="h-11 min-h-11 min-w-0 touch-manipulation rounded-lg" asChild>
              <Link href="/service-areas">
                <MapPin className="mr-1.5 h-4 w-4 shrink-0" aria-hidden />
                Coverage
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
      <footer className="border-t py-10 text-center text-xs text-muted-foreground">
        <div className={cn(PUBLIC_SITE_CONTENT_CONTAINER_CLASS, "flex flex-col flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:flex-row")}>
          <span>© {new Date().getFullYear()} WeSharp</span>
          <Link href="/how-it-works" className="hover:text-foreground">
            How it works
          </Link>
          <Link href="/pricing" className="hover:text-foreground">
            Pricing
          </Link>
          <Link href="/subscriptions" className="hover:text-foreground">
            Subscriptions
          </Link>
          <Link href="/service-areas" className="hover:text-foreground">
            Coverage
          </Link>
          <Link href="/contact" className="hover:text-foreground">
            Contact
          </Link>
          <span className="text-muted-foreground/80">Greater Manchester &amp; Liverpool</span>
        </div>
      </footer>
    </div>
  );
}
