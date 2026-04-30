/** Render integer pence as GBP (£). */
export function formatGbpFromPence(pence: number | null | undefined): string {
  const n = typeof pence === "number" && Number.isFinite(pence) ? pence : 0;

  return (n / 100).toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  });
}
