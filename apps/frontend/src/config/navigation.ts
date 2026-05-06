import {
  Activity,
  Banknote,
  BarChart3,
  Bell,
  Boxes,
  CalendarClock,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  Gauge,
  Inbox,
  Landmark,
  LayoutDashboard,
  LineChart,
  ListTodo,
  Map as MapLucide,
  MapPinned,
  Newspaper,
  Receipt,
  Repeat,
  ScrollText,
  Settings,
  ShoppingCart,
  Tag,
  UserCog,
  Users,
  Utensils,
  Webhook,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Leaf link (sidebar row or bottom tab). */
export type NavLeaf = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Server permission key from Laravel — optional for purely cosmetic links. */
  permission?: string;
  /** Optional one-line hint; shown on nested “card” links in the admin sidebar. */
  description?: string;
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
};

/** Grouped navigation (Sprint 13.1 IA). Empty sections are omitted after permission filtering. */
export type NavSection = {
  label: string;
  items: NavItem[];
};

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

function filterNavItem(item: NavItem, permissions: Set<string>): NavItem | null {
  if (item.children?.length) {
    const kids = item.children.filter((c) => !c.permission || permissions.has(c.permission));
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
    };
  }
  return null;
}

export const ADMIN_NAV_SECTIONS: NavSection[] = [
  {
    label: "Dashboard",
    items: [
      { title: "Overview", href: "/admin/dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
      { title: "Work queue", href: "/admin/work-queue", icon: ListTodo, permission: "dashboard.view" },
      { title: "Analytics", href: "/admin/analytics", icon: Activity, permission: "analytics.view" },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Companies", href: "/admin/crm", icon: Users, permission: "companies.view" },
      {
        title: "Areas",
        icon: MapLucide,
        children: [
          {
            title: "Service areas",
            href: "/admin/service-areas",
            icon: MapLucide,
            permission: "service_areas.view",
            description: "Coverage map and pricing corridors",
          },
          {
            title: "Waitlist",
            href: "/admin/waitlist",
            icon: Inbox,
            permission: "companies.view",
            description: "Postcodes asking us to expand collection",
          },
        ],
      },
      { title: "Bookings", href: "/admin/bookings", icon: CalendarClock, permission: "bookings.view" },
      { title: "Orders", href: "/admin/orders", icon: ClipboardList, permission: "orders.view" },
      { title: "Knives", href: "/admin/knives", icon: Utensils, permission: "knives.view" },
      {
        title: "Routes",
        icon: Boxes,
        permission: "routes.view",
        children: [
          {
            title: "Today's routes",
            href: "/admin/routes/today",
            icon: MapPinned,
            permission: "routes.view",
            description: "Drivers, stops, and completion for today",
          },
          {
            title: "Route planner",
            href: "/admin/routes",
            icon: Boxes,
            permission: "routes.view",
            description: "Build schedules and manage routes",
          },
        ],
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
          {
            title: "Pay-as-you-go rules",
            href: "/admin/pricing-rules",
            icon: Tag,
            permission: "pricing.view",
            description: "Per-knife prices, areas, and first-visit discounts",
          },
        ],
      },
    ],
  },
  {
    label: "Reports",
    items: [
      {
        title: "Operations",
        href: "/admin/reports/operations",
        icon: BarChart3,
        permission: "reports.operations",
      },
      {
        title: "Routes",
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
        title: "Finance",
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
    label: "Settings",
    items: [
      { title: "Users", href: "/admin/users", icon: UserCog, permission: "users.view" },
      { title: "Site content", href: "/admin/content-settings", icon: Newspaper, permission: "settings.manage" },
      { title: "Notifications", href: "/admin/notifications", icon: Bell, permission: "notifications.deliveries.view" },
      {
        title: "System",
        icon: Settings,
        permission: "audit_logs.view",
        children: [
          {
            title: "Audit log",
            href: "/admin/audit",
            icon: ScrollText,
            permission: "audit_logs.view",
            description: "Who changed what, with immutable history",
          },
          {
            title: "Stripe",
            href: "/admin/system/stripe",
            icon: CreditCard,
            permission: "system.integrations.manage",
            description: "Encrypted keys and checkout flags (developer)",
          },
        ],
      },
    ],
  },
];

/** Full admin flat list — every navigable href (tests / legacy helpers). */
export const ADMIN_NAV: NavLeaf[] = navSectionsToLeaves(ADMIN_NAV_SECTIONS);

/** Tenant account — grouped for collapsible mobile / narrow sidebars. Personal items first for phone UX. */
export const ACCOUNT_NAV_SECTIONS: NavSection[] = [
  {
    label: "Profile & places",
    items: [
      { title: "Settings", href: "/account/settings", icon: Settings, permission: "account.settings.update" },
      { title: "Locations", href: "/account/locations", icon: MapPinned, permission: "account.locations.manage" },
    ],
  },
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
      {
        title: "Areas",
        icon: MapLucide,
        children: [
          {
            title: "Service areas",
            href: "/admin/service-areas",
            icon: MapLucide,
            permission: "service_areas.view",
            description: "Coverage map and pricing corridors",
          },
          {
            title: "Waitlist",
            href: "/admin/waitlist",
            icon: Inbox,
            permission: "companies.view",
            description: "Postcodes asking us to expand collection",
          },
        ],
      },
      { title: "Bookings", href: "/admin/bookings", icon: CalendarClock, permission: "bookings.view" },
      { title: "Orders", href: "/admin/orders", icon: ClipboardList, permission: "orders.view" },
      { title: "Knives", href: "/admin/knives", icon: Utensils, permission: "knives.view" },
    ],
  },
  {
    label: "Programmes",
    items: [
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
          {
            title: "Pay-as-you-go rules",
            href: "/admin/pricing-rules",
            icon: Tag,
            permission: "pricing.view",
            description: "Per-knife prices, areas, and first-visit discounts",
          },
        ],
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
      { title: "Webhook inbox", href: "/admin/webhooks/inbox", icon: Webhook, permission: "system.tools.view" },
      {
        title: "Stripe",
        href: "/admin/system/stripe",
        icon: CreditCard,
        permission: "system.integrations.manage",
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

export function filterNavSections(sections: NavSection[], permissions: Set<string>): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items
        .map((item) => filterNavItem(item, permissions))
        .filter((item): item is NavItem => item !== null),
    }))
    .filter((section) => section.items.length > 0);
}

export function filterNav(items: NavLeaf[], permissions: Set<string>): NavLeaf[] {
  return items.filter((item) => !item.permission || permissions.has(item.permission));
}
