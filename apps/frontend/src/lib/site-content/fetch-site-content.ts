import { cache } from "react";

import { apiOrigin } from "@/lib/env";

import { SITE_CONTENT_DEFAULTS, mergeSiteContent, type SiteContent } from "./site-content-defaults";
import { PublicSubscriptionPlanSchema, type PublicSubscriptionPlan } from "./public-subscription-plans";

export const SITE_CONTENT_REVALIDATE_SEC = 60;

export type PublicBookingFlowSettings = {
  offer_subscription_checkout_in_wizard: boolean;
};

export type PublicSiteData = {
  content: SiteContent;
  publicSubscriptionPlans: PublicSubscriptionPlan[];
  publicBooking: PublicBookingFlowSettings;
};

function parsePublicSubscriptionPlans(raw: unknown): PublicSubscriptionPlan[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: PublicSubscriptionPlan[] = [];
  for (const row of raw) {
    const p = PublicSubscriptionPlanSchema.safeParse(row);
    if (p.success) {
      out.push(p.data);
    }
  }
  return out;
}

function parsePublicBookingFlow(raw: unknown): PublicBookingFlowSettings {
  if (!isRecord(raw)) {
    return { offer_subscription_checkout_in_wizard: false };
  }
  return {
    offer_subscription_checkout_in_wizard: raw.offer_subscription_checkout_in_wizard === true,
  };
}

export const fetchPublicSiteData = cache(async (): Promise<PublicSiteData> => {
  const origin = apiOrigin();
  const emptyBookingFlags: PublicBookingFlowSettings = { offer_subscription_checkout_in_wizard: false };
  if (!origin) {
    return { content: SITE_CONTENT_DEFAULTS, publicSubscriptionPlans: [], publicBooking: emptyBookingFlags };
  }
  try {
    const res = await fetch(`${origin}/api/public/site-content`, {
      next: { revalidate: SITE_CONTENT_REVALIDATE_SEC },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return { content: SITE_CONTENT_DEFAULTS, publicSubscriptionPlans: [], publicBooking: emptyBookingFlags };
    }
    const raw: unknown = await res.json();
    if (!isRecord(raw) || raw.success !== true || !isRecord(raw.data) || !isRecord(raw.data.content)) {
      return { content: SITE_CONTENT_DEFAULTS, publicSubscriptionPlans: [], publicBooking: emptyBookingFlags };
    }
    const plans = parsePublicSubscriptionPlans(raw.data.public_subscription_plans);
    return {
      content: mergeSiteContent(SITE_CONTENT_DEFAULTS, raw.data.content),
      publicSubscriptionPlans: plans,
      publicBooking: parsePublicBookingFlow(raw.data.public_booking),
    };
  } catch {
    return { content: SITE_CONTENT_DEFAULTS, publicSubscriptionPlans: [], publicBooking: emptyBookingFlags };
  }
});

export async function fetchPublicSiteContent(): Promise<SiteContent> {
  const { content } = await fetchPublicSiteData();
  return content;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}
