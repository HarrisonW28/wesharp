export type SubscriptionCheckoutPhase =
  | "auth-loading"
  | "profile-loading"
  | "linking-profile"
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
  setupComplete: boolean;
  hasCheckoutError: boolean;
};

/** Pure state machine for `/subscribe/[planId]` — keeps UX branches testable. */
export function subscriptionCheckoutPhase(input: PhaseInput): SubscriptionCheckoutPhase {
  if (!input.isLoaded || !input.userId) {
    return "auth-loading";
  }

  if (input.meStatus === "pending" || (input.meFetching && !input.profileReady)) {
    return "profile-loading";
  }

  if (input.setupComplete && !input.companyId) {
    return "linking-profile";
  }

  if (input.profileReady && !input.companyId && !input.setupComplete) {
    return "needs-organisation";
  }

  if (input.hasCheckoutError) {
    return "checkout-error";
  }

  return "starting-checkout";
}

export type BootstrapRegistrationType = "business" | "sole_customer";

/** Subscribe checkout defaults to sole trader — most self-serve sign-ups are individuals. */
export function defaultBootstrapRegistrationType(
  profileQuery: string | null | undefined,
): BootstrapRegistrationType {
  if (profileQuery === "sole" || profileQuery === "individual") {
    return "sole_customer";
  }
  if (profileQuery === "business" || profileQuery === "venue") {
    return "business";
  }
  return "sole_customer";
}
