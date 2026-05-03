import { describe, expect, it } from "vitest";

import {
  PublicServiceAreaCheckResponseSchema,
  PublicServiceAreaWaitlistFormSchema,
} from "@/lib/public-service-area-schema";

describe("public-service-area-schema", () => {
  it("parses check response", () => {
    const parsed = PublicServiceAreaCheckResponseSchema.safeParse({
      covered: true,
      area: { id: "550e8400-e29b-41d4-a716-446655440000", label: "Greater Manchester", city: "Manchester" },
      next_collection_date: "2026-05-12",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts waitlist payload with optional knife count", () => {
    const parsed = PublicServiceAreaWaitlistFormSchema.safeParse({
      name: "Alex",
      email: "alex@example.com",
      postcode: "B1 1TT",
      customer_type: "business",
      estimated_knife_count: 20,
      contact_consent: true,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects waitlist without contact consent", () => {
    const parsed = PublicServiceAreaWaitlistFormSchema.safeParse({
      name: "Alex",
      email: "alex@example.com",
      postcode: "B1 1TT",
      customer_type: "business",
      contact_consent: false,
    });
    expect(parsed.success).toBe(false);
  });
});
