import { describe, expect, it } from "vitest";

import {
  isSubscriptionCheckoutPath,
  subscriptionCheckoutPath,
  subscriptionCheckoutSignInPath,
} from "@/lib/subscription-checkout-path";
import {
  defaultBootstrapRegistrationType,
  subscriptionCheckoutPhase,
} from "@/lib/subscription-checkout-state";

describe("subscription-checkout-path", () => {
  it("builds encoded subscribe paths", () => {
    expect(subscriptionCheckoutPath("plan-123")).toBe("/subscribe/plan-123");
    expect(subscriptionCheckoutSignInPath("plan-123")).toBe("/login?returnTo=%2Fsubscribe%2Fplan-123");
  });

  it("detects subscribe return paths", () => {
    expect(isSubscriptionCheckoutPath("/subscribe/abc")).toBe(true);
    expect(isSubscriptionCheckoutPath("/subscriptions")).toBe(false);
    expect(isSubscriptionCheckoutPath(null)).toBe(false);
  });
});

describe("subscription-checkout-state", () => {
  const base = {
    isLoaded: true,
    userId: "user_1",
    meStatus: "success" as const,
    meFetching: false,
    profileReady: true,
    companyId: null,
    hasCheckoutError: false,
  };

  it("defaults bootstrap registration type to business", () => {
    expect(defaultBootstrapRegistrationType(null)).toBe("business");
    expect(defaultBootstrapRegistrationType("venue")).toBe("business");
    expect(defaultBootstrapRegistrationType("sole")).toBe("sole_customer");
    expect(defaultBootstrapRegistrationType("individual")).toBe("sole_customer");
  });

  it("shows organisation redirect for signed-in user without company", () => {
    expect(subscriptionCheckoutPhase(base)).toBe("needs-organisation");
  });

  it("starts checkout when company is linked", () => {
    expect(
      subscriptionCheckoutPhase({
        ...base,
        companyId: "co_1",
      }),
    ).toBe("starting-checkout");
  });

  it("surfaces checkout errors without hiding organisation step", () => {
    expect(
      subscriptionCheckoutPhase({
        ...base,
        companyId: "co_1",
        hasCheckoutError: true,
      }),
    ).toBe("checkout-error");
  });
});
