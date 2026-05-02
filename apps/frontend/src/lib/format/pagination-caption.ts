/** e.g. "Showing 21–40 of 87" for list footers */
export function paginationRangeCaption(
  page: number,
  perPage: number,
  total: number | null | undefined,
): string | null {
  if (total == null || !Number.isFinite(total) || perPage < 1 || page < 1) {
    return null;
  }
  const start = (page - 1) * perPage + 1;
  const end = Math.min(total, page * perPage);
  if (total === 0) {
    return "No rows in this result";
  }
  return `Showing ${start}–${end} of ${total}`;
}
