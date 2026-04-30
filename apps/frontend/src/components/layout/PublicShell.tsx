"use client";

import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { useState } from "react";

import { ArrowRight, LayoutDashboard, Menu } from "lucide-react";

import { PUBLIC_SITE_NAV_LINKS } from "@/config/public-site-nav";

import { WeSharpLogo } from "@/components/brand/WeSharpLogo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function PublicShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const navLinkClass =
    "text-sm text-muted-foreground transition-colors hover:text-foreground aria-[current]:font-medium aria-[current]:text-foreground";
  /** Desktop header: keep labels on one row between logo and CTAs */
  const navLinkDesktopClass = `${navLinkClass} whitespace-nowrap`;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
        <div className="relative mx-auto flex h-14 max-w-7xl flex-nowrap items-center justify-between gap-2 px-4 md:h-16 md:gap-3 md:px-6">
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
            className="hidden items-center justify-center gap-x-5 lg:absolute lg:left-1/2 lg:flex lg:-translate-x-1/2"
          >
            {PUBLIC_SITE_NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={navLinkDesktopClass}>
                {l.label}
              </Link>
            ))}
            <Link href="/trade-accounts" className={navLinkDesktopClass}>
              Trade accounts
            </Link>
            <Link href="/safety" className={navLinkDesktopClass}>
              Safety
            </Link>
          </nav>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button size="icon" variant="outline" type="button" className="lg:hidden" aria-label="Open menu">
                  <Menu className="h-5 w-5" aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[min(100vw-2rem,20rem)]">
                <SheetHeader>
                  <SheetTitle>Navigate</SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-4 text-base" aria-label="Mobile">
                  {PUBLIC_SITE_NAV_LINKS.map((l) => (
                    <Link key={l.href} href={l.href} className={navLinkClass} onClick={() => setOpen(false)}>
                      {l.label}
                    </Link>
                  ))}
                  <Link href="/trade-accounts" className={navLinkClass} onClick={() => setOpen(false)}>
                    Trade accounts
                  </Link>
                  <Link href="/safety" className={navLinkClass} onClick={() => setOpen(false)}>
                    Safety
                  </Link>
                  <SignedOut>
                    <Link href="/login" className={navLinkClass} onClick={() => setOpen(false)}>
                      Sign in
                    </Link>
                  </SignedOut>
                  <SignedIn>
                    <Link
                      href="/auth/continue"
                      className={`${navLinkClass} inline-flex items-center gap-2`}
                      onClick={() => setOpen(false)}
                    >
                      <LayoutDashboard className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                      My account
                    </Link>
                  </SignedIn>
                  <Button asChild className="mt-2 rounded-lg">
                    <Link href="/book" onClick={() => setOpen(false)}>
                      Book a collection <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>

            <SignedOut>
              <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
                <Link href="/login">Sign in</Link>
              </Button>
            </SignedOut>
            <SignedIn>
              <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
                <Link href="/auth/continue" className="gap-2">
                  <LayoutDashboard className="h-4 w-4" aria-hidden />
                  My account
                </Link>
              </Button>
            </SignedIn>
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t py-10 text-center text-xs text-muted-foreground">
        <div className="mx-auto flex max-w-7xl flex-col flex-wrap justify-center gap-3 px-4 sm:flex-row sm:gap-x-6 sm:gap-y-2">
          <span>© {new Date().getFullYear()} WeSharp</span>
          <Link href="/service-areas" className="hover:text-foreground">
            Coverage
          </Link>
          <Link href="/contact" className="hover:text-foreground">
            Contact
          </Link>
          <span className="text-muted-foreground/80">Greater Manchester & Liverpool</span>
        </div>
      </footer>
    </div>
  );
}
