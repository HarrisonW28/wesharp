/** Illustrative GBP pricing — replace with catalogue API */
export const PRICING = {
  currency: "GBP",
  /** Minor units per knife edge service tier example */
  tiers: [
    { id: "standard", label: "Standard turnaround", unitAmountMinor: 850 },
    { id: "express", label: "Express turnaround", unitAmountMinor: 1250 },
  ],
  subscriptionMonthlyMinor: 4900,
} as const;
