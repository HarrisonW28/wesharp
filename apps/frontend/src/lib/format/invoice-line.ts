/** Human label for persisted {@link InvoiceLineItemType} API values. */
export function invoiceLineTypeLabel(type: string | null | undefined): string {
  if (type == null || type === "") return "One-off service";
  switch (type) {
    case "one_off_service":
      return "One-off service";
    case "subscription":
      return "Subscription";
    case "overage":
      return "Overage";
    case "adjustment":
      return "Adjustment";
    default:
      return type.replace(/_/g, " ");
  }
}
