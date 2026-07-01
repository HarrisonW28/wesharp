/** Safe internal path for post-auth redirects. */
export function safeReturnTo(raw: string | null, fallback = "/auth/continue"): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return fallback;
}

export function venuePendingPath(returnTo: string | null): string {
  const safe = safeReturnTo(returnTo, "");
  if (safe === "") {
    return "/venue-pending";
  }
  return `/venue-pending?returnTo=${encodeURIComponent(safe)}`;
}
