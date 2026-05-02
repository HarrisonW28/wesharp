import { describe, expect, it } from "vitest";

import { ADMIN_NAV, ADMIN_NAV_SECTIONS, navSectionsToLeaves } from "@/config/navigation";

/** Every admin href that existed before Sprint 15.1 IA — regression guard against dropped links. */
const EXPECTED_ADMIN_HREFS = new Set<string>([
  "/admin/dashboard",
  "/admin/work-queue",
  "/admin/analytics",
  "/admin/crm",
  "/admin/waitlist",
  "/admin/bookings",
  "/admin/orders",
  "/admin/knives",
  "/admin/routes/today",
  "/admin/routes",
  "/admin/finance",
  "/admin/payments",
  "/admin/invoices",
  "/admin/subscription-plans",
  "/admin/subscriptions",
  "/admin/reports/operations",
  "/admin/reports/routes",
  "/admin/reports/knives",
  "/admin/reports/sales",
  "/admin/reports/billing",
  "/admin/reports/recurring-revenue",
  "/admin/users",
  "/admin/content-settings",
  "/admin/notifications",
  "/admin/audit",
  "/admin/webhooks/inbox",
]);

describe("ADMIN_NAV_SECTIONS", () => {
  it("exposes every expected href exactly once", () => {
    const hrefs = ADMIN_NAV.map((l) => l.href);
    const unique = new Set(hrefs);
    expect(unique.size).toBe(hrefs.length);
    expect(unique).toEqual(EXPECTED_ADMIN_HREFS);
  });

  it("uses eight top-level areas (labels)", () => {
    expect(ADMIN_NAV_SECTIONS.map((s) => s.label)).toEqual([
      "Command Centre",
      "CRM",
      "Operations",
      "Routes",
      "Finance",
      "Customers",
      "Growth",
      "System",
    ]);
  });

  it("matches flattened leaves helper", () => {
    expect(navSectionsToLeaves(ADMIN_NAV_SECTIONS)).toEqual(ADMIN_NAV);
  });
});
