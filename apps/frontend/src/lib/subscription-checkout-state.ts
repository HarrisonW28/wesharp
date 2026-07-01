export type SubscriptionCheckoutPhase =
  | "auth-loading"
  | "profile-loading"
  | "needs-organisation"
  | "starting-checkout"
  | "checkout-error";

type PhaseInput = {
  isLoaded: boolean;
  userId: string | null | undefined;
  meStatus: "pending" | "error" | "success";
  meFetching: boolean;
  profileReady: boolean;
  companyId: string | null;
  hasCheckoutError: boolean;
};

/** Pure state machine for `/subscribe/[planId]` — keeps UX branches testable. */
export function subscriptionCheckoutPhase(input: PhaseInput): SubscriptionCheckoutPhase {
  if (!input.isLoaded || !input.userId) {
    return "auth-loading";
  }

  if (!input.profileReady || input.meFetching) {
    return "profile-loading";
  }

  if (!input.companyId) {
    return "needs-organisation";
  }

  if (input.hasCheckoutError) {
    return "checkout-error";
  }

  return "starting-checkout";
}

export type BootstrapRegistrationType = "business" | "sole_customer";

/** Matches venue-pending onboarding — business unless the link explicitly selects individual. */
export function defaultBootstrapRegistrationType(
  profileQuery: string | null | undefined,
): BootstrapRegistrationType {
  if (profileQuery === "sole" || profileQuery === "individual") {
    return "sole_customer";
  }
  return "business";
}
