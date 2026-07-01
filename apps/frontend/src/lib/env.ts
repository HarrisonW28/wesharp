/**
 * Laravel API origin (no trailing slash), e.g. http://localhost:8000.
 * Used after Clerk obtains a Bearer token for authenticated API calls.
 */
export function apiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_ORIGIN;
  if (typeof raw !== "string") {
    return "";
  }

  const trimmed = raw.replace(/\/+$/, "");
  try {
    const url = new URL(trimmed);
    if (url.protocol === "http:" && !isLocalHost(url.hostname)) {
      url.protocol = "https:";
      return url.origin;
    }
    return url.origin;
  } catch {
    return trimmed;
  }
}

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local");
}
