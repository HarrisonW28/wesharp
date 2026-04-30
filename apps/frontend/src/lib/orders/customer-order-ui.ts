import { customerOrderStatusLabel } from "@/lib/helpers/status-helpers";

export type CustomerOrderTimelineStep = {
  id: string;
  label: string;
  description?: string;
  state: "complete" | "current" | "upcoming";
};

export type CustomerOrderTimeline = { steps: CustomerOrderTimelineStep[] };

function formatShortDate(iso: string | null | undefined): string | undefined {
  if (!iso) {
    return undefined;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return undefined;
  }
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Linear fulfilment timeline for tenant order tracking (status + key dates only). */
export function buildCustomerOrderTimeline(input: {
  status: string | null | undefined;
  created_at?: string | null;
  completed_at?: string | null;
}): CustomerOrderTimeline {
  const st = (input.status ?? "").trim().toLowerCase();
  const placedOn = formatShortDate(input.created_at ?? null);
  const completedOn = formatShortDate(input.completed_at ?? null);

  const placed: CustomerOrderTimelineStep = {
    id: "placed",
    label: "Order placed",
    description: placedOn ? `Recorded on ${placedOn}.` : undefined,
    state: "complete",
  };

  if (st === "cancelled") {
    return {
      steps: [
        placed,
        {
          id: "cancelled",
          label: "Cancelled",
          description: "This order will not be processed further.",
          state: "current",
        },
      ],
    };
  }

  if (st === "draft") {
    return {
      steps: [
        placed,
        {
          id: "prep",
          label: "Being prepared",
          description: "We're finalising the details for this order.",
          state: "current",
        },
        {
          id: "workshop",
          label: "Sharpening",
          description: "Your knives will appear in the list below as we log them.",
          state: "upcoming",
        },
        {
          id: "done",
          label: "Completed",
          description: "We'll mark this order complete when everything is returned.",
          state: "upcoming",
        },
      ],
    };
  }

  if (st === "active") {
    return {
      steps: [
        placed,
        {
          id: "workshop",
          label: "In progress",
          description: "Your knives are in our workshop.",
          state: "current",
        },
        {
          id: "done",
          label: "Completed",
          description: "We'll confirm completion once your order is closed out.",
          state: "upcoming",
        },
      ],
    };
  }

  if (st === "completed") {
    return {
      steps: [
        placed,
        {
          id: "workshop",
          label: "Sharpening",
          description: "Workshop processing is finished for this order.",
          state: "complete",
        },
        {
          id: "done",
          label: "Completed",
          description: completedOn ? `Closed on ${completedOn}.` : "This order is complete.",
          state: "complete",
        },
      ],
    };
  }

  return {
    steps: [
      placed,
      {
        id: "unknown",
        label: customerOrderStatusLabel(st),
        state: "current",
      },
    ],
  };
}

/** Short guidance under the timeline (no internal workflow jargon). */
export function customerOrderNextSteps(status: string | null | undefined): string[] {
  const st = (status ?? "").trim().toLowerCase();
  if (st === "cancelled") {
    return ["If this looks wrong, contact us from your account settings — we’re happy to help."];
  }
  if (st === "draft") {
    return ["We’ll move this order forward once all details are confirmed.", "You’ll see blades listed below as we register them."];
  }
  if (st === "active") {
    return ["We’re working through your knives in the workshop.", "Totals and line items update as we progress — check back for the latest figures."];
  }
  if (st === "completed") {
    return ["This order is closed.", "If an invoice is linked below, you’ll find it on your Invoices page too."];
  }
  return ["Check the timeline above for where things stand."];
}
