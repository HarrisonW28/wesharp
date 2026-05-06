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
    expect(adminPermissionForPath("/admin/content-settings/booking")).toBe("settings.manage");
  });
});

describe("adminRouteAccessAllowed", () => {
  it("allows /admin/subscription-plans when subscriptions.view or pricing.view is present", () => {
    expect(adminRouteAccessAllowed("/admin/subscription-plans", new Set(["subscriptions.view"]))).toBe(true);
    expect(adminRouteAccessAllowed("/admin/subscription-plans", new Set(["pricing.view"]))).toBe(true);
    expect(adminRouteAccessAllowed("/admin/subscription-plans", new Set())).toBe(false);
  });

  it("falls back to adminPermissionForPath for other routes", () => {
    expect(adminRouteAccessAllowed("/admin/subscriptions", new Set(["subscriptions.view"]))).toBe(true);
    expect(adminRouteAccessAllowed("/admin/subscriptions", new Set())).toBe(false);
  });
});
