import Link from "next/link";

import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:h-16 md:px-6">
          <Link href="/" className="font-semibold tracking-tight">
            WeSharp
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a className="hover:text-foreground" href="#coverage">
              Coverage
            </a>
            <a className="hover:text-foreground" href="#pricing">
              Pricing
            </a>
            <Link className="hover:text-foreground" href="/login">
              Sign in
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
              <Link href="/login">Operations login</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/account/dashboard">
                Book a pickup <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t py-10 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} WeSharp · Built for kitchens across Greater Manchester & Liverpool
      </footer>
    </div>
  );
}
