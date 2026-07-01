import type { Crumb } from "@/components/layout/Breadcrumbs";
import type { NavItem, NavLeaf, NavSection } from "@/config/navigation";

export type NavBreadcrumbResolution = {
  homeHref: string;
  homeLabel: string;
  items: Crumb[];
};

type NavMatch = {
  sectionLabel: string;
  parentItem?: NavItem;
  leaf: NavLeaf;
  exact: boolean;
};

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function pathMatches(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function collectCandidates(
  section: NavSection,
  item: NavItem,
): { parent?: NavItem; leaf: NavLeaf }[] {
  const out: { parent?: NavItem; leaf: NavLeaf }[] = [];
  if (item.href) {
    out.push({
      leaf: {
        title: item.title,
        href: item.href,
        icon: item.icon,
        permission: item.permission,
        permissionAny: item.permissionAny,
        description: item.description,
      },
    });
  }
  if (item.children?.length) {
    for (const child of item.children) {
      out.push({ parent: item, leaf: child });
    }
  }
  return out;
}

/** Longest-prefix match against filtered sidebar nav. */
export function findNavMatch(pathname: string, sections: NavSection[]): NavMatch | null {
  const normalized = normalizePath(pathname);
  let best: (NavMatch & { hrefLen: number }) | null = null;

  for (const section of sections) {
    for (const item of section.items) {
      for (const { parent, leaf } of collectCandidates(section, item)) {
        if (!pathMatches(normalized, leaf.href)) {
          continue;
        }
        const hrefLen = leaf.href.length;
        if (!best || hrefLen > best.hrefLen) {
          best = {
            sectionLabel: section.label,
            parentItem: parent,
            leaf,
            exact: normalized === leaf.href,
            hrefLen,
          };
        }
      }
    }
  }

  if (!best) {
    return null;
  }

  const { hrefLen: _hrefLen, ...match } = best;
  return match;
}

function findHomeLeaf(sections: NavSection[], homeHref: string): NavLeaf | null {
  for (const section of sections) {
    for (const item of section.items) {
      for (const { leaf } of collectCandidates(section, item)) {
        if (leaf.href === homeHref) {
          return leaf;
        }
      }
    }
  }
  return null;
}

export function defaultPortalHomeHref(pathname: string): string {
  return pathname.startsWith("/account") ? "/account/dashboard" : "/admin/dashboard";
}

const FINANCE_REPORTS_HUB = "/admin/reports/finance";

/** Routes not listed in nav but logically nested under a sidebar leaf. */
const ORPHAN_ROUTE_PARENTS: { prefix: string; parentHref: string; title: string }[] = [
  { prefix: "/admin/waitlist", parentHref: "/admin/service-areas", title: "Waitlist" },
  { prefix: "/admin/webhooks/inbox", parentHref: "/admin/audit", title: "Webhook inbox" },
];

function buildMatchTrail(match: NavMatch, suffix: Crumb[]): Crumb[] {
  const items: Crumb[] = [];

  if (match.sectionLabel !== "Dashboard") {
    items.push({ label: match.sectionLabel });
  }

  if (match.parentItem) {
    const parent = match.parentItem;
    items.push(parent.href ? { label: parent.title, href: parent.href } : { label: parent.title });
  }

  const onDetail = !match.exact || suffix.length > 0;

  if (onDetail) {
    items.push({ label: match.leaf.title, href: match.leaf.href });
    items.push(...suffix);
  } else {
    items.push({ label: match.leaf.title });
  }

  return items;
}

function resolveFinanceReportDrilldown(
  pathname: string,
  sections: NavSection[],
  suffix: Crumb[],
): NavMatch | null {
  const normalized = normalizePath(pathname);
  if (!normalized.startsWith("/admin/reports/") || normalized === FINANCE_REPORTS_HUB) {
    return null;
  }

  const direct = findNavMatch(normalized, sections);
  if (direct && direct.leaf.href !== FINANCE_REPORTS_HUB) {
    return null;
  }

  return findNavMatch(FINANCE_REPORTS_HUB, sections);
}

function resolveOrphanRoute(pathname: string, sections: NavSection[]): NavMatch | null {
  const normalized = normalizePath(pathname);
  const orphan = ORPHAN_ROUTE_PARENTS.find(
    (entry) => normalized === entry.prefix || normalized.startsWith(`${entry.prefix}/`),
  );
  if (!orphan) {
    return null;
  }

  const parentMatch = findNavMatch(orphan.parentHref, sections);
  if (!parentMatch) {
    return null;
  }

  return {
    sectionLabel: parentMatch.sectionLabel,
    parentItem: parentMatch.parentItem,
    leaf: { ...parentMatch.leaf, title: orphan.title, href: orphan.prefix },
    exact: normalized === orphan.prefix,
  };
}

/** Build breadcrumb trail aligned with sidebar section / group / leaf labels. */
export function resolveNavBreadcrumbs(
  pathname: string,
  sections: NavSection[],
  options?: {
    homeHref?: string;
    suffix?: Crumb[];
  },
): NavBreadcrumbResolution {
  const homeHref = options?.homeHref ?? defaultPortalHomeHref(pathname);
  const homeLeaf = findHomeLeaf(sections, homeHref);
  const homeLabel = homeLeaf?.title ?? "Overview";

  const normalized = normalizePath(pathname);
  if (normalized === homeHref) {
    return { homeHref, homeLabel, items: [] };
  }

  const suffix = options?.suffix ?? [];
  let match = findNavMatch(normalized, sections);

  if (!match) {
    match = resolveFinanceReportDrilldown(normalized, sections, suffix) ?? resolveOrphanRoute(normalized, sections);
  }

  if (!match) {
    return { homeHref, homeLabel, items: suffix };
  }

  return { homeHref, homeLabel, items: buildMatchTrail(match, suffix) };
}
