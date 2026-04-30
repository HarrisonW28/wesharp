import { z } from "zod";

/** Admin “New booking” dialog — keep aligned with `/admin/bookings` form. */
export const adminCreateBookingFormSchema = z.object({
  company_id: z.string().uuid(),
  location_id: z.string().uuid(),
  contact_id: z.string().optional(),
  requested_date: z.string().min(1, "Pick a date."),
  service_type: z.enum(["collection", "onsite"]),
  internal_notes: z.string().optional(),
  price_estimate_pence: z.coerce.number().int().min(0).optional(),
});

export type AdminCreateBookingFormValues = z.infer<typeof adminCreateBookingFormSchema>;
