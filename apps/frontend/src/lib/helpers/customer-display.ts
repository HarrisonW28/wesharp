/** Detect UUID-shaped strings so we do not show them as customer-facing labels. */
export function looksLikeUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

/** Workshop tag text, or a neutral label — never a raw record id. */
export function customerKnifeListLabel(tag: string | null | undefined, index: number): string {
  const t = tag?.trim() ?? "";
  if (t !== "" && !looksLikeUuid(t)) {
    return t;
  }
  return `Knife ${index + 1}`;
}
