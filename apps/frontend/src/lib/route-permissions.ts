/** Map portal URL segments to Laravel permission strings (belt with API + route gates). */
export function adminPermissionForPath(pathname: string): string {
  if (pathname.startsWith("/admin/webhooks")) {
    return "audit_logs.view";
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
  if (pathname.startsWith("/admin/crm")) {
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
  if (pathname.startsWith("/admin/finance")) {
    return "payments.view";
  }
  if (pathname.startsWith("/admin/invoices")) {
    return "invoices.view";
  }
  if (pathname.startsWith("/admin/payments")) {
    return "payments.view";
  }
  if (pathname.startsWith("/admin/routes")) {
    return "routes.view";
  }
  return "dashboard.view";
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
