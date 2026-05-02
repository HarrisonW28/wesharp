import { apiOrigin } from "@/lib/env";

import { SITE_CONTENT_DEFAULTS, mergeSiteContent, type SiteContent } from "./site-content-defaults";

export const SITE_CONTENT_REVALIDATE_SEC = 60;

export async function fetchPublicSiteContent(): Promise<SiteContent> {
  const origin = apiOrigin();
  if (!origin) {
    return SITE_CONTENT_DEFAULTS;
  }
  try {
    const res = await fetch(`${origin}/api/public/site-content`, {
      next: { revalidate: SITE_CONTENT_REVALIDATE_SEC },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return SITE_CONTENT_DEFAULTS;
    }
    const raw: unknown = await res.json();
    if (!isRecord(raw) || raw.success !== true || !isRecord(raw.data) || !isRecord(raw.data.content)) {
      return SITE_CONTENT_DEFAULTS;
    }
    return mergeSiteContent(SITE_CONTENT_DEFAULTS, raw.data.content);
  } catch {
    return SITE_CONTENT_DEFAULTS;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}
