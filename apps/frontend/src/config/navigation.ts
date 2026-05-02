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

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Server permission key from Laravel — optional for purely cosmetic links. */
  permission?: string;
};

/** Grouped navigation (Sprint 13.1 IA). Empty sections are omitted after permission filtering. */
export type NavSection = {
  label: string;
  items: NavItem[];
};

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
    label: "CRM",
    items: [{ title: "Companies & CRM", href: "/admin/crm", icon: Users, permission: "companies.view" }],
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
      { title: "Route planner", href: "/admin/routes", icon: Boxes, permission: "routes.view" },
      { title: "Today's routes", href: "/admin/routes/today", icon: MapPinned, permission: "routes.view" },
    ],
  },
  {
    label: "Sales & pricing",
    items: [
      {
        title: "Plans & price rules",
        href: "/admin/subscription-plans",
        icon: ShoppingCart,
        permission: "subscriptions.view",
      },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Finance", href: "/admin/finance", icon: Landmark, permission: "payments.view" },
      { title: "Invoices", href: "/admin/invoices", icon: Receipt, permission: "invoices.view" },
      { title: "Payments", href: "/admin/payments", icon: Banknote, permission: "payments.view" },
      { title: "Sales report", href: "/admin/reports/sales", icon: LineChart, permission: "reports.finance" },
      {
        title: "Billing report",
        href: "/admin/reports/billing",
        icon: CircleDollarSign,
        permission: "reports.finance",
      },
      { title: "Recurring revenue", href: "/admin/reports/recurring-revenue", icon: Repeat, permission: "reports.finance" },
    ],
  },
  {
    label: "Subscriptions",
    items: [
      { title: "Active subscriptions", href: "/admin/subscriptions", icon: Repeat, permission: "subscriptions.view" },
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
    label: "Settings",
    items: [
      { title: "Users", href: "/admin/users", icon: UserCog, permission: "users.view" },
      { title: "Site content", href: "/admin/content-settings", icon: Newspaper, permission: "settings.manage" },
      { title: "Notifications", href: "/admin/notifications", icon: Bell, permission: "notifications.deliveries.view" },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Audit log", href: "/admin/audit", icon: ScrollText, permission: "audit_logs.view" },
      { title: "Webhook inbox", href: "/admin/webhooks/inbox", icon: Webhook, permission: "audit_logs.view" },
    ],
  },
];

/** Full admin flat list — useful for tests or legacy imports. */
export const ADMIN_NAV: NavItem[] = ADMIN_NAV_SECTIONS.flatMap((s) => s.items);

export const ACCOUNT_NAV: NavItem[] = [
  { title: "Overview", href: "/account/dashboard", icon: Gauge, permission: "dashboard.view" },
  { title: "Your plan", href: "/account/subscription", icon: Repeat, permission: "dashboard.view" },
  { title: "My bookings", href: "/account/bookings", icon: CalendarClock, permission: "bookings.view" },
  { title: "My orders", href: "/account/orders", icon: ClipboardList, permission: "orders.view" },
  { title: "Knives", href: "/account/knives", icon: Utensils, permission: "knives.view" },
  { title: "Invoices", href: "/account/invoices", icon: Receipt, permission: "invoices.view" },
  { title: "Locations", href: "/account/locations", icon: MapPinned, permission: "account.locations.manage" },
  { title: "Settings", href: "/account/settings", icon: Settings, permission: "account.settings.update" },
];

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
      { title: "Webhook inbox", href: "/admin/webhooks/inbox", icon: Webhook, permission: "audit_logs.view" },
    ],
  },
];

export const ROUTE_MANAGER_NAV: NavItem[] = ROUTE_MANAGER_NAV_SECTIONS.flatMap((s) => s.items);

/** Mobile field mode — fewer tabs so taps stay large (Sprint 13.1). */
export const ROUTE_MANAGER_BOTTOM_NAV: NavItem[] = [
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
      items: section.items.filter((item) => !item.permission || permissions.has(item.permission)),
    }))
    .filter((section) => section.items.length > 0);
}

export function filterNav(items: NavItem[], permissions: Set<string>): NavItem[] {
  return items.filter((item) => !item.permission || permissions.has(item.permission));
}
