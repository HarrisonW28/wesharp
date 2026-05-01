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

  if (st === "received") {
    return {
      steps: [
        placed,
        { id: "recv", label: "Received", description: "Your order is at our workshop.", state: "complete" },
        {
          id: "workshop",
          label: "Sharpening",
          description: "We're preparing your blades for service.",
          state: "current",
        },
        { id: "done", label: "Completed", description: "We'll update this when work is finished.", state: "upcoming" },
      ],
    };
  }

  if (st === "inspection") {
    return {
      steps: [
        placed,
        { id: "recv", label: "Received", state: "complete" },
        {
          id: "inspect",
          label: "Inspection",
          description: "We're assessing your knives before sharpening.",
          state: "current",
        },
        { id: "workshop", label: "Sharpening", state: "upcoming" },
        { id: "done", label: "Completed", state: "upcoming" },
      ],
    };
  }

  if (st === "in_progress" || st === "active") {
    return {
      steps: [
        placed,
        { id: "recv", label: "Received", state: "complete" },
        { id: "inspect", label: "Inspection", state: "complete" },
        {
          id: "workshop",
          label: "Sharpening in progress",
          description: "Your knives are being sharpened.",
          state: "current",
        },
        { id: "qc", label: "Quality check", state: "upcoming" },
        { id: "done", label: "Completed", state: "upcoming" },
      ],
    };
  }

  if (st === "quality_check") {
    return {
      steps: [
        placed,
        { id: "recv", label: "Received", state: "complete" },
        { id: "inspect", label: "Inspection", state: "complete" },
        { id: "workshop", label: "Sharpening", state: "complete" },
        {
          id: "qc",
          label: "Final quality check",
          description: "We're doing a last check before we close out.",
          state: "current",
        },
        { id: "done", label: "Completed", state: "upcoming" },
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
          label: "Work finished",
          description: completedOn ? `Closed on ${completedOn}.` : "This order is complete.",
          state: "complete",
        },
      ],
    };
  }

  if (st === "invoiced") {
    return {
      steps: [
        placed,
        { id: "workshop", label: "Sharpening", state: "complete" },
        { id: "done", label: "Work finished", state: "complete" },
        {
          id: "bill",
          label: "Invoice issued",
          description: "Your bill is available in the invoices section.",
          state: "current",
        },
        { id: "ret", label: "Returned to you", state: "upcoming" },
      ],
    };
  }

  if (st === "returned") {
    return {
      steps: [
        placed,
        { id: "workshop", label: "Sharpening", state: "complete" },
        { id: "done", label: "Work finished", state: "complete" },
        { id: "bill", label: "Invoice", state: "complete" },
        {
          id: "ret",
          label: "Returned to you",
          description: "Your knives are back with you.",
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
  if (st === "received" || st === "inspection") {
    return ["Your order is with us.", "Blades will appear below as we register them."];
  }
  if (st === "in_progress" || st === "quality_check" || st === "active") {
    return ["We’re working through your knives in the workshop.", "Totals and line items update as we progress — check back for the latest figures."];
  }
  if (st === "completed") {
    return ["This order is closed.", "If an invoice is linked below, you’ll find it on your Invoices page too."];
  }
  if (st === "invoiced") {
    return ["Your invoice is ready to view.", "Pay any balance due from the Invoices page when you’re ready."];
  }
  if (st === "returned") {
    return ["Your knives have been returned.", "Thank you for choosing WeSharp."];
  }
  return ["Check the timeline above for where things stand."];
}
