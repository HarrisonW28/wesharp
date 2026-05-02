import {
  Activity,
  Banknote,
  BarChart3,
  Bell,
  Boxes,
  CalendarClock,
  CircleDollarSign,
  ClipboardList,
  Gauge,
  Inbox,
  Landmark,
  LayoutDashboard,
  LineChart,
  ListTodo,
  MapPinned,
  Newspaper,
  Receipt,
  Repeat,
  ScrollText,
  Settings,
  ShoppingCart,
  UserCog,
  Users,
  Utensils,
  Webhook,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Staff role string from `GET /api/v1/me` (`user.role`). */
export type StaffNavRole = string;

/** Leaf link (sidebar row or bottom tab). */
export type NavLeaf = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Server permission key from Laravel — optional for purely cosmetic links. */
  permission?: string;
  /** Optional one-line hint; shown on nested “card” links in the admin sidebar. */
  description?: string;
  /**
   * When set, the row is shown only if `user.role` is one of these values (Sprint 15.2).
   * Permission checks still apply when `permission` is set. Omit for permission-only gating.
   */
  rolesAllow?: readonly StaffNavRole[];
};

/**
 * Sidebar entry: either a single link or a parent with card-style child links.
 * Parents may omit `href` when they only act as a group label.
 */
export type NavItem = {
  title: string;
  icon: LucideIcon;
  href?: string;
  permission?: string;
  description?: string;
  children?: NavLeaf[];
  /** Same semantics as {@link NavLeaf.rolesAllow}; applies to the parent row when it has `href`. */
  rolesAllow?: readonly StaffNavRole[];
};

/** Grouped navigation (Sprint 13.1 IA). Empty sections are omitted after permission filtering. */
export type NavSection = {
  label: string;
  items: NavItem[];
};

/** Roles that may see integration webhook tooling in the sidebar; extend when `developer` exists on the API. */
export const ADMIN_WEBHOOK_INBOX_NAV_ROLES = ["super_admin", "admin", "developer"] as const;

/**
 * If `rolesAllow` is set, the current staff role must match. If `role` is not yet known, restricted
 * rows stay hidden (avoids flashing integration links to wrong cohort). Missing `rolesAllow` → no extra gate.
 */
export function navVisibleForRole(
  role: StaffNavRole | undefined,
  item: { rolesAllow?: readonly StaffNavRole[] },
): boolean {
  const allow = item.rolesAllow;
  if (!allow?.length) return true;
  if (role === undefined || role === "") return false;
  return allow.includes(role);
}

/** Flatten one nav item into leaf links (parent `href` first, then children). */
export function navItemToLeaves(item: NavItem): NavLeaf[] {
  const out: NavLeaf[] = [];
  if (item.href) {
    out.push({
      title: item.title,
      href: item.href,
      icon: item.icon,
      permission: item.permission,
      description: item.description,
      rolesAllow: item.rolesAllow,
    });
  }
  if (item.children?.length) {
    out.push(...item.children);
  }
  return out;
}

export function navSectionsToLeaves(sections: NavSection[]): NavLeaf[] {
  return sections.flatMap((s) => s.items.flatMap(navItemToLeaves));
}

function filterNavItem(
  item: NavItem,
  permissions: Set<string>,
  role: StaffNavRole | undefined,
): NavItem | null {
  if (!navVisibleForRole(role, item)) return null;

  if (item.children?.length) {
    const kids = item.children.filter(
      (c) =>
        navVisibleForRole(role, c) && (!c.permission || permissions.has(c.permission)),
    );
    const parentLinkOk =
      Boolean(item.href) && (!item.permission || permissions.has(item.permission));

    if (kids.length === 0) {
      if (parentLinkOk && item.href) {
        return {
          title: item.title,
          href: item.href,
          icon: item.icon,
          permission: item.permission,
          description: item.description,
          rolesAllow: item.rolesAllow,
        };
      }
      return null;
    }

    const result: NavItem = {
      title: item.title,
      icon: item.icon,
      children: kids,
    };
    if (parentLinkOk && item.href) {
      result.href = item.href;
      result.permission = item.permission;
      result.description = item.description;
    }
    return result;
  }

  if (!item.href) return null;
  if (!item.permission || permissions.has(item.permission)) {
    return {
      title: item.title,
      href: item.href,
      icon: item.icon,
      permission: item.permission,
      description: item.description,
      rolesAllow: item.rolesAllow,
    };
  }
  return null;
}

export const ADMIN_NAV_SECTIONS: NavSection[] = [
  {
    label: "Command Centre",
    items: [
      { title: "Overview", href: "/admin/dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
      { title: "Work queue", href: "/admin/work-queue", icon: ListTodo, permission: "dashboard.view" },
      { title: "Analytics", href: "/admin/analytics", icon: Activity, permission: "analytics.view" },
    ],
  },
  {
    label: "CRM",
    items: [
      { title: "Companies", href: "/admin/crm", icon: Users, permission: "companies.view" },
      { title: "Waitlist", href: "/admin/waitlist", icon: Inbox, permission: "companies.view" },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Bookings", href: "/admin/bookings", icon: CalendarClock, permission: "bookings.view" },
      { title: "Orders", href: "/admin/orders", icon: ClipboardList, permission: "orders.view" },
      { title: "Knives", href: "/admin/knives", icon: Utensils, permission: "knives.view" },
    ],
  },
  {
    label: "Routes",
    items: [
      {
        title: "Today",
        href: "/admin/routes/today",
        icon: MapPinned,
        permission: "routes.view",
        description: "Drivers, stops, and completion for today",
      },
      {
        title: "Collections",
        href: "/admin/routes",
        icon: Boxes,
        permission: "routes.view",
        description: "Build schedules and manage routes",
      },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Overview", href: "/admin/finance", icon: Landmark, permission: "payments.view" },
      { title: "Payments", href: "/admin/payments", icon: Banknote, permission: "payments.view" },
      { title: "Invoices", href: "/admin/invoices", icon: Receipt, permission: "invoices.view" },
      {
        title: "Plans & subscriptions",
        icon: ShoppingCart,
        permission: "subscriptions.view",
        children: [
          {
            title: "Plans & pricing",
            href: "/admin/subscription-plans",
            icon: ShoppingCart,
            permission: "subscriptions.view",
            description: "Catalogue, tiers, and price rules",
          },
          {
            title: "Active subscriptions",
            href: "/admin/subscriptions",
            icon: Repeat,
            permission: "subscriptions.view",
            description: "Live subscriptions across tenants",
          },
        ],
      },
    ],
  },
  {
    label: "Customers",
    items: [{ title: "Users", href: "/admin/users", icon: UserCog, permission: "users.view" }],
  },
  {
    label: "Growth",
    items: [
      { title: "Site content", href: "/admin/content-settings", icon: Newspaper, permission: "settings.manage" },
      {
        title: "Operations overview",
        href: "/admin/reports/operations",
        icon: BarChart3,
        permission: "reports.operations",
      },
      {
        title: "Route performance",
        href: "/admin/reports/routes",
        icon: Gauge,
        permission: "reports.operations",
      },
      {
        title: "Knives & services",
        href: "/admin/reports/knives",
        icon: Utensils,
        permission: "reports.operations",
      },
      {
        title: "Finance reports",
        icon: LineChart,
        permission: "reports.finance",
        children: [
          {
            title: "Sales report",
            href: "/admin/reports/sales",
            icon: LineChart,
            permission: "reports.finance",
            description: "Revenue and sales trends",
          },
          {
            title: "Billing report",
            href: "/admin/reports/billing",
            icon: CircleDollarSign,
            permission: "reports.finance",
            description: "Invoicing and cash collection",
          },
          {
            title: "Recurring revenue",
            href: "/admin/reports/recurring-revenue",
            icon: Repeat,
            permission: "reports.finance",
            description: "MRR and subscription momentum",
          },
        ],
      },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Notifications", href: "/admin/notifications", icon: Bell, permission: "notifications.deliveries.view" },
      {
        title: "Audit log",
        href: "/admin/audit",
        icon: ScrollText,
        permission: "audit_logs.view",
        description: "Who changed what, with immutable history",
      },
      {
        title: "Webhook inbox",
        href: "/admin/webhooks/inbox",
        icon: Webhook,
        permission: "audit_logs.view",
        description: "Inbound integration and Stripe events",
        rolesAllow: ADMIN_WEBHOOK_INBOX_NAV_ROLES,
      },
    ],
  },
];

/** Full admin flat list — every navigable href (tests / legacy helpers). */
export const ADMIN_NAV: NavLeaf[] = navSectionsToLeaves(ADMIN_NAV_SECTIONS);

/** Tenant account — grouped for collapsible mobile / narrow sidebars. */
export const ACCOUNT_NAV_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [
      { title: "Overview", href: "/account/dashboard", icon: Gauge, permission: "dashboard.view" },
      { title: "Notifications", href: "/account/notifications", icon: Bell, permission: "dashboard.view" },
      { title: "Your plan", href: "/account/subscription", icon: Repeat, permission: "dashboard.view" },
    ],
  },
  {
    label: "Work",
    items: [
      { title: "My bookings", href: "/account/bookings", icon: CalendarClock, permission: "bookings.view" },
      { title: "My orders", href: "/account/orders", icon: ClipboardList, permission: "orders.view" },
      { title: "Knives", href: "/account/knives", icon: Utensils, permission: "knives.view" },
      { title: "Invoices", href: "/account/invoices", icon: Receipt, permission: "invoices.view" },
    ],
  },
  {
    label: "Account",
    items: [
      { title: "Locations", href: "/account/locations", icon: MapPinned, permission: "account.locations.manage" },
      { title: "Settings", href: "/account/settings", icon: Settings, permission: "account.settings.update" },
    ],
  },
];

export const ACCOUNT_NAV: NavLeaf[] = navSectionsToLeaves(ACCOUNT_NAV_SECTIONS);

export const ROUTE_MANAGER_NAV_SECTIONS: NavSection[] = [
  {
    label: "Dashboard",
    items: [
      { title: "Overview", href: "/admin/dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
      { title: "Work queue", href: "/admin/work-queue", icon: ListTodo, permission: "dashboard.view" },
    ],
  },
  {
    label: "Routes",
    items: [
      { title: "Today", href: "/admin/routes/today", icon: MapPinned, permission: "routes.view" },
      { title: "All routes", href: "/admin/routes", icon: Boxes, permission: "routes.view" },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Waitlist", href: "/admin/waitlist", icon: Inbox, permission: "companies.view" },
      { title: "Bookings", href: "/admin/bookings", icon: CalendarClock, permission: "bookings.view" },
      { title: "Orders", href: "/admin/orders", icon: ClipboardList, permission: "orders.view" },
      { title: "Knives", href: "/admin/knives", icon: Utensils, permission: "knives.view" },
    ],
  },
  {
    label: "Programmes",
    items: [
      {
        title: "Plans & price rules",
        href: "/admin/subscription-plans",
        icon: Repeat,
        permission: "subscriptions.view",
      },
    ],
  },
  {
    label: "Reports",
    items: [
      {
        title: "Operations overview",
        href: "/admin/reports/operations",
        icon: BarChart3,
        permission: "reports.operations",
      },
      {
        title: "Route performance",
        href: "/admin/reports/routes",
        icon: Gauge,
        permission: "reports.operations",
      },
      {
        title: "Knife & service",
        href: "/admin/reports/knives",
        icon: Utensils,
        permission: "reports.operations",
      },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Audit log", href: "/admin/audit", icon: ScrollText, permission: "audit_logs.view" },
      {
        title: "Webhook inbox",
        href: "/admin/webhooks/inbox",
        icon: Webhook,
        permission: "audit_logs.view",
        rolesAllow: ADMIN_WEBHOOK_INBOX_NAV_ROLES,
      },
    ],
  },
];

export const ROUTE_MANAGER_NAV: NavLeaf[] = navSectionsToLeaves(ROUTE_MANAGER_NAV_SECTIONS);

/** Mobile field mode — fewer tabs so taps stay large (Sprint 13.1). */
export const ROUTE_MANAGER_BOTTOM_NAV: NavLeaf[] = [
  { title: "Today", href: "/admin/routes/today", icon: MapPinned, permission: "routes.view" },
  { title: "Routes", href: "/admin/routes", icon: Boxes, permission: "routes.view" },
  { title: "Bookings", href: "/admin/bookings", icon: CalendarClock, permission: "bookings.view" },
  { title: "Orders", href: "/admin/orders", icon: ClipboardList, permission: "orders.view" },
  { title: "Knives", href: "/admin/knives", icon: Utensils, permission: "knives.view" },
];

export function filterNavSections(
  sections: NavSection[],
  permissions: Set<string>,
  role?: StaffNavRole | null,
): NavSection[] {
  const r = role === null || role === "" ? undefined : role;
  return sections
    .map((section) => ({
      ...section,
      items: section.items
        .map((item) => filterNavItem(item, permissions, r))
        .filter((item): item is NavItem => item !== null),
    }))
    .filter((section) => section.items.length > 0);
}

export function filterNav(
  items: NavLeaf[],
  permissions: Set<string>,
  role?: StaffNavRole | null,
): NavLeaf[] {
  const r = role === null || role === "" ? undefined : role;
  return items.filter(
    (item) =>
      navVisibleForRole(r, item) && (!item.permission || permissions.has(item.permission)),
  );
}
