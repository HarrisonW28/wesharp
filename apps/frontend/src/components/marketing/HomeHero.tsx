"use client";

import Link from "next/link";

import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

import { SERVICE_AREAS } from "@/config/service-areas";

import { Button } from "@/components/ui/button";

export function HomeHero() {
  return (
    <section className="relative overflow-hidden border-b bg-gradient-to-b from-primary/12 via-background to-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),transparent_55%)]" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-4 py-16 md:flex-row md:items-center md:py-24 md:px-8">
        <div className="flex-1 space-y-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
              Sharpening ops built for hospitality teams
            </div>
          </motion.div>
          <motion.h1
            className="text-balance text-4xl font-semibold tracking-tight md:text-5xl"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
          >
            Enterprise-grade knife sharpening, coordinated like clockwork.
          </motion.h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Route-ready pickups, custody visibility, and billing clarity across Greater Manchester & Liverpool — without spreadsheets or guesswork.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/account/dashboard">
                Open customer portal <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/book">Request a pickup</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/admin/dashboard">See operations console</Link>
            </Button>
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
          className="flex-1 rounded-2xl border bg-card p-6 shadow-xl shadow-primary/10"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
        >
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <ShieldCheck className="h-6 w-6" aria-hidden />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-semibold">Operational spine</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Technician-first route manifest</li>
                <li>Custody-grade knife tracking</li>
                <li>Stripe-aligned invoicing</li>
              </ul>
            </div>
          </div>
          <div className="mt-6 rounded-xl bg-muted/40 p-4 text-xs text-muted-foreground">
            Demo UI · Authentication wiring arrives with Clerk + Laravel JWT verification.
          </div>
        </motion.div>
      </div>
    </section>
  );
}
