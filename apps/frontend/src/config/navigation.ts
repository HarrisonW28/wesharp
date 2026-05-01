import {
  Activity,
  Banknote,
  BarChart3,
  Boxes,
  CalendarClock,
  CircleDollarSign,
  ClipboardList,
  Gauge,
  Landmark,
  LayoutDashboard,
  LineChart,
  MapPinned,
  Receipt,
  Repeat,
  ScrollText,
  Settings,
  UserCog,
  Users,
  Utensils,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Server permission key from Laravel — optional for purely cosmetic links. */
  permission?: string;
};

export const ADMIN_NAV: NavItem[] = [
  { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
  { title: "Analytics", href: "/admin/analytics", icon: Activity, permission: "analytics.view" },
  { title: "Route planning", href: "/admin/routes", icon: Boxes, permission: "routes.view" },
  { title: "CRM", href: "/admin/crm", icon: Users, permission: "companies.view" },
  { title: "Users", href: "/admin/users", icon: UserCog, permission: "users.view" },
  { title: "Bookings", href: "/admin/bookings", icon: CalendarClock, permission: "bookings.view" },
  { title: "Orders", href: "/admin/orders", icon: ClipboardList, permission: "orders.view" },
  { title: "Knives", href: "/admin/knives", icon: Utensils, permission: "knives.view" },
  { title: "Finance", href: "/admin/finance", icon: Landmark, permission: "payments.view" },
  { title: "Subscription plans", href: "/admin/subscription-plans", icon: Repeat, permission: "subscriptions.view" },
  { title: "Sales report", href: "/admin/reports/sales", icon: LineChart, permission: "reports.finance" },
  {
    title: "Billing report",
    href: "/admin/reports/billing",
    icon: CircleDollarSign,
    permission: "reports.finance",
  },
  {
    title: "Operations reports",
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
  { title: "Invoices", href: "/admin/invoices", icon: Receipt, permission: "invoices.view" },
  { title: "Payments", href: "/admin/payments", icon: Banknote, permission: "payments.view" },
  { title: "Audit log", href: "/admin/audit", icon: ScrollText, permission: "audit_logs.view" },
  { title: "Routes · Today", href: "/admin/routes/today", icon: MapPinned, permission: "routes.view" },
];

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

export const ROUTE_MANAGER_NAV: NavItem[] = [
  { title: "Today", href: "/admin/routes/today", icon: MapPinned, permission: "routes.view" },
  { title: "All routes", href: "/admin/routes", icon: Boxes, permission: "routes.view" },
  { title: "Bookings", href: "/admin/bookings", icon: CalendarClock, permission: "bookings.view" },
  { title: "Orders", href: "/admin/orders", icon: ClipboardList, permission: "orders.view" },
  { title: "Knives", href: "/admin/knives", icon: Utensils, permission: "knives.view" },
  { title: "Subscription plans", href: "/admin/subscription-plans", icon: Repeat, permission: "subscriptions.view" },
  {
    title: "Operations reports",
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
  { title: "Audit log", href: "/admin/audit", icon: ScrollText, permission: "audit_logs.view" },
];
