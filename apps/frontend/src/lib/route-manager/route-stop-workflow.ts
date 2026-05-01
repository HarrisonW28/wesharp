export type RouteStopActionRow = {
  key: string;
  path: string;
  label: string;
  /** Primary workflow vs secondary destructive action. */
  variant?: "default" | "destructive" | "outline";
};

/** Failed / could-not-collect — maps to backend `skipped` stop status. */
export function visibleRouteStopFailureAction(status: string): RouteStopActionRow | null {
  const s = status.trim();
  if (s === "not_started" || s === "travelling" || s === "arrived") {
    return {
      key: "skip",
      path: "mark-skipped",
      label: "Failed collection",
      variant: "destructive",
    };
  }
  return null;
}

/** Mirrors stop workflow buttons on the route-manager stop detail page. */
export function visibleRouteStopActions(status: string): RouteStopActionRow[] {
  const rows: RouteStopActionRow[] = [];
  const s = status.trim();
  if (s === "") {
    return rows;
  }

  if (s === "not_started") {
    rows.push({ key: "t", path: "mark-travelling", label: "Mark travelling" });
  }
  if (s === "travelling") {
    rows.push({ key: "a", path: "mark-arrived", label: "Mark arrived" });
  }
  if (s === "arrived") {
    rows.push({ key: "c", path: "mark-collected", label: "Mark collected" });
  }
  if (s === "collected" || s === "in_sharpening") {
    rows.push({ key: "r", path: "mark-returned", label: "Mark returned" });
  }
  if (s === "returned") {
    rows.push({ key: "d", path: "complete", label: "Complete stop" });
  }

  return rows;
}
