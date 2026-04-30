/**
 * Clerk rejects an empty publishable key during `next build` (including `/_not-found`).
 * This value decodes to a structural Clerk dev instance name — use a real key from your
 * Clerk dashboard for production traffic.
 *
 * See `apps/frontend/env.local.example`.
 */
export const CLERK_PUBLISHABLE_KEY_PLACEHOLDER =
  "pk_test_YWFhLWJiYi0xMi5jbGVyay5hY2NvdW50cy5kZXYk";

export function resolvedClerkPublishableKey(raw: string | undefined): string {
  const v = typeof raw === "string" ? raw.trim() : "";
  return v !== "" ? v : CLERK_PUBLISHABLE_KEY_PLACEHOLDER;
}
