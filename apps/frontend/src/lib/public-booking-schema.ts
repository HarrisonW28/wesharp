import { z } from "zod";

function isYYYYMMDD(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** Local calendar comparison (aligned with Laravel `after:yesterday` for typical UTC+ timezones). */
function preferredDateNotInPast(s: string): boolean {
  if (!isYYYYMMDD(s)) {
    return false;
  }
  const [ys, ms, ds] = s.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return false;
  }
  const picked = new Date(y, m - 1, d);
  picked.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return picked >= today;
}

const publicBookingBaseSchema = z.object({
  business_name: z.string().trim().min(2, "Enter your organisation name.").max(255),
  contact_name: z.string().trim().min(2, "Enter a contact name.").max(255),
  email: z.string().trim().email("Enter a valid email."),
  phone: z.string().trim().min(5, "Enter a reachable phone number.").max(48),
  address_line_1: z.string().trim().min(3, "Enter the first line of the address.").max(512),
  address_line_2: z.string().trim().max(512).optional().or(z.literal("")),
  city: z.string().trim().min(2, "Enter a city.").max(191),
  postcode: z.string().trim().min(3, "Enter a postcode.").max(24),
  estimated_knife_count: z.preprocess((val) => {
    if (val === "" || val === undefined || val === null) return undefined;
    const n = Number(val);
    return Number.isNaN(n) ? undefined : n;
  }, z.number().int().min(1).max(50000).optional()),
  preferred_date: z
    .string()
    .min(10, "Pick a preferred date.")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date."),
  time_window_preference: z.string().trim().min(2, "Tell us your preferred time window.").max(500),
  service_type: z.enum(["collection", "onsite"]),
  message: z.string().trim().min(10, "Add a short description (at least 10 characters).").max(20000),
  terms_accepted: z.boolean(),
});

export const PUBLIC_BOOKING_ENQUIRY_SCHEMA = publicBookingBaseSchema
  .refine((data) => preferredDateNotInPast(data.preferred_date), {
    path: ["preferred_date"],
    message: "Preferred date cannot be in the past.",
  })
  .refine((data) => data.terms_accepted === true, {
    path: ["terms_accepted"],
    message: "Acknowledge the enquiry terms to continue.",
  });

export type PublicBookingFormValues = z.infer<typeof publicBookingBaseSchema>;

