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
    <nav aria-label="Breadcrumb" className={cn("flex flex-wrap items-center gap-2 text-sm text-muted-foreground", className)}>
      <Link href={homeHref} className="inline-flex items-center gap-1 hover:text-foreground">
        <Home className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Home</span>
      </Link>
      {trail.map((item, idx) => (
        <span key={`${item.label}-${idx}`} className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4 opacity-60" aria-hidden />
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground">
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
