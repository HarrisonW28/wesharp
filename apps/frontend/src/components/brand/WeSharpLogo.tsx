import { cn } from "@/lib/utils";

type WeSharpLogoProps = {
  className?: string;
};

/**
 * We Sharp wordmark: black artwork for light UI, white for `.dark` (next-themes).
 * Uses `<img>` so height utilities apply reliably (Next `<Image>` + `em` often collapses).
 */
export function WeSharpLogo({ className }: WeSharpLogoProps) {
  return (
    <span
      className={cn("inline-block h-8 shrink-0 align-middle leading-none", className)}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- fixed-size local SVG wordmarks */}
      <img
        src="/brand/wesharp-wordmark-light-mode.svg"
        alt=""
        className="block h-full w-auto dark:hidden"
        decoding="async"
        fetchPriority="low"
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- fixed-size local SVG wordmarks */}
      <img
        src="/brand/wesharp-wordmark-dark-mode.svg"
        alt=""
        className="hidden h-full w-auto dark:block"
        decoding="async"
        fetchPriority="low"
      />
    </span>
  );
}
