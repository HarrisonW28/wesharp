import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

export type KnifeGlyphVariant = "chef" | "paring" | "santoku";

type ChefKnifeGlyphProps = {
  variant?: KnifeGlyphVariant;
  className?: string;
  style?: CSSProperties;
};

/** Side-profile knife silhouettes — spine left, belly right; `currentColor` + opacity from parent. */
export function ChefKnifeGlyph({ variant = "chef", className, style }: ChefKnifeGlyphProps) {
  if (variant === "paring") {
    return (
      <svg
        viewBox="0 0 56 168"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("h-auto w-full", className)}
        style={style}
        aria-hidden
      >
        <path
          d="M30 6 22 14v58c0 28 4 48 10 58l8 2c6-10 10-30 10-58V14L30 6Z"
          fill="currentColor"
        />
        <path d="M20 132h20v6H20v-6Z" fill="currentColor" opacity="0.9" />
        <path d="M22 138h16v24H22V138Z" fill="currentColor" opacity="0.78" />
      </svg>
    );
  }

  if (variant === "santoku") {
    return (
      <svg
        viewBox="0 0 88 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("h-auto w-full", className)}
        style={style}
        aria-hidden
      >
        <path
          d="M46 6 30 16v72c0 8 2 16 4 22l22-4c2-10 2-22 2-34V16L46 6Z"
          fill="currentColor"
          opacity="0.95"
        />
        <path
          d="M28 114c0 34 6 58 14 68l6 2c8-10 14-34 14-68 0-8-2-16-4-22l-20 4c-2 6-4 14-4 22Z"
          fill="currentColor"
        />
        <path d="M24 186h40v6H24v-6Z" fill="currentColor" opacity="0.9" />
        <path d="M26 192h36v22H26V192Z" fill="currentColor" opacity="0.78" />
      </svg>
    );
  }

  /* Chef's knife / gyuto — asymmetric side profile: flat spine left, belly curves right */
  return (
    <svg
      viewBox="0 0 80 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-auto w-full", className)}
      style={style}
      aria-hidden
    >
      <path
        d="M38 5c10 6 16 38 14 72-1 28-7 52-16 68l-12 4V18L38 5Z"
        fill="currentColor"
        opacity="0.16"
      />
      <path
        d="M38 5c12 8 18 42 16 78-2 32-10 58-20 74l-10 2V18L38 5Z"
        fill="currentColor"
      />
      <path
        d="M38 5c14 10 20 48 18 86-2 34-10 62-22 78-2 1-4 2-6 2v-153l10-13Z"
        fill="currentColor"
        opacity="0.28"
      />
      <path d="M20 155h40c3 0 6 2 7 5l2 8H18l2-8c1-3 4-5 7-5Z" fill="currentColor" opacity="0.92" />
      <path d="M22 168h36v72H22V168Z" fill="currentColor" opacity="0.82" />
      <circle cx="30" cy="192" r="2.5" fill="currentColor" opacity="0.45" />
      <circle cx="30" cy="210" r="2.5" fill="currentColor" opacity="0.45" />
      <circle cx="30" cy="228" r="2.5" fill="currentColor" opacity="0.45" />
    </svg>
  );
}
