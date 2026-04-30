/**
 * Mirrors `App\Support\Knives\KnifeStatusTransitions` — used to enable workflow buttons client-side.
 * Server still enforces transitions; mismatched taps return 422.
 */
export const KNIFE_STATUS_EDGES: Record<string, readonly string[]> = {
  logged: ["collected", "inspected", "issue_reported"],
  collected: ["inspected", "issue_reported"],
  inspected: ["sharpened", "issue_reported"],
  sharpened: ["quality_checked", "issue_reported"],
  quality_checked: ["returned", "issue_reported"],
  returned: [],
  issue_reported: ["inspected", "sharpened"],
} as const;

const WORKFLOW_STEPS = [
  { path: "mark-inspected" as const, target: "inspected", label: "Mark inspected" },
  { path: "mark-sharpened" as const, target: "sharpened", label: "Mark sharpened" },
  { path: "mark-quality-checked" as const, target: "quality_checked", label: "Mark quality-checked" },
  { path: "mark-returned" as const, target: "returned", label: "Mark returned" },
];

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
