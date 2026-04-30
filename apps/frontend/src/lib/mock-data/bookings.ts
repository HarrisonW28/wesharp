import { BOOKING_STATUS } from "@/config/statuses";

export type MockBooking = {
  id: string;
  organisationName: string;
  venue: string;
  scheduledAt: string;
  status: (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];
  knivesCount: number;
};

export const MOCK_BOOKINGS: MockBooking[] = [
  {
    id: "bk_1001",
    organisationName: "Northern Quarter Bistro Ltd",
    venue: "NQ · Kitchen",
    scheduledAt: new Date().toISOString(),
    status: BOOKING_STATUS.CONFIRMED,
    knivesCount: 18,
  },
  {
    id: "bk_1002",
    organisationName: "Royal Docks Catering Co.",
    venue: "Dock Events Hub",
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    status: BOOKING_STATUS.REQUESTED,
    knivesCount: 54,
  },
  {
    id: "bk_1003",
    organisationName: "Smithfield Butchers",
    venue: "Smithfield Counter",
    scheduledAt: new Date(Date.now() + 172800000).toISOString(),
    status: BOOKING_STATUS.COMPLETED,
    knivesCount: 27,
  },
];
