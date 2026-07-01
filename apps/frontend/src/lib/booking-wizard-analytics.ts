import { track } from "@vercel/analytics";

type BookingWizardEvent =
  | "booking_wizard_step_view"
  | "booking_wizard_step_complete"
  | "booking_wizard_submit"
  | "booking_wizard_subscribe_click";

export function trackBookingWizard(
  event: BookingWizardEvent,
  props: Record<string, string | number | boolean | null | undefined>,
): void {
  try {
    track(event, props);
  } catch {
    // Analytics is best-effort only.
  }
}
