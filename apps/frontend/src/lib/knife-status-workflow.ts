/**
 * Mirrors `App\Support\Knives\KnifeStatusTransitions` — used to enable workflow buttons client-side.
 * Server still enforces transitions; mismatched taps return 422.
 */
export const KNIFE_STATUS_EDGES: Record<string, readonly string[]> = {
  logged: ["received", "inspected", "issue_reported", "cancelled"],
  received: ["inspected", "issue_reported", "cancelled"],
  inspected: ["sharpening", "issue_reported", "cancelled"],
  sharpening: ["sharpened", "issue_reported", "cancelled"],
  sharpened: ["quality_checked", "issue_reported", "cancelled"],
  quality_checked: ["returned", "issue_reported", "cancelled"],
  returned: [],
  cancelled: [],
  issue_reported: ["inspected", "sharpening", "sharpened"],
} as const;

const WORKFLOW_STEPS = [
  { target: "received", label: "Mark received" },
  { target: "inspected", label: "Mark inspected" },
  { target: "sharpening", label: "Mark sharpening" },
  { target: "sharpened", label: "Mark sharpened" },
  { target: "quality_checked", label: "Mark quality-checked" },
  { target: "returned", label: "Mark returned" },
  { target: "cancelled", label: "Cancel blade" },
] as const;

export type KnifeWorkflowStep = (typeof WORKFLOW_STEPS)[number];

export function availableWorkflowSteps(status?: string | null): KnifeWorkflowStep[] {
  const s = status ?? "";

  const edges = KNIFE_STATUS_EDGES[s];

  if (!edges) {
    return [];
  }

  return WORKFLOW_STEPS.filter((step) => edges.includes(step.target));
}

export function canReportIssue(status?: string | null): boolean {
  const s = status ?? "";

  return (KNIFE_STATUS_EDGES[s] ?? []).includes("issue_reported");
}

export function isRiskyKnifeTransition(target: string): boolean {
  return ["returned", "cancelled", "issue_reported"].includes(target);
}

/** Mirrors server `KnifeStatusTransitions::canTransition` (including same-status no-op). */
export function canKnifeTransition(from: string | null | undefined, to: string): boolean {
  const s = from?.trim() || "logged";
  if (s === to) {
    return true;
  }
  const edges = KNIFE_STATUS_EDGES[s];
  if (!edges) {
    return false;
  }
  return (edges as readonly string[]).includes(to);
}
