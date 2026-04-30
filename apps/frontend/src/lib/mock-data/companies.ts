export type Company = {
  id: string;
  name: string;
  segment: "restaurant" | "butcher" | "catering";
  city: string;
  knivesActive: number;
};

export const MOCK_COMPANIES: Company[] = [
  {
    id: "co_north_quarter",
    name: "Northern Quarter Bistro Ltd",
    segment: "restaurant",
    city: "Manchester",
    knivesActive: 42,
  },
  {
    id: "co_docks",
    name: "Royal Docks Catering Co.",
    segment: "catering",
    city: "Liverpool",
    knivesActive: 118,
  },
  {
    id: "co_smithfield",
    name: "Smithfield Butchers",
    segment: "butcher",
    city: "Manchester",
    knivesActive: 65,
  },
];
