const DF_SHORT = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
});

const DF_LONG = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateShort(isoDate: string): string {
  return DF_SHORT.format(new Date(isoDate));
}

export function formatDateTime(isoDate: string): string {
  return DF_LONG.format(new Date(isoDate));
}
