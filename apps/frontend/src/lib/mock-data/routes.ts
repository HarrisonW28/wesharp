function isoToday(hours: number, minutes: number): string {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

export type RouteStop = {
  id: string;
  title: string;
  addressLine: string;
  windowStart: string;
  windowEnd: string;
  knivesEstimate: number;
  completed: boolean;
};

export type RouteToday = {
  id: string;
  technician: string;
  stops: RouteStop[];
};

export const MOCK_ROUTE_TODAY: RouteToday = {
  id: "rt_today",
  technician: "Alex Rivera",
  stops: [
    {
      id: "stop_1",
      title: "Northern Quarter Bistro Ltd",
      addressLine: "14 Thomas St, Manchester M4 1DH",
      windowStart: isoToday(9, 0),
      windowEnd: isoToday(9, 45),
      knivesEstimate: 18,
      completed: false,
    },
    {
      id: "stop_2",
      title: "Smithfield Butchers",
      addressLine: "Smithfield Retail Park, Manchester M40 8AP",
      windowStart: isoToday(10, 30),
      windowEnd: isoToday(11, 15),
      knivesEstimate: 27,
      completed: false,
    },
    {
      id: "stop_3",
      title: "Dock Events Hub",
      addressLine: "Waterfront Rd, Liverpool L3 9QN",
      windowStart: isoToday(13, 0),
      windowEnd: isoToday(14, 30),
      knivesEstimate: 54,
      completed: false,
    },
  ],
};
