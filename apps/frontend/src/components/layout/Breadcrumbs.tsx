import Link from "next/link";

import { ChevronRight, Home } from "lucide-react";

import { cn } from "@/lib/utils";

export type Crumb = { label: string; href?: string };

type BreadcrumbsProps = {
  /** Breadcrumb segments (preferred). */
  items?: Crumb[];
  /** Alias for `items`; supported for legacy admin pages. */
  crumbs?: Crumb[];
  homeHref?: string;
  className?: string;
};

export function Breadcrumbs({
  items,
  crumbs,
  homeHref = "/admin/dashboard",
  className,
}: BreadcrumbsProps) {
  const trail = items ?? crumbs ?? [];
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-base text-muted-foreground md:text-sm", className)}
    >
      <Link
        href={homeHref}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-1 py-1 hover:text-foreground md:min-h-0 md:px-0 md:py-0"
      >
        <Home className="h-5 w-5 shrink-0 md:h-4 md:w-4" aria-hidden />
        <span className="hidden sm:inline">Home</span>
      </Link>
      {trail.map((item, idx) => (
        <span key={`${item.label}-${idx}`} className="flex items-center gap-2">
          <ChevronRight className="h-5 w-5 shrink-0 opacity-60 md:h-4 md:w-4" aria-hidden />
          {item.href ? (
            <Link href={item.href} className="min-h-10 rounded-md px-1 py-1.5 hover:text-foreground md:min-h-0 md:px-0 md:py-0">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
