"use client";

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";

import { ChefKnifeGlyph, type KnifeGlyphVariant } from "@/components/marketing/ChefKnifeGlyph";
import { cn } from "@/lib/utils";

type FloatingKnifeConfig = {
  id: string;
  variant: KnifeGlyphVariant;
  side: "left" | "right";
  top: string;
  baseRotate: number;
  scale: number;
  /** Parallax factor — higher values drift more on scroll. */
  depth: number;
  sizeClass: string;
  opacityClass: string;
  horizontalClass: string;
  idleDelay?: string;
};

const FLOATING_KNIVES: FloatingKnifeConfig[] = [
  {
    id: "chef-left-high",
    variant: "chef",
    side: "left",
    top: "8%",
    baseRotate: -38,
    scale: 1,
    depth: 0.14,
    sizeClass: "h-[4.5rem] w-[1.15rem] sm:h-28 sm:w-7 lg:h-36 lg:w-9",
    opacityClass: "text-primary/9 sm:text-primary/12 dark:text-primary/14 sm:dark:text-primary/18",
    horizontalClass: "-left-9 sm:-left-6 sm:left-2 lg:left-8 xl:left-14",
    idleDelay: "0s",
  },
  {
    id: "santoku-right-mid",
    variant: "santoku",
    side: "right",
    top: "18%",
    baseRotate: 34,
    scale: 0.92,
    depth: 0.2,
    sizeClass: "h-[3.75rem] w-[1.1rem] sm:h-24 sm:w-7 lg:h-32 lg:w-8",
    opacityClass: "text-primary/8 sm:text-primary/10 dark:text-primary/12 sm:dark:text-primary/16",
    horizontalClass: "-right-7 sm:-right-4 sm:right-0 lg:right-6 xl:right-12",
    idleDelay: "-3s",
  },
  {
    id: "paring-left-mid",
    variant: "paring",
    side: "left",
    top: "42%",
    baseRotate: -24,
    scale: 0.78,
    depth: 0.1,
    sizeClass: "h-[3rem] w-3 sm:h-20 sm:w-5 lg:h-24 lg:w-6",
    opacityClass: "text-primary/7 sm:text-primary/8 dark:text-primary/10 sm:dark:text-primary/12",
    horizontalClass: "-left-6 sm:left-6 lg:left-16 xl:left-24",
    idleDelay: "-5s",
  },
  {
    id: "chef-right-low",
    variant: "chef",
    side: "right",
    top: "58%",
    baseRotate: 42,
    scale: 1.05,
    depth: 0.16,
    sizeClass: "h-[5rem] w-[1.25rem] sm:h-32 sm:w-8 lg:h-40 lg:w-10",
    opacityClass: "text-primary/8 sm:text-primary/11 dark:text-primary/13 sm:dark:text-primary/17",
    horizontalClass: "-right-10 sm:-right-8 sm:-right-2 lg:right-4 xl:right-10",
    idleDelay: "-1.5s",
  },
  {
    id: "paring-right-bottom",
    variant: "paring",
    side: "right",
    top: "78%",
    baseRotate: 18,
    scale: 0.7,
    depth: 0.08,
    sizeClass: "h-[2.5rem] w-2.5 sm:h-16 sm:w-4 lg:h-20 lg:w-5",
    opacityClass: "text-primary/6 sm:text-primary/7 dark:text-primary/9 sm:dark:text-primary/10",
    horizontalClass: "-right-4 sm:right-8 lg:right-20 xl:right-28",
    idleDelay: "-7s",
  },
];

function FloatingKnife({
  config,
  scrollY,
}: {
  config: FloatingKnifeConfig;
  scrollY: MotionValue<number>;
}) {
  const y = useTransform(scrollY, (value) => value * config.depth);
  const rotate = useTransform(scrollY, [0, 4000], [config.baseRotate, config.baseRotate + config.depth * 120]);
  const driftX = useTransform(scrollY, [0, 3000], [0, config.side === "left" ? 12 : -12]);

  return (
    <motion.div
      className={cn(
        "absolute will-change-transform",
        config.horizontalClass,
        config.opacityClass,
        config.sizeClass,
      )}
      style={{
        top: config.top,
        y,
        x: driftX,
        rotate,
        scale: config.scale,
      }}
    >
      <ChefKnifeGlyph
        variant={config.variant}
        className="wesharp-floating-knife w-full drop-shadow-[0_8px_24px_rgba(59,130,246,0.08)]"
        style={config.idleDelay ? { animationDelay: config.idleDelay } : undefined}
      />
    </motion.div>
  );
}

/**
 * Fixed decorative knife layer for public marketing pages.
 * Parallax on scroll; disabled when reduced motion is preferred.
 */
export function FloatingKnivesScrollDecor() {
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();

  if (reduceMotion) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {FLOATING_KNIVES.map((config) => (
        <FloatingKnife key={config.id} config={config} scrollY={scrollY} />
      ))}
    </div>
  );
}
