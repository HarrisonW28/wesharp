"use client";

import Link from "next/link";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Truck } from "lucide-react";

import { SERVICE_AREAS } from "@/config/service-areas";

import { Button } from "@/components/ui/button";

export function HomeHero() {
  return (
    <section className="relative overflow-hidden border-b bg-gradient-to-b from-amber-500/10 via-background to-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.12),transparent_55%)]" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-4 py-16 md:flex-row md:items-center md:py-24 md:px-8">
        <div className="flex-1 space-y-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" aria-hidden />
              Knife sharpening for restaurants, prep kitchens and cafés
            </div>
          </motion.div>
          <motion.h1
            className="text-balance text-4xl font-semibold tracking-tight md:text-5xl"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
          >
            Sharp blades, simple collections, clear pricing.
          </motion.h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            We collect your knives on scheduled runs, sharpen them in our workshop, and get them back to you — with tracking
            and invoicing that just makes sense. Serving Greater Manchester and Liverpool.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button size="lg" asChild>
              <Link href="/book">
                Book a collection <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <SignedOut>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/register">Create free account</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            </SignedOut>
            <SignedIn>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/auth/continue">Go to my account</Link>
              </Button>
            </SignedIn>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {SERVICE_AREAS.map((area) => (
              <span key={area.id} className="rounded-full border bg-background/70 px-3 py-1">
                {area.label}
              </span>
            ))}
          </div>
        </div>

        <motion.div
          className="flex-1 rounded-2xl border bg-card p-6 shadow-lg"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
        >
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-500/15 p-3 text-amber-700 dark:text-amber-400">
              <Truck className="h-6 w-6" aria-hidden />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-semibold">How a run works</div>
              <ol className="list-decimal space-y-2 pl-4 text-sm text-muted-foreground">
                <li>You book a collection window that suits service.</li>
                <li>We route your stop with our drivers.</li>
                <li>Blades are sharpened, checked, and returned — you see status in your account.</li>
              </ol>
            </div>
          </div>
          <div className="mt-6 rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
            New to WeSharp? Start with a&nbsp;
            <Link href="/how-it-works" className="font-medium text-foreground underline underline-offset-4">
              quick how-it-works
            </Link>
            &nbsp;or check&nbsp;
            <Link href="/pricing" className="font-medium text-foreground underline underline-offset-4">
              pricing
            </Link>
            .
          </div>
        </motion.div>
      </div>
    </section>
  );
}
