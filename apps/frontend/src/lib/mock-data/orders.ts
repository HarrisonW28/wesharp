export type MockOrder = {
  id: string;
  organisationName: string;
  reference: string;
  totalMinor: number;
  status: "pending" | "paid" | "fulfilled" | "cancelled";
};

export const MOCK_ORDERS: MockOrder[] = [
  {
    id: "ord_501",
    organisationName: "Northern Quarter Bistro Ltd",
    reference: "ORD-501-MCR",
    totalMinor: 15300,
    status: "paid",
  },
  {
    id: "ord_502",
    organisationName: "Royal Docks Catering Co.",
    reference: "ORD-502-LVP",
    totalMinor: 44250,
    status: "fulfilled",
  },
];
