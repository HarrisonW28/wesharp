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
  /** Optional: captured by the guided wizard; merged into customer notes on the server. */
  programme_interest: z.enum(["one_off", "subscription", "unsure"]).optional(),
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

export type PublicBookingFieldErrors = Partial<Record<keyof PublicBookingFormValues | "root", string>>;

const step0Schema = publicBookingBaseSchema.pick({ message: true, service_type: true });

const step1Schema = publicBookingBaseSchema.pick({ estimated_knife_count: true });

const step2Schema = publicBookingBaseSchema.pick({
  business_name: true,
  address_line_1: true,
  address_line_2: true,
  city: true,
  postcode: true,
});

const step3Schema = publicBookingBaseSchema
  .pick({ preferred_date: true, time_window_preference: true })
  .refine((data) => preferredDateNotInPast(data.preferred_date), {
    path: ["preferred_date"],
    message: "Preferred date cannot be in the past.",
  });

const step4Schema = z.object({
  programme_interest: z.enum(["one_off", "subscription", "unsure"], {
    required_error: "Choose how you’d like to work with us.",
  }),
});

const step5Schema = publicBookingBaseSchema.pick({
  contact_name: true,
  email: true,
  phone: true,
  terms_accepted: true,
}).refine((data) => data.terms_accepted === true, {
  path: ["terms_accepted"],
  message: "Acknowledge the enquiry terms to continue.",
});

const WIZARD_STEP_SCHEMAS = [step0Schema, step1Schema, step2Schema, step3Schema, step4Schema, step5Schema] as const;

export const PUBLIC_BOOKING_WIZARD_STEP_COUNT = WIZARD_STEP_SCHEMAS.length;

export function validatePublicBookingWizardStep(
  stepIndex: number,
  values: PublicBookingFormValues,
):
  | { ok: true }
  | {
      ok: false;
      errors: PublicBookingFieldErrors;
    } {
  if (stepIndex < 0 || stepIndex >= WIZARD_STEP_SCHEMAS.length) {
    return { ok: true };
  }
  const schema = WIZARD_STEP_SCHEMAS[stepIndex];
  const parsed = schema.safeParse(values);
  if (parsed.success) {
    return { ok: true };
  }
  const flat = parsed.error.flatten().fieldErrors;
  const errors: PublicBookingFieldErrors = {};
  for (const k of Object.keys(flat) as (keyof typeof flat)[]) {
    const msg = flat[k];
    if (msg?.[0]) {
      errors[k as keyof PublicBookingFormValues] = msg[0];
    }
  }
  return { ok: false, errors };
}

