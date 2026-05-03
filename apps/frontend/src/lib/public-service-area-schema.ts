import { z } from "zod";

export const PublicServiceAreaCheckResponseSchema = z.object({
  covered: z.boolean(),
  area: z
    .object({
      id: z.string().uuid(),
      label: z.string(),
      city: z.string(),
    })
    .nullable(),
  next_collection_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

export type PublicServiceAreaCheckResponse = z.infer<typeof PublicServiceAreaCheckResponseSchema>;

export const PUBLIC_SERVICE_AREA_WAITLIST_CUSTOMER_TYPES = ["home", "business", "other"] as const;

export const PublicServiceAreaWaitlistFormSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(255),
  email: z.string().trim().email("Enter a valid email."),
  postcode: z.string().trim().min(2, "Enter a postcode.").max(24),
  customer_type: z.enum(PUBLIC_SERVICE_AREA_WAITLIST_CUSTOMER_TYPES),
  estimated_knife_count: z.preprocess((val) => {
    if (val === "" || val === undefined || val === null) return undefined;
    const n = Number(val);
    return Number.isNaN(n) ? undefined : n;
  }, z.number().int().min(0).max(50_000).optional()),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
  contact_consent: z.boolean().refine((v) => v === true, {
    message: "Confirm we may email you if we expand collection to your area.",
  }),
});

export type PublicServiceAreaWaitlistFormValues = z.infer<typeof PublicServiceAreaWaitlistFormSchema>;
