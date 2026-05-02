/**
 * Human-readable UK-style dates for API strings (ISO or YYYY-MM-DD calendar dates).
 * Calendar-only strings are parsed at local noon to avoid timezone day shifts.
 */
export function formatDisplayDate(value: string | null | undefined): string {
  const raw = value?.trim();
  if (!raw) {
    return "—";
  }
  const forParse = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00` : raw;
  const d = new Date(forParse);
  if (Number.isNaN(d.getTime())) {
    return raw;
  }
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
