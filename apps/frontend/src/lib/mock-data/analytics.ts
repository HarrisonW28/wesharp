export type WeeklyPoint = { label: string; bookings: number; revenueMinor: number };

/** Rolling totals for charts — illustrative only */
export const MOCK_ANALYTICS_SERIES: WeeklyPoint[] = [
  { label: "Mon", bookings: 12, revenueMinor: 840000 },
  { label: "Tue", bookings: 15, revenueMinor: 902500 },
  { label: "Wed", bookings: 18, revenueMinor: 988000 },
  { label: "Thu", bookings: 14, revenueMinor: 910200 },
  { label: "Fri", bookings: 21, revenueMinor: 1120400 },
  { label: "Sat", bookings: 9, revenueMinor: 640800 },
  { label: "Sun", bookings: 6, revenueMinor: 402300 },
];

export const MOCK_KPIS = {
  bookingsThisWeek: 95,
  completionRate: 0.972,
  avgKnivesPerStop: 31,
};
