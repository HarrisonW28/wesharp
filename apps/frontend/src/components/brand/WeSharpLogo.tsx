import Image from "next/image";

import { cn } from "@/lib/utils";

type WeSharpLogoProps = {
  className?: string;
};

/** viewBox 0 0 1200 1000 — intrinsic size for next/image layout only */
const WORDMARK_W = 1200;
const WORDMARK_H = 1000;

/**
 * We Sharp wordmark: black artwork on light backgrounds, white on dark (`dark:`).
 * Decorative when the parent link or heading already names the product.
 */
export function WeSharpLogo({ className }: WeSharpLogoProps) {
  return (
    <span className={cn("inline-flex shrink-0 items-center", className)} aria-hidden="true">
      <Image
        src="/brand/wesharp-wordmark-light-mode.svg"
        alt=""
        width={WORDMARK_W}
        height={WORDMARK_H}
        className="h-[1em] w-auto dark:hidden"
        unoptimized
      />
      <Image
        src="/brand/wesharp-wordmark-dark-mode.svg"
        alt=""
        width={WORDMARK_W}
        height={WORDMARK_H}
        className="hidden h-[1em] w-auto dark:block"
        unoptimized
      />
    </span>
  );
}
