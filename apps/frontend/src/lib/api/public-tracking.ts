import { z } from "zod";

import { apiOrigin } from "@/lib/env";
import { safeApiErrorMessage } from "@/lib/api/safe-api-error-message";
import { AccountCustomerMessageSchema, AccountFulfilmentSchema } from "@/lib/api/account-schema";

const PublicTrackingBookingDataSchema = z
  .object({
    reference: z.string().optional(),
    status: z.string().nullable().optional(),
    fulfilment: AccountFulfilmentSchema.optional(),
    customer_messages: z.array(AccountCustomerMessageSchema).optional(),
    company: z
      .object({
        name: z.string(),
        city: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        billing_email: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    display_collection_date: z.string().nullable().optional(),
    display_time_window_start: z.string().nullable().optional(),
    display_time_window_end: z.string().nullable().optional(),
    confirmed_collection_date: z.string().nullable().optional(),
    confirmed_time_window_start: z.string().nullable().optional(),
    confirmed_time_window_end: z.string().nullable().optional(),
    requested_collection_date: z.string().nullable().optional(),
    customer_notes: z.string().nullable().optional(),
  })
  .passthrough();

const PublicTrackingResponseSchema = z.object({
  success: z.literal(true),
  data: PublicTrackingBookingDataSchema,
});

export type PublicTrackingBooking = z.infer<typeof PublicTrackingBookingDataSchema>;

export async function fetchPublicBookingTracking(token: string): Promise<PublicTrackingBooking> {
  const origin = apiOrigin();
  if (!origin) {
    throw new Error("Set NEXT_PUBLIC_API_ORIGIN.");
  }

  const res = await fetch(`${origin}/api/public/track/${encodeURIComponent(token)}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  const raw = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(safeApiErrorMessage(raw, "This tracking link is invalid or has expired."));
  }

  const parsed = PublicTrackingResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Unexpected tracking response.");
  }

  return parsed.data.data;
}
