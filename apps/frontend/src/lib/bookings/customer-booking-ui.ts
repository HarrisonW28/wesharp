import { customerBookingStatusLabel } from "@/lib/helpers/status-helpers";

export type CustomerTimelineStep = {
  id: string;
  label: string;
  description?: string;
  state: "complete" | "current" | "upcoming";
};

/** Monotonic rank for milestone progression (customer-safe, no route internals). */
export function customerBookingStatusRank(status: string | null | undefined): number {
  const s = (status ?? "").trim().toLowerCase();
  switch (s) {
    case "draft":
      return 0;
    case "requested":
      return 1;
    case "confirmed":
      return 2;
    case "assigned_to_route":
      return 3;
    case "collected":
      return 4;
    case "in_sharpening":
    case "quality_checked":
      return 5;
    case "returned":
      return 6;
    case "completed":
    case "converted_to_order":
      return 7;
    case "cancelled":
    case "no_show":
      return -1;
    default:
      return 0;
  }
}

const MILESTONES: { id: string; label: string; description: string; minRank: number }[] = [
  { id: "requested", label: "Requested", description: "We’ve received your collection request.", minRank: 1 },
  { id: "confirmed", label: "Confirmed", description: "Your date and time are agreed.", minRank: 2 },
  { id: "scheduled", label: "Visit scheduled", description: "Your pickup is on our schedule.", minRank: 3 },
  { id: "collected", label: "Collected", description: "Your knives are with our team.", minRank: 4 },
  { id: "progress", label: "In progress", description: "Sharpening and quality checks in our workshop.", minRank: 5 },
  { id: "completed", label: "Completed", description: "Knives returned or the job is closed.", minRank: 7 },
];

/** Maps returned (6) into the “in progress” milestone (5) so the timeline stays customer-simple. */
function milestoneRankForTimeline(status: string | null | undefined): number {
  const r = customerBookingStatusRank(status);
  if (r < 0) {
    return r;
  }
  if (r === 6) {
    return 5;
  }
  return r;
}

export function buildCustomerBookingTimeline(status: string | null | undefined): {
  variant: "normal" | "cancelled";
  headline: string;
  steps: CustomerTimelineStep[];
} {
  const raw = (status ?? "").trim().toLowerCase();

  if (raw === "cancelled" || raw === "no_show") {
    return {
      variant: "cancelled",
      headline: raw === "no_show" ? "This visit was missed" : "This booking was cancelled",
      steps: [
        { id: "end", label: customerBookingStatusLabel(status ?? ""), description: undefined, state: "current" },
      ],
    };
  }

  const mr = milestoneRankForTimeline(status);
  const steps: CustomerTimelineStep[] = MILESTONES.map((m) => {
    let state: CustomerTimelineStep["state"];
    if (mr <= 0) {
      state = "upcoming";
    } else if (mr > m.minRank) {
      state = "complete";
    } else if (mr === m.minRank) {
      state = "current";
    } else {
      state = "upcoming";
    }
    return { id: m.id, label: m.label, description: m.description, state };
  });

  return {
    variant: "normal",
    headline: `Status: ${customerBookingStatusLabel(status ?? "")}`,
    steps,
  };
}

export function formatBookingTimeWindow(
  start: string | null | undefined,
  end: string | null | undefined,
): string | null {
  const trimTime = (s: string) => (s.length >= 5 ? s.slice(0, 5) : s);
  const a = start?.trim();
  const b = end?.trim();
  if (!a && !b) {
    return null;
  }
  return `${a ? trimTime(a) : "—"}–${b ? trimTime(b) : "—"}`;
}

export function formatLocationBlock(loc: {
  label?: string | null;
  line_one?: string | null;
  line_two?: string | null;
  city?: string | null;
  postcode?: string | null;
  country?: string | null;
} | null): string[] {
  if (!loc) {
    return [];
  }
  const lines: string[] = [];
  if (loc.label) {
    lines.push(loc.label);
  }
  const street = [loc.line_one, loc.line_two].filter(Boolean).join(", ");
  if (street) {
    lines.push(street);
  }
  const town = [loc.city, loc.postcode].filter(Boolean).join(" ");
  if (town) {
    lines.push(town);
  }
  if (loc.country && loc.country !== "GB" && loc.country !== "United Kingdom") {
    lines.push(loc.country);
  }
  return lines;
}

export function formatContactBlock(contact: {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
} | null): string[] {
  if (!contact) {
    return [];
  }
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ");
  const lines = [];
  if (name) {
    lines.push(name);
  }
  if (contact.phone) {
    lines.push(contact.phone);
  }
  if (contact.email) {
    lines.push(contact.email);
  }
  return lines;
}

export function bookingCustomerNextSteps(
  status: string | null | undefined,
  opts: { canCancel: boolean; hasLinkedOrders: boolean },
): string[] {
  const s = (status ?? "").trim().toLowerCase();
  const out: string[] = [];

  if (s === "cancelled" || s === "no_show") {
    out.push("Need another visit? Book a new collection from your dashboard.");
    return out;
  }

  if (s === "requested") {
    out.push("We’ll confirm your date and time — you’ll see updates here.");
  }
  if (s === "confirmed" || s === "assigned_to_route") {
    out.push("On the day, have your knives ready for handover in the time window shown.");
  }
  if (s === "collected" || s === "in_sharpening" || s === "quality_checked" || s === "returned") {
    out.push("We’ll return your knives when the work is finished — status updates appear here.");
  }
  if (s === "completed" || s === "converted_to_order") {
    out.push("Thank you — your invoices and orders are available from the account menu.");
  }

  if (opts.hasLinkedOrders) {
    out.push("This booking is linked to an order — open “View order” below for details.");
  }

  if (opts.canCancel) {
    out.push("You can cancel this booking if your plans change, before we assign a collection route.");
  }

  return out.length > 0 ? out : ["Check back here for updates on this collection."];
}
