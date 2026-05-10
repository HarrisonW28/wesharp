/** Map portal URL segments to Laravel permission strings (belt with API + route gates). */
export function adminPermissionForPath(pathname: string): string {
  if (pathname.startsWith("/admin/system")) {
    return "system.integrations.manage";
  }
  if (pathname.startsWith("/admin/webhooks")) {
    return "system.tools.view";
  }
  if (pathname.startsWith("/admin/audit")) {
    return "audit_logs.view";
  }
  if (pathname.startsWith("/admin/notifications")) {
    return "notifications.deliveries.view";
  }
  if (pathname.startsWith("/admin/analytics")) {
    return "analytics.view";
  }
  if (pathname.startsWith("/admin/work-queue")) {
    return "dashboard.view";
  }
  if (pathname.startsWith("/admin/crm")) {
    return "companies.view";
  }
  if (pathname.startsWith("/admin/waitlist")) {
    return "companies.view";
  }
  if (pathname.startsWith("/admin/users")) {
    return "users.view";
  }
  if (pathname.startsWith("/admin/bookings")) {
    return "bookings.view";
  }
  if (pathname.startsWith("/admin/orders")) {
    return "orders.view";
  }
  if (pathname.startsWith("/admin/knives")) {
    return "knives.view";
  }
  if (pathname.startsWith("/admin/reports/billing")) {
    return "reports.finance";
  }
  if (pathname.startsWith("/admin/reports/sales")) {
    return "reports.finance";
  }
  if (pathname.startsWith("/admin/reports/recurring-revenue")) {
    return "reports.finance";
  }
  if (pathname.startsWith("/admin/reports/operations")) {
    return "reports.operations";
  }
  if (pathname.startsWith("/admin/reports/routes")) {
    return "reports.operations";
  }
  if (pathname.startsWith("/admin/reports/knives")) {
    return "reports.operations";
  }
  if (pathname.startsWith("/admin/pricing-rules")) {
    return "pricing.view";
  }
  if (pathname.startsWith("/admin/finance/costs")) {
    return "costs.view";
  }
  if (pathname.startsWith("/admin/finance/consumables")) {
    return "costs.view";
  }
  if (pathname.startsWith("/admin/finance/cost-ledger")) {
    return "costs.view";
  }
  if (pathname.startsWith("/admin/finance")) {
    return "payments.view";
  }
  if (pathname.startsWith("/admin/invoices")) {
    return "invoices.view";
  }
  if (pathname.startsWith("/admin/payments")) {
    return "payments.view";
  }
  if (pathname.startsWith("/admin/service-areas")) {
    return "service_areas.view";
  }
  if (pathname.startsWith("/admin/subscription-plans")) {
    return "subscriptions.view";
  }
  if (pathname.startsWith("/admin/subscriptions")) {
    return "subscriptions.view";
  }
  if (pathname.startsWith("/admin/site-settings") || pathname.startsWith("/admin/content-settings")) {
    return "settings.manage";
  }
  if (pathname.startsWith("/admin/routes")) {
    return "routes.view";
  }
  if (pathname.startsWith("/admin/reporting")) {
    return "analytics.view";
  }
  return "dashboard.view";
}

/** Shell gate: some admin routes accept any of several Laravel permissions. */
export function adminRouteAccessAllowed(pathname: string, permissions: ReadonlySet<string>): boolean {
  if (pathname.startsWith("/admin/subscription-plans")) {
    return permissions.has("subscriptions.view") || permissions.has("pricing.view");
  }
  if (pathname.startsWith("/admin/reporting")) {
    return (
      permissions.has("analytics.view") ||
      permissions.has("reports.finance") ||
      permissions.has("reports.operations") ||
      permissions.has("payments.view") ||
      permissions.has("invoices.view")
    );
  }
  return permissions.has(adminPermissionForPath(pathname));
}

export function accountPermissionForPath(pathname: string): string {
  if (pathname.startsWith("/account/dashboard")) {
    return "dashboard.view";
  }
  if (pathname.startsWith("/account/subscription")) {
    return "dashboard.view";
  }
  if (pathname.startsWith("/account/bookings")) {
    return "bookings.view";
  }
  if (pathname.startsWith("/account/orders")) {
    return "orders.view";
  }
  if (pathname.startsWith("/account/knives")) {
    return "knives.view";
  }
  if (pathname.startsWith("/account/invoices")) {
    return "invoices.view";
  }
  if (pathname.startsWith("/account/locations")) {
    return "companies.view";
  }
  if (
    pathname.startsWith("/account/settings") ||
    pathname.startsWith("/account/profile") ||
    pathname.startsWith("/account/business")
  ) {
    return "account.settings.update";
  }
  return "dashboard.view";
}
