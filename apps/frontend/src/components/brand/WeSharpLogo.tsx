import Link from "next/link";

import { cn } from "@/lib/utils";

type WeSharpLogoProps = {
  className?: string;
  /** When set, the wordmark is a link (e.g. `/` for marketing home, `/admin/dashboard` for ops). */
  href?: string;
  /** e.g. close mobile drawer after navigating */
  onNavigate?: () => void;
};

/**
 * We Sharp wordmark: black artwork for light UI, white for `.dark` (next-themes).
 * Uses `<img>` so height utilities apply reliably. Wrapper is `inline-flex` for clean alignment in flex rows.
 */
export function WeSharpLogo({ className, href, onNavigate }: WeSharpLogoProps) {
  const imgs = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- fixed-size local SVG wordmarks */}
      <img
        src="/brand/wesharp-wordmark-light-mode.svg"
        alt=""
        className="block h-full w-auto max-w-full object-contain object-left dark:hidden"
        decoding="async"
        fetchPriority="low"
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- fixed-size local SVG wordmarks */}
      <img
        src="/brand/wesharp-wordmark-dark-mode.svg"
        alt=""
        className="hidden h-full w-auto max-w-full object-contain object-left dark:block"
        decoding="async"
        fetchPriority="low"
      />
    </>
  );

  if (href !== undefined && href !== "") {
    return (
      <Link
        href={href}
        onClick={() => onNavigate?.()}
        className={cn(
          "inline-flex h-8 shrink-0 items-center justify-start leading-none rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className,
        )}
        aria-label="WeSharp home"
      >
        {imgs}
      </Link>
    );
  }

  return (
    <span
      className={cn("inline-flex h-8 shrink-0 items-center justify-start leading-none", className)}
      aria-hidden="true"
    >
      {imgs}
    </span>
  );
}
