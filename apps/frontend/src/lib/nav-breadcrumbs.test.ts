import { describe, expect, it } from "vitest";

import { ADMIN_NAV_SECTIONS, ACCOUNT_NAV_SECTIONS } from "@/config/navigation";
import { findNavMatch, resolveNavBreadcrumbs } from "@/lib/nav-breadcrumbs";

describe("nav-breadcrumbs", () => {
  it("uses Overview as home label on admin dashboard", () => {
    const res = resolveNavBreadcrumbs("/admin/dashboard", ADMIN_NAV_SECTIONS);
    expect(res.homeHref).toBe("/admin/dashboard");
    expect(res.homeLabel).toBe("Overview");
    expect(res.items).toEqual([]);
  });

  it("matches Operations > Knives for knife list", () => {
    const res = resolveNavBreadcrumbs("/admin/knives", ADMIN_NAV_SECTIONS);
    expect(res.items).toEqual([{ label: "Operations" }, { label: "Knives" }]);
  });

  it("links parent leaf on knife detail pages", () => {
    const res = resolveNavBreadcrumbs("/admin/knives/knife-1", ADMIN_NAV_SECTIONS, {
      suffix: [{ label: "TAG-001" }],
    });
    expect(res.items).toEqual([
      { label: "Operations" },
      { label: "Knives", href: "/admin/knives" },
      { label: "TAG-001" },
    ]);
  });

  it("includes finance group parents for nested cost pages", () => {
    const res = resolveNavBreadcrumbs("/admin/finance/costs", ADMIN_NAV_SECTIONS);
    expect(res.items).toEqual([
      { label: "Finance" },
      { label: "Costs" },
      { label: "Cost catalogue" },
    ]);
  });

  it("matches account sidebar labels", () => {
    const res = resolveNavBreadcrumbs("/account/bookings", ACCOUNT_NAV_SECTIONS);
    expect(res.homeLabel).toBe("Overview");
    expect(res.items).toEqual([{ label: "Work" }, { label: "My bookings" }]);
  });

  it("finds longest prefix for nested admin routes", () => {
    const match = findNavMatch("/admin/orders/order-uuid/items", ADMIN_NAV_SECTIONS);
    expect(match?.leaf.href).toBe("/admin/orders");
    expect(match?.sectionLabel).toBe("Operations");
  });

  it("nests finance report drill-downs under Finance reports", () => {
    const res = resolveNavBreadcrumbs("/admin/reports/billing", ADMIN_NAV_SECTIONS, {
      suffix: [{ label: "Billing report" }],
    });
    expect(res.items).toEqual([
      { label: "Reports" },
      { label: "Finance reports", href: "/admin/reports/finance" },
      { label: "Billing report" },
    ]);
  });

  it("maps orphan waitlist under service areas", () => {
    const res = resolveNavBreadcrumbs("/admin/waitlist", ADMIN_NAV_SECTIONS);
    expect(res.items).toEqual([{ label: "Operations" }, { label: "Waitlist" }]);
  });
});
