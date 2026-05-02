const UUID_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isLikelyUuid(value: string | null | undefined): boolean {
  return Boolean(value && UUID_LIKE.test(value.trim()));
}

/**
 * Avoid showing raw UUIDs in lookup fields when the label has not resolved yet.
 */
export function lookupClosedDisplayLabel(value: string | null | undefined, resolvedLabel: string): string {
  const label = resolvedLabel.trim();
  if (label) {
    return label;
  }
  const id = value?.trim() ?? "";
  if (!id) {
    return "";
  }
  return isLikelyUuid(id) ? "Selected record" : id;
}
