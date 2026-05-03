"use client";

import Link from "next/link";

import { motion, useReducedMotion } from "framer-motion";

import type { SiteContent } from "@/lib/site-content/site-content-defaults";

import { Button } from "@/components/ui/button";

type HowStep = NonNullable<SiteContent["homepage"]["how_steps"]>[number];

export function HomeHowStepsGrid({
  steps,
  moreLabel,
  moreHref,
}: {
  steps: HowStep[];
  moreLabel: string;
  moreHref: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <>
      <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(({ step, title, body }, index) => (
          <motion.li
            key={step}
            className="relative rounded-2xl border bg-card p-6 shadow-sm"
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -12% 0px" }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.38, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }
            }
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
              {step}
            </span>
            <h3 className="mt-4 text-base font-semibold">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
          </motion.li>
        ))}
      </ol>
      <div className="mt-10 flex justify-center">
        <Button variant="outline" className="rounded-lg" asChild>
          <Link href={moreHref}>{moreLabel}</Link>
        </Button>
      </div>
    </>
  );
}
