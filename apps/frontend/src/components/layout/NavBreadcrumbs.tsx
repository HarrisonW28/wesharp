"use client";

import { usePathname } from "next/navigation";

import { Breadcrumbs, type Crumb } from "@/components/layout/Breadcrumbs";
import { useNavSections } from "@/components/navigation/NavSectionsContext";
import { resolveNavBreadcrumbs } from "@/lib/nav-breadcrumbs";

type NavBreadcrumbsProps = {
  /** Extra crumbs after the nav-resolved trail (detail pages). */
  suffix?: Crumb[];
  /** Full override when the route is not in sidebar nav (e.g. nested report drill-downs). */
  items?: Crumb[];
  /** Legacy alias for {@link items}. */
  crumbs?: Crumb[];
  homeHref?: string;
  className?: string;
};

/** Breadcrumbs derived from the same nav config as the sidebar. */
export function NavBreadcrumbs({ suffix, items, crumbs, homeHref, className }: NavBreadcrumbsProps) {
  const pathname = usePathname() ?? "/";
  const sections = useNavSections();
  const resolved = resolveNavBreadcrumbs(pathname, sections, { homeHref, suffix });
  const overrideTrail = items ?? crumbs;

  return (
    <Breadcrumbs
      homeHref={resolved.homeHref}
      homeLabel={resolved.homeLabel}
      items={overrideTrail ?? resolved.items}
      className={className}
    />
  );
}
