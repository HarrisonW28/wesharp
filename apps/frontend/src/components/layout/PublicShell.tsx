"use client";

import Link from "next/link";
import { useState } from "react";

import { ArrowRight, Menu } from "lucide-react";

import { PUBLIC_SITE_NAV_LINKS } from "@/config/public-site-nav";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function PublicShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const navLinkClass =
    "text-sm text-muted-foreground transition-colors hover:text-foreground aria-[current]:font-medium aria-[current]:text-foreground";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 md:h-16 md:px-6">
          <div className="flex min-w-0 items-center gap-2 md:gap-6">
            <Link href="/" className="shrink-0 font-semibold tracking-tight">
              WeSharp
            </Link>
            <nav aria-label="Primary" className="hidden items-center gap-5 md:flex">
              {PUBLIC_SITE_NAV_LINKS.map((l) => (
                <Link key={l.href} href={l.href} className={navLinkClass}>
                  {l.label}
                </Link>
              ))}
              <Link href="/trade-accounts" className={navLinkClass}>
                Trade accounts
              </Link>
              <Link href="/safety" className={navLinkClass}>
                Safety
              </Link>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button size="icon" variant="outline" type="button" className="md:hidden" aria-label="Open menu">
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
                  <Link href="/contact" className={navLinkClass} onClick={() => setOpen(false)}>
                    Contact
                  </Link>
                  <Link href="/login" className={navLinkClass} onClick={() => setOpen(false)}>
                    Sign in
                  </Link>
                  <Button asChild className="mt-2">
                    <Link href="/book" onClick={() => setOpen(false)}>
                      Request a pickup <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>

            <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/book">
                <span className="hidden sm:inline">Request pickup</span>
                <span className="sm:hidden">Pickup</span>{" "}
                <ArrowRight className="ml-1 hidden h-4 w-4 sm:inline" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t py-10 text-center text-xs text-muted-foreground">
        <div className="mx-auto flex max-w-6xl flex-col flex-wrap justify-center gap-3 px-4 sm:flex-row sm:gap-x-6 sm:gap-y-2">
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
