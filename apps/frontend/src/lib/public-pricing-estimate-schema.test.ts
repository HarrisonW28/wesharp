import { describe, expect, it } from "vitest";

import { PublicPricingEstimateResponseSchema } from "@/lib/public-pricing-estimate-schema";

describe("public-pricing-estimate-schema", () => {
  it("parses pay_as_you_go payload", () => {
    const parsed = PublicPricingEstimateResponseSchema.safeParse({
      programme_mode: "pay_as_you_go",
      estimate_title: "Estimated one-off collection (workshop pricing)",
      amount_pence: 10200,
      currency: "GBP",
      suggested_package_label: "Mid-size kitchen / refresh scale",
      pricing_rule_name: "Per blade",
      rule_kind: "per_knife",
      subscription_plan: null,
      overage_note: null,
      visit_note: null,
      disclaimer: "Indicative only.",
      visit_pattern: "single",
      customer_kind: "home",
    });
    expect(parsed.success).toBe(true);
  });

  it("parses subscription payload with minimal subscription_plan", () => {
    const parsed = PublicPricingEstimateResponseSchema.safeParse({
      programme_mode: "subscription",
      estimate_title: "Estimated programme cost (one billing period)",
      amount_pence: 12_000,
      currency: "GBP",
      suggested_package_label: "Kitchen Care",
      pricing_rule_name: null,
      rule_kind: null,
      subscription_plan: {
        id: "00000000-0000-4000-8000-000000000001",
        name: "Kitchen Care",
        billing_interval: "monthly",
        price_amount_minor: 9900,
        currency: "GBP",
      },
      overage_note: null,
      visit_note: null,
      disclaimer: "Indicative only.",
      visit_pattern: "single",
      customer_kind: "business",
    });
    expect(parsed.success).toBe(true);
  });
});
