import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

export type KnifeGlyphVariant = "chef" | "paring" | "santoku";

type ChefKnifeGlyphProps = {
  variant?: KnifeGlyphVariant;
  className?: string;
  style?: CSSProperties;
};

/** Minimal knife silhouettes for decorative backgrounds — `currentColor` + opacity from parent. */
export function ChefKnifeGlyph({ variant = "chef", className, style }: ChefKnifeGlyphProps) {
  if (variant === "paring") {
    return (
      <svg
        viewBox="0 0 48 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("h-auto w-full", className)}
        style={style}
        aria-hidden
      >
        <path
          d="M24 6c8 42 10 78 10 108 0 8-4 14-10 16-6-2-10-8-10-16 0-30 2-66 10-108Z"
          fill="currentColor"
        />
        <rect x="18" y="128" width="12" height="6" rx="1.5" fill="currentColor" opacity="0.9" />
        <rect x="19" y="134" width="10" height="22" rx="3" fill="currentColor" opacity="0.75" />
      </svg>
    );
  }

  if (variant === "santoku") {
    return (
      <svg
        viewBox="0 0 56 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("h-auto w-full", className)}
        style={style}
        aria-hidden
      >
        <path
          d="M28 8c6 18 8 52 8 88 0 6-1 12-2 18l14-2c2-8 2-18 2-28 0-36-4-68-10-92-4 4-8 10-12 16Z"
          fill="currentColor"
          opacity="0.95"
        />
        <path d="M16 114c8 24 10 48 10 62 0 6-2 10-6 12-4-2-6-6-6-12 0-14 2-38 10-62Z" fill="currentColor" />
        <rect x="20" y="186" width="16" height="6" rx="1.5" fill="currentColor" opacity="0.9" />
        <rect x="21" y="192" width="14" height="8" rx="2" fill="currentColor" opacity="0.75" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 64 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-auto w-full", className)}
      style={style}
      aria-hidden
    >
      <path
        d="M32 4c10 58 12 108 12 152 0 10-5 18-12 20-7-2-12-10-12-20 0-44 2-94 12-152Z"
        fill="currentColor"
      />
      <rect x="22" y="174" width="20" height="8" rx="2" fill="currentColor" opacity="0.92" />
      <rect x="24" y="182" width="16" height="52" rx="5" fill="currentColor" opacity="0.78" />
      <circle cx="32" cy="210" r="2.5" fill="currentColor" opacity="0.5" />
      <circle cx="32" cy="222" r="2.5" fill="currentColor" opacity="0.5" />
    </svg>
  );
}
