/** Marketing → Stripe hosted subscription checkout (via account session after sign-in). */
export function subscriptionCheckoutPath(planId: string): string {
  return `/subscribe/${encodeURIComponent(planId)}`;
}

/** Clerk sign-in with return to subscription checkout. */
export function subscriptionCheckoutSignInPath(planId: string): string {
  const returnTo = subscriptionCheckoutPath(planId);
  return `/login?returnTo=${encodeURIComponent(returnTo)}`;
}
