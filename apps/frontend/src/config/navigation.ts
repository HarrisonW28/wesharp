import {
  Activity,
  Banknote,
  BarChart3,
  Bell,
  Boxes,
  Calculator,
  CalendarClock,
  CircleDollarSign,
  ClipboardList,
  Coins,
  CreditCard,
  Gauge,
  Landmark,
  LayoutDashboard,
  LayoutGrid,
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
  Truck,
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
  /** Any listed permission grants access (use when a route accepts multiple roles). */
  permissionAny?: string[];
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
  permissionAny?: string[];
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
      permissionAny: item.permissionAny,
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

function navLeafAllowed(leaf: NavLeaf, permissions: Set<string>): boolean {
  if (leaf.permissionAny && leaf.permissionAny.length > 0) {
    return leaf.permissionAny.some((p) => permissions.has(p));
  }
  return !leaf.permission || permissions.has(leaf.permission);
}

function navItemAllowed(item: NavItem, permissions: Set<string>): boolean {
  if (item.permissionAny && item.permissionAny.length > 0) {
    return item.permissionAny.some((p) => permissions.has(p));
  }
  return !item.permission || permissions.has(item.permission);
}

function filterNavItem(item: NavItem, permissions: Set<string>): NavItem | null {
  if (item.children?.length) {
    const kids = item.children.filter((c) => navLeafAllowed(c, permissions));
    const parentLinkOk = Boolean(item.href) && navItemAllowed(item, permissions);

    if (kids.length === 0) {
      if (parentLinkOk && item.href) {
        return {
          title: item.title,
          href: item.href,
          icon: item.icon,
          permission: item.permission,
          permissionAny: item.permissionAny,
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
      result.permissionAny = item.permissionAny;
      result.description = item.description;
    }
    return result;
  }

  if (!item.href) return null;
  if (!navItemAllowed(item, permissions)) return null;
  return {
    title: item.title,
    href: item.href,
    icon: item.icon,
    permission: item.permission,
    permissionAny: item.permissionAny,
    description: item.description,
  };
}

export const ADMIN_NAV_SECTIONS: NavSection[] = [
  {
    label: "Dashboard",
    items: [
      { title: "Overview", href: "/admin/dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
      { title: "Work queue", href: "/admin/work-queue", icon: ListTodo, permission: "dashboard.view" },
      { title: "Analytics", href: "/admin/analytics", icon: Activity, permission: "analytics.view" },
      {
        title: "Reporting hub",
        href: "/admin/reporting",
        icon: LayoutGrid,
        permissionAny: [
          "analytics.view",
          "reports.finance",
          "reports.operations",
          "reports.sales_performance",
          "reports.executive_dashboard",
          "payments.view",
          "invoices.view",
          "costs.view",
        ],
      },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Companies", href: "/admin/crm", icon: Users, permission: "companies.view" },
      {
        title: "Service areas",
        href: "/admin/service-areas",
        icon: MapLucide,
        permission: "service_areas.view",
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
      {
        title: "Costs",
        icon: CircleDollarSign,
        permission: "costs.view",
        children: [
          {
            title: "Cost catalogue",
            href: "/admin/finance/costs",
            icon: Calculator,
            permission: "costs.view",
            description: "Fixed and recurring costs, categories and statuses",
          },
          {
            title: "Consumables",
            href: "/admin/finance/consumables",
            icon: Boxes,
            permission: "costs.view",
            description: "Stock levels, usage logs and projected restock",
          },
          {
            title: "Cost ledger",
            href: "/admin/finance/cost-ledger",
            icon: Coins,
            permission: "costs.view",
            description: "Allocations to orders, routes and accounts",
          },
        ],
      },
      { title: "Payments", href: "/admin/payments", icon: Banknote, permission: "payments.view" },
      { title: "Invoices", href: "/admin/invoices", icon: Receipt, permission: "invoices.view" },
      {
        title: "Plans & subscriptions",
        icon: ShoppingCart,
        children: [
          {
            title: "Plans & pricing",
            href: "/admin/subscription-plans",
            icon: ShoppingCart,
            permissionAny: ["subscriptions.view", "pricing.view"],
            description: "Subscription catalogue and pay-as-you-go blade pricing",
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
        title: "Finance reports",
        href: "/admin/reports/finance",
        icon: LineChart,
        permissionAny: ["reports.finance", "costs.view", "reports.sales_performance", "reports.executive_dashboard"],
        description: "Cash, forecasts, subscriptions, sales and billing",
      },
    ],
  },
  {
    label: "Settings",
    items: [
      { title: "Users", href: "/admin/users", icon: UserCog, permission: "users.view" },
      { title: "Site settings", href: "/admin/site-settings", icon: Newspaper, permission: "settings.manage" },
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
      {
        title: "Reporting hub",
        href: "/admin/reporting",
        icon: LayoutGrid,
        permissionAny: [
          "analytics.view",
          "reports.finance",
          "reports.operations",
          "reports.sales_performance",
          "reports.executive_dashboard",
          "payments.view",
          "invoices.view",
          "costs.view",
        ],
      },
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
        title: "Service areas",
        href: "/admin/service-areas",
        icon: MapLucide,
        permission: "service_areas.view",
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
        children: [
          {
            title: "Plans & pricing",
            href: "/admin/subscription-plans",
            icon: ShoppingCart,
            permissionAny: ["subscriptions.view", "pricing.view"],
            description: "Subscription catalogue and pay-as-you-go blade pricing",
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
        title: "Route profitability",
        href: "/admin/reports/route-profitability",
        icon: Truck,
        permissionAny: ["reports.operations", "reports.finance", "costs.view"],
        description: "Revenue, allocations, driver margins",
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
  return items.filter((item) => navLeafAllowed(item, permissions));
}
