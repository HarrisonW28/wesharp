"use client";

import Link from "next/link";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { ArrowRight, Camera, ListChecks, PoundSterling, Sparkles, UserRound } from "lucide-react";

import { SERVICE_AREAS } from "@/config/service-areas";

import { Button } from "@/components/ui/button";

export function HomeHero() {
  return (
    <section className="relative overflow-hidden border-b bg-gradient-to-b from-primary/12 via-background to-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgb(59_130_246_/_0.14),transparent_55%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-16 md:py-24 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
              Greater Manchester &amp; Liverpool
            </div>
          </motion.div>
          <motion.h1
            className="mt-6 text-balance text-4xl font-semibold tracking-tight md:text-5xl lg:text-[3.25rem] lg:leading-tight"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
          >
            Professional knife sharpening, collected from your door.
          </motion.h1>
          <motion.p
            className="mt-5 text-lg text-muted-foreground md:text-xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
          >
            Book a slot, hand over your blades, and get them back sharp and inspected — without leaving your kitchen off the
            pass for long.
          </motion.p>
          <motion.p
            className="mt-3 text-sm font-medium text-foreground/90 md:text-base"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.12 }}
          >
            Most kitchens book in under a minute — choose a date, tell us roughly how many knives, and you&apos;re done.
          </motion.p>
          <motion.div
            className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.14 }}
          >
            <Button size="lg" className="rounded-lg sm:min-w-[200px]" asChild>
              <Link href="/book">
                Book a collection
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-lg sm:min-w-[200px]" asChild>
              <Link href="/pricing">See prices</Link>
            </Button>
            <Button size="lg" variant="secondary" className="rounded-lg sm:min-w-[200px]" asChild>
              <Link href="/how-it-works">How it works</Link>
            </Button>
          </motion.div>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <SignedOut>
              <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                <Link href="/register">Create account</Link>
              </Button>
            </SignedOut>
            <SignedIn>
              <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                <Link href="/auth/continue">My account</Link>
              </Button>
            </SignedIn>
          </div>
          <ul
            className="mt-10 flex flex-wrap justify-center gap-2 text-left text-xs text-muted-foreground sm:text-sm"
            aria-label="Why cooks trust WeSharp"
          >
            {[
              { Icon: ListChecks, label: "Tracked orders — see status from collection to return" },
              { Icon: Camera, label: "Timestamped photos when your programme includes them" },
              { Icon: PoundSterling, label: "Clear £ pricing on quotes and invoices" },
              { Icon: UserRound, label: "Free customer portal for bookings and history" },
            ].map(({ Icon, label }) => (
              <li
                key={label}
                className="flex max-w-[260px] items-start gap-2 rounded-xl border border-border/70 bg-background/60 px-3 py-2 shadow-sm backdrop-blur-sm sm:max-w-none"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span>{label}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
            {SERVICE_AREAS.map((area) => (
              <span key={area.id} className="rounded-full border bg-background/70 px-3 py-1 shadow-sm">
                {area.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
