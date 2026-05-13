import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  ClipboardList,
  type LucideIcon,
  Package,
  Receipt,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type PortalFeatureKey =
  | "order-tracking"
  | "knife-register"
  | "collections"
  | "invoicing"
  | "reporting";

type PortalFeature = {
  key: PortalFeatureKey;
  href: string;
  icon: LucideIcon;
  title: string;
  blurb: string;
};

/**
 * Single source of truth for the trade-accounts portal feature cluster.
 * Keep order stable — used for cross-page navigation and SEO internal-link consistency.
 */
export const PORTAL_FEATURES: PortalFeature[] = [
  {
    key: "order-tracking",
    href: "/trade-accounts/order-tracking",
    icon: Package,
    title: "Order tracking & workshop visibility",
    blurb: "Live status, photo evidence at each stage, inspections, and damage reports per order.",
  },
  {
    key: "knife-register",
    href: "/trade-accounts/knife-register",
    icon: ClipboardList,
    title: "Knife register & blade history",
    blurb: "Tagged blades, per-knife inspections and photos, and multi-site audits in one register.",
  },
  {
    key: "collections",
    href: "/trade-accounts/collections",
    icon: CalendarClock,
    title: "Bookings & collections",
    blurb: "Recurring route slots, per-site windows, named contacts, and self-service amendments.",
  },
  {
    key: "invoicing",
    href: "/trade-accounts/invoicing",
    icon: Receipt,
    title: "Invoicing & finance",
    blurb: "Consolidated billing, payment statuses, VAT-ready PDFs, and Stripe-handled card payments.",
  },
  {
    key: "reporting",
    href: "/trade-accounts/reporting",
    icon: BarChart3,
    title: "Reporting & dashboards",
    blurb: "Cross-site overview, subscription allowances, and finance-friendly invoice lists.",
  },
];

type Variant = "prominent" | "compact";

type PortalFeaturesBandProps = {
  /** "prominent" for the hub page, "compact" for sibling/deep-dive pages. */
  variant?: Variant;
  /** Mark the current page so it shows as the active tile (not clickable) instead of a link. */
  currentKey?: PortalFeatureKey;
  /** Override the eyebrow/heading/intro copy. Sensible defaults per variant. */
  eyebrow?: string;
  heading?: string;
  intro?: string;
  /** Anchor id for in-page jumps. */
  id?: string;
};

/**
 * Reusable feature grid for the trade-accounts cluster — used both as the hub's
 * main attraction and as a top-of-page navigation band on every deep-dive page.
 */
export function PortalFeaturesBand({
  variant = "prominent",
  currentKey,
  eyebrow,
  heading,
  intro,
  id = "portal-features",
}: PortalFeaturesBandProps) {
  const isProminent = variant === "prominent";
  const headingId = `${id}-heading`;

  const resolvedEyebrow = eyebrow ?? (isProminent ? "Customer portal" : "More portal features");
  const resolvedHeading =
    heading ?? (isProminent ? "What you get in the portal" : "Explore the rest of the portal");
  const resolvedIntro =
    intro ??
    (isProminent
      ? "One signed-in workspace for your whole team — each card opens a full walk-through with illustrative previews of the real screens."
      : "Each card opens a focused walk-through of one area of the same signed-in workspace.");

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        "rounded-2xl border bg-gradient-to-b ring-1 shadow-sm",
        isProminent
          ? "-mx-4 space-y-5 border-border/80 from-muted/40 to-muted/15 px-4 py-8 ring-black/5 sm:-mx-0 sm:px-6 md:space-y-6 md:px-8 md:py-10 dark:ring-white/10"
          : "space-y-4 border-border/70 from-muted/25 to-muted/10 px-4 py-5 ring-black/5 sm:px-5 sm:py-6 dark:ring-white/10",
      )}
    >
      <div className={cn("space-y-2", isProminent ? "text-center md:text-left" : "text-left")}>
        <p className={cn("font-semibold uppercase tracking-wider text-primary", isProminent ? "text-xs" : "text-[11px]")}>
          {resolvedEyebrow}
        </p>
        <h2
          id={headingId}
          className={cn(
            "text-balance font-semibold tracking-tight text-foreground",
            isProminent ? "text-xl md:text-2xl" : "text-base md:text-lg",
          )}
        >
          {resolvedHeading}
        </h2>
        {resolvedIntro ? (
          <p
            className={cn(
              "max-w-2xl leading-relaxed text-muted-foreground",
              isProminent ? "mx-auto text-sm md:mx-0 md:text-base" : "text-xs md:text-sm",
            )}
          >
            {resolvedIntro}
          </p>
        ) : null}
      </div>

      <div
        className={cn(
          "grid gap-3",
          isProminent ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4",
        )}
      >
        {PORTAL_FEATURES.map((feature) => {
          const Icon = feature.icon;
          const isCurrent = feature.key === currentKey;

          const baseClass = cn(
            "group flex flex-col gap-3 rounded-xl border bg-card shadow-sm transition-all",
            isProminent ? "min-h-[7.5rem] p-4 md:p-5" : "p-3 md:p-4",
            isCurrent
              ? "border-primary/40 ring-1 ring-primary/30"
              : "border-border/80 hover:border-primary/50 hover:shadow-md",
          );

          const inner = (
            <>
              <div className="flex items-start justify-between gap-2">
                <span
                  className={cn(
                    "flex shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary",
                    isProminent ? "h-11 w-11" : "h-9 w-9",
                  )}
                >
                  <Icon className={cn("shrink-0", isProminent ? "h-5 w-5" : "h-4 w-4")} aria-hidden />
                </span>
                {isCurrent ? (
                  <span className="rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                    You are here
                  </span>
                ) : (
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                    aria-hidden
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block font-semibold leading-snug text-foreground",
                    isProminent ? "text-sm md:text-base" : "text-sm",
                  )}
                >
                  {feature.title}
                </span>
                <span
                  className={cn(
                    "mt-2 block leading-relaxed text-muted-foreground",
                    isProminent ? "text-xs md:text-sm" : "text-xs",
                  )}
                >
                  {feature.blurb}
                </span>
              </div>
            </>
          );

          if (isCurrent) {
            return (
              <div
                key={feature.key}
                aria-current="page"
                className={cn(baseClass, "cursor-default")}
              >
                {inner}
              </div>
            );
          }

          return (
            <Link key={feature.key} href={feature.href} className={baseClass}>
              {inner}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
