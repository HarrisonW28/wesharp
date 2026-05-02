"use client";

import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { useState } from "react";

import { ArrowRight, LayoutDashboard, Menu } from "lucide-react";

import { PUBLIC_SITE_NAV_LINKS } from "@/config/public-site-nav";

import { WeSharpLogo } from "@/components/brand/WeSharpLogo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function PublicShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const navLinkClass =
    "text-sm text-muted-foreground transition-colors hover:text-foreground aria-[current]:font-medium aria-[current]:text-foreground";
  /** Mobile sheet: comfortable tap targets */
  const navLinkMobileClass = `${navLinkClass} inline-flex min-h-10 items-center py-1.5`;
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
            className="hidden max-w-[min(100%,52rem)] flex-wrap items-center justify-center gap-x-3 gap-y-1 lg:absolute lg:left-1/2 lg:flex lg:-translate-x-1/2 2xl:max-w-none 2xl:flex-nowrap 2xl:gap-x-4"
          >
            {PUBLIC_SITE_NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={navLinkDesktopClass}>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
            <ThemeToggle />
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button size="icon" variant="outline" type="button" className="lg:hidden" aria-label="Open menu">
                  <Menu className="h-5 w-5" aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="flex h-full max-h-[100dvh] w-[min(100vw-2rem,20rem)] flex-col gap-0 overflow-hidden p-0"
              >
                <SheetHeader className="shrink-0 space-y-0 border-b px-6 py-4 text-left">
                  <SheetTitle>Navigate</SheetTitle>
                </SheetHeader>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
                  <nav className="flex flex-col gap-1 text-base" aria-label="Mobile">
                    {PUBLIC_SITE_NAV_LINKS.map((l) => (
                      <Link key={l.href} href={l.href} className={navLinkMobileClass} onClick={() => setOpen(false)}>
                        {l.label}
                      </Link>
                    ))}
                    <SignedOut>
                      <Link href="/login" className={navLinkMobileClass} onClick={() => setOpen(false)}>
                        Sign in
                      </Link>
                      <Link href="/register" className={navLinkMobileClass} onClick={() => setOpen(false)}>
                        Create account
                      </Link>
                    </SignedOut>
                    <SignedIn>
                      <Link
                        href="/auth/continue"
                        className={`${navLinkMobileClass} gap-2`}
                        onClick={() => setOpen(false)}
                      >
                        <LayoutDashboard className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                        My account
                      </Link>
                    </SignedIn>
                    <Button asChild className="mt-4 w-full shrink-0 rounded-lg">
                      <Link href="/book" onClick={() => setOpen(false)}>
                        Book a collection <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                      </Link>
                    </Button>
                  </nav>
                </div>
                <div className="flex shrink-0 items-center justify-between border-t px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  <span className="text-sm text-muted-foreground">Theme</span>
                  <ThemeToggle />
                </div>
              </SheetContent>
            </Sheet>

            <SignedOut>
              <Button variant="outline" size="sm" asChild className="hidden md:inline-flex">
                <Link href="/register">Create account</Link>
              </Button>
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
        <div className="mx-auto flex max-w-7xl flex-col flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 sm:flex-row">
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
