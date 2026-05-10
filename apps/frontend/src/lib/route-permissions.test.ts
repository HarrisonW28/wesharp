import { describe, expect, it } from "vitest";

import { adminPermissionForPath, adminRouteAccessAllowed } from "@/lib/route-permissions";

describe("adminPermissionForPath", () => {
  it("maps Sprint 15 shell paths to Laravel permission keys", () => {
    expect(adminPermissionForPath("/admin/system/stripe")).toBe("system.integrations.manage");
    expect(adminPermissionForPath("/admin/webhooks/inbox")).toBe("system.tools.view");
    expect(adminPermissionForPath("/admin/audit")).toBe("audit_logs.view");
    expect(adminPermissionForPath("/admin/waitlist")).toBe("companies.view");
    expect(adminPermissionForPath("/admin/service-areas")).toBe("service_areas.view");
    expect(adminPermissionForPath("/admin/subscription-plans")).toBe("subscriptions.view");
    expect(adminPermissionForPath("/admin/subscriptions")).toBe("subscriptions.view");
    expect(adminPermissionForPath("/admin/site-settings/booking")).toBe("settings.manage");
    expect(adminPermissionForPath("/admin/content-settings/booking")).toBe("settings.manage");
    expect(adminPermissionForPath("/admin/reporting")).toBe("analytics.view");
    expect(adminPermissionForPath("/admin/finance/costs")).toBe("costs.view");
    expect(adminPermissionForPath("/admin/finance/consumables")).toBe("costs.view");
    expect(adminPermissionForPath("/admin/finance/cost-ledger")).toBe("costs.view");
    expect(adminPermissionForPath("/admin/reports/route-profitability")).toBe("reports.operations");
    expect(adminPermissionForPath("/admin/reports/forecast-scenarios")).toBe("reports.finance");
    expect(adminPermissionForPath("/admin/reports/cash-position")).toBe("reports.finance");
    expect(adminPermissionForPath("/admin/reports/subscription-profitability")).toBe("reports.finance");
    expect(adminPermissionForPath("/admin/reports/sales-performance")).toBe("reports.sales_performance");
    expect(adminPermissionForPath("/admin/finance")).toBe("payments.view");
  });
});

describe("adminRouteAccessAllowed", () => {
  it("allows /admin/subscription-plans when subscriptions.view or pricing.view is present", () => {
    expect(adminRouteAccessAllowed("/admin/subscription-plans", new Set(["subscriptions.view"]))).toBe(true);
    expect(adminRouteAccessAllowed("/admin/subscription-plans", new Set(["pricing.view"]))).toBe(true);
    expect(adminRouteAccessAllowed("/admin/subscription-plans", new Set())).toBe(false);
  });

  it("allows /admin/reporting when any reporting-related permission is present", () => {
    expect(adminRouteAccessAllowed("/admin/reporting", new Set(["analytics.view"]))).toBe(true);
    expect(adminRouteAccessAllowed("/admin/reporting", new Set(["reports.operations"]))).toBe(true);
    expect(adminRouteAccessAllowed("/admin/reporting", new Set(["reports.finance"]))).toBe(true);
    expect(adminRouteAccessAllowed("/admin/reporting", new Set(["reports.sales_performance"]))).toBe(true);
    expect(adminRouteAccessAllowed("/admin/reporting", new Set(["payments.view"]))).toBe(true);
    expect(adminRouteAccessAllowed("/admin/reporting", new Set(["invoices.view"]))).toBe(true);
    expect(adminRouteAccessAllowed("/admin/reporting", new Set(["costs.view"]))).toBe(true);
    expect(adminRouteAccessAllowed("/admin/reporting", new Set(["dashboard.view"]))).toBe(false);
    expect(adminRouteAccessAllowed("/admin/reporting", new Set())).toBe(false);
  });

  it("allows /admin/reports/forecast-scenarios when costs.view or reports.finance is present", () => {
    expect(adminRouteAccessAllowed("/admin/reports/forecast-scenarios", new Set(["costs.view"]))).toBe(true);
    expect(adminRouteAccessAllowed("/admin/reports/forecast-scenarios", new Set(["reports.finance"]))).toBe(true);
    expect(adminRouteAccessAllowed("/admin/reports/forecast-scenarios", new Set())).toBe(false);
  });

  it("allows /admin/reports/cash-position when costs.view or reports.finance is present", () => {
    expect(adminRouteAccessAllowed("/admin/reports/cash-position", new Set(["costs.view"]))).toBe(true);
    expect(adminRouteAccessAllowed("/admin/reports/cash-position", new Set(["reports.finance"]))).toBe(true);
    expect(adminRouteAccessAllowed("/admin/reports/cash-position", new Set())).toBe(false);
  });

  it("allows /admin/reports/subscription-profitability when costs.view or reports.finance is present", () => {
    expect(adminRouteAccessAllowed("/admin/reports/subscription-profitability", new Set(["costs.view"]))).toBe(true);
    expect(adminRouteAccessAllowed("/admin/reports/subscription-profitability", new Set(["reports.finance"]))).toBe(true);
    expect(adminRouteAccessAllowed("/admin/reports/subscription-profitability", new Set())).toBe(false);
  });

  it("allows /admin/reports/sales-performance when reports.sales_performance or reports.finance is present", () => {
    expect(adminRouteAccessAllowed("/admin/reports/sales-performance", new Set(["reports.sales_performance"]))).toBe(true);
    expect(adminRouteAccessAllowed("/admin/reports/sales-performance", new Set(["reports.finance"]))).toBe(true);
    expect(adminRouteAccessAllowed("/admin/reports/sales-performance", new Set())).toBe(false);
  });

  it("allows /admin/reports/route-profitability when operations, finance, or costs.view is present", () => {
    expect(adminRouteAccessAllowed("/admin/reports/route-profitability", new Set(["reports.operations"]))).toBe(true);
    expect(adminRouteAccessAllowed("/admin/reports/route-profitability", new Set(["reports.finance"]))).toBe(true);
    expect(adminRouteAccessAllowed("/admin/reports/route-profitability", new Set(["costs.view"]))).toBe(true);
    expect(adminRouteAccessAllowed("/admin/reports/route-profitability", new Set())).toBe(false);
  });

  it("falls back to adminPermissionForPath for other routes", () => {
    expect(adminRouteAccessAllowed("/admin/subscriptions", new Set(["subscriptions.view"]))).toBe(true);
    expect(adminRouteAccessAllowed("/admin/subscriptions", new Set())).toBe(false);
  });
});
