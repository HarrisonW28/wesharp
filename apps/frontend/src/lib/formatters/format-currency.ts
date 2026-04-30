const GBP = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

/** Format minor units (pence) to GBP string */
export function formatCurrencyMinor(amountMinor: number): string {
  return GBP.format(amountMinor / 100);
}

/** Format decimal pounds — prefer minor units when integrating Stripe amounts */
export function formatCurrency(amountPounds: number): string {
  return GBP.format(amountPounds);
}
