"use client";

import type { RefObject } from "react";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

import { ChefKnifeGlyph } from "@/components/marketing/ChefKnifeGlyph";

type HomeHeroChopKnifeProps = {
  containerRef: RefObject<HTMLElement | null>;
};

/** Hero chef knife — pivots through a chop motion as the user scrolls past the hero. */
export function HomeHeroChopKnife({ containerRef }: HomeHeroChopKnifeProps) {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const rotate = useTransform(scrollYProgress, [0, 0.28, 0.55, 0.85, 1], [-58, -18, 8, 24, 30]);
  const translateY = useTransform(scrollYProgress, [0, 0.28, 0.55, 1], [0, 18, 42, 64]);
  const opacity = useTransform(scrollYProgress, [0, 0.75, 1], [0.16, 0.11, 0.04]);

  if (reduceMotion) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute right-[14%] top-[48%] hidden h-px w-24 rotate-[-10deg] bg-primary/12 md:block lg:right-[18%] lg:w-32" />

      <motion.div
        className="absolute right-[6%] top-[10%] hidden h-[min(52vh,24rem)] w-[min(14vw,6.5rem)] text-primary md:block lg:right-[10%] lg:top-[12%] lg:h-[min(56vh,28rem)] lg:w-28"
        style={{
          rotate,
          y: translateY,
          opacity,
          transformOrigin: "50% 88%",
        }}
      >
        <ChefKnifeGlyph variant="chef" className="h-full w-full drop-shadow-[0_12px_32px_rgba(59,130,246,0.12)]" />
      </motion.div>
    </div>
  );
}
