import { describe, expect, it } from "vitest";

import { adminPermissionForPath } from "@/lib/route-permissions";

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
