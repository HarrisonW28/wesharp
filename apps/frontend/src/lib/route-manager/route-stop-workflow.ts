export type RouteStopActionRow = { key: string; path: string; label: string };

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
