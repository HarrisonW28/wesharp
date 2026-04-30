const gbpMinorFormat = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export type FormatGBPOptions = {
  /**
   * How to display null, undefined, or non-finite values.
   * @default "zero" → £0.00 (handy for tables and KPIs)
   */
  whenNull?: "zero" | "dash";
};

/**
 * Format amounts stored in **minor units** (pence) as GBP, e.g. £1,240.00.
 * Backend fields are typically `*_pence`, `amount_pence`, or `subtotal` / `total` when documented as minor units.
 */
export function formatGBP(amountMinor: number | null | undefined, options?: FormatGBPOptions): string {
  const { whenNull = "zero" } = options ?? {};
  if (amountMinor == null || typeof amountMinor !== "number" || !Number.isFinite(amountMinor)) {
    return whenNull === "dash" ? "—" : gbpMinorFormat.format(0);
  }
  return gbpMinorFormat.format(amountMinor / 100);
}

/**
 * Format a value already in **major units** (decimal pounds). Prefer {@link formatGBP} when the API sends pence.
 */
export function formatGBPMajor(amountPounds: number | null | undefined, options?: FormatGBPOptions): string {
  const { whenNull = "zero" } = options ?? {};
  if (amountPounds == null || typeof amountPounds !== "number" || !Number.isFinite(amountPounds)) {
    return whenNull === "dash" ? "—" : gbpMinorFormat.format(0);
  }
  return gbpMinorFormat.format(amountPounds);
}

/**
 * Parse a user-typed £ amount (e.g. "12.50", "£1,240") into integer pence.
 * @throws Error if the string is non-empty but not a valid non-negative amount
 */
export function parseGbpInputToMinorUnits(raw: string): number | undefined {
  const t = raw.trim();
  if (t === "") {
    return undefined;
  }
  const n = Number.parseFloat(t.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("Enter a valid amount in pounds.");
  }
  return Math.round(n * 100);
}

/** Like {@link parseGbpInputToMinorUnits} but never throws; invalid input yields `fallback` (default 0). */
export function coerceGbpInputToMinorUnits(raw: string, fallback = 0): number {
  try {
    return parseGbpInputToMinorUnits(raw) ?? fallback;
  } catch {
    return fallback;
  }
}

/** @deprecated Use {@link formatGBP} */
export const formatGbpFromPence = formatGBP;
