"use client";

import Link from "next/link";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Camera, ListChecks, PoundSterling, Sparkles, UserRound } from "lucide-react";

import type { SiteContent } from "@/lib/site-content/site-content-defaults";
import { PUBLIC_SITE_CONTENT_CONTAINER_CLASS } from "@/lib/public-site-layout";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function HomeHero({ homepage }: { homepage: SiteContent["homepage"] }) {
  const trustBadges = homepage.trust_badges ?? [];
  const reduceMotion = useReducedMotion();
  const fade = (duration: number, delay = 0) =>
    reduceMotion ? { duration: 0, delay: 0 } : { duration, delay };

  return (
    <section className="relative overflow-hidden border-b bg-gradient-to-b from-primary/[0.07] via-background to-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_-10%,rgb(59_130_246/0.12),transparent_52%)]" />
      {/* Abstract “blade edge” glint + soft blobs: `md+` only; CSS anim respects reduced motion */}
      <div
        className="pointer-events-none absolute -right-4 top-[8%] hidden h-[min(58vh,28rem)] w-40 overflow-hidden opacity-90 lg:block"
        aria-hidden
      >
        <div className="relative h-full w-full">
          <div className="absolute inset-y-[12%] left-1/2 w-px -translate-x-1/2 rounded-full bg-gradient-to-b from-transparent via-primary/35 to-transparent" />
          <div className="wesharp-hero-edge-glint absolute inset-0 bg-[linear-gradient(102deg,transparent_38%,oklch(0.72_0.14_252_/_0.2)_50%,transparent_62%)] dark:bg-[linear-gradient(102deg,transparent_38%,oklch(0.78_0.16_252_/_0.28)_50%,transparent_62%)]" />
        </div>
      </div>
      <div
        className="wesharp-hero-blob-a pointer-events-none absolute -left-24 top-1/4 hidden h-72 w-72 rounded-full bg-primary/25 blur-3xl md:block dark:bg-primary/20"
        aria-hidden
      />
      <div
        className="wesharp-hero-blob-b pointer-events-none absolute -right-16 bottom-[15%] hidden h-64 w-64 rounded-full bg-primary/20 blur-3xl md:block dark:bg-primary/15"
        aria-hidden
      />
      <div className={cn(PUBLIC_SITE_CONTENT_CONTAINER_CLASS, "relative py-14 md:py-20 lg:py-24")}>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className={cn("mx-auto max-w-xl lg:mx-0 lg:max-w-none", "text-center lg:text-left")}>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={fade(0.35)}
            >
              <div className="inline-flex items-center gap-2 rounded-full border bg-background/85 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
                {homepage.hero_badge}
              </div>
            </motion.div>
            <motion.h1
              className="mt-6 text-balance text-4xl font-semibold tracking-tight md:text-5xl lg:text-[3.25rem] lg:leading-tight"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={fade(0.4, 0.05)}
            >
              {homepage.hero_title}
            </motion.h1>
            <motion.p
              className="mt-5 text-lg text-muted-foreground md:text-xl"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={fade(0.35, 0.1)}
            >
              {homepage.hero_subtitle}
            </motion.p>
            <motion.p
              className="mt-3 text-sm font-medium text-foreground/90 md:text-base"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={fade(0.3, 0.12)}
            >
              {homepage.hero_supporting}
            </motion.p>
            <motion.div
              className="mt-8 grid grid-cols-2 gap-3 sm:flex sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={fade(0.35, 0.14)}
            >
              <Button size="lg" className="rounded-lg sm:min-w-[200px]" asChild>
                <Link href="/book">
                  {homepage.cta_book}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-lg sm:min-w-[200px]" asChild>
                <a href="#check-coverage">{homepage.cta_coverage}</a>
              </Button>
            </motion.div>
            <nav
              aria-label="Other starting points"
              className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm lg:justify-start"
            >
              <Link
                href="/pricing"
                className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
              >
                {homepage.cta_pricing}
              </Link>
              <span className="text-muted-foreground/50" aria-hidden>
                ·
              </span>
              <Link
                href="/how-it-works"
                className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
              >
                {homepage.cta_how}
              </Link>
            </nav>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:flex sm:flex-row sm:justify-center sm:gap-4 lg:justify-start">
              <SignedOut>
                <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                  <Link href="/login">{homepage.cta_sign_in}</Link>
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                  <Link href="/register">{homepage.cta_register}</Link>
                </Button>
              </SignedOut>
              <SignedIn>
                <Button variant="ghost" size="sm" className="col-span-2 justify-center text-muted-foreground sm:col-span-1" asChild>
                  <Link href="/auth/continue">{homepage.cta_my_account}</Link>
                </Button>
              </SignedIn>
            </div>
          </div>
          <motion.div
            className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-none lg:justify-self-end"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={fade(0.4, 0.08)}
          >
            <div className="rounded-2xl border border-border/80 bg-card/90 p-6 shadow-md backdrop-blur-sm md:p-8">
              <p className="text-sm font-semibold tracking-tight text-foreground">Trusted by busy kitchens</p>
              <ul className="mt-5 space-y-4 text-sm leading-relaxed text-muted-foreground">
                {trustBadges.map(({ label }) => {
                  const Icon = trustBadgeIcon(label);
                  return (
                    <li key={label} className="flex gap-3">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <span>{label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function trustBadgeIcon(label: string) {
  if (label.toLowerCase().includes("photo")) {
    return Camera;
  }
  if (label.toLowerCase().includes("£") || label.toLowerCase().includes("pricing")) {
    return PoundSterling;
  }
  if (label.toLowerCase().includes("portal") || label.toLowerCase().includes("account")) {
    return UserRound;
  }
  return ListChecks;
}
