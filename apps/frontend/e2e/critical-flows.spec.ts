import { expect, test } from "@playwright/test";

/** Optional: Laravel base (no `/api` suffix) for infra smoke when UI auth is unavailable. */
const apiOrigin =
  typeof process.env.PLAYWRIGHT_API_ORIGIN === "string"
    ? process.env.PLAYWRIGHT_API_ORIGIN.replace(/\/$/, "")
    : "";

test.describe("Public marketing shell", () => {
  test("home responds", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/WeSharp/i);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

test.describe("@auth Critical multi-role flow (skipped by default)", () => {
  test.skip(() => process.env.PLAYWRIGHT_RUN_CLERK_FLOWS !== "true", "Set PLAYWRIGHT_RUN_CLERK_FLOWS=true with working Clerk credentials to enable.");

  /** Placeholder chaining the 13 human QA steps documented in `/docs/testing/e2e-critical-flows.md`. */
  test("staff → ops → tenant journey", async () => {
    // When enabling: authenticate staff, customer, and tenant sessions via storageState
    // fixtures, then walk admin CRM, bookings, routes, knives, invoices, `/book`, and `/account`.
  });
});

test.describe("@api Laravel health stub", () => {
  test.skip(!apiOrigin, "Set PLAYWRIGHT_API_ORIGIN to your backend URL (scheme + host, no trailing slash).");

  test("/api/health", async ({ request }) => {
    const res = await request.get(`${apiOrigin}/api/health`);
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.success).toBe(true);
    expect(body.data && typeof body.data === "object" ? (body.data as Record<string, unknown>).status : null).toBe(
      "ok",
    );
  });
});
