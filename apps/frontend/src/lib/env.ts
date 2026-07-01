/**
 * Laravel API origin (no trailing slash), e.g. http://localhost:8000.
 * Used after Clerk obtains a Bearer token for authenticated API calls.
 */
export function apiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_ORIGIN;
  return typeof raw === "string" ? raw.replace(/\/+$/, "") : "";
}
