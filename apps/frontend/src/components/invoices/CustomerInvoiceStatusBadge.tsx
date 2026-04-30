import type { BadgeProps } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";
import { customerInvoiceStatusLabel } from "@/lib/helpers/status-helpers";

type Variant = NonNullable<BadgeProps["variant"]>;

function variantForInvoiceStatus(status: string): Variant {
  const s = status.trim().toLowerCase();
  if (s === "paid") {
    return "success";
  }
  if (s === "void" || s === "overdue") {
    return "destructive";
  }
  if (s === "draft") {
    return "secondary";
  }
  if (s === "sent") {
    return "warning";
  }
  return "default";
}

export function CustomerInvoiceStatusBadge({
  status,
  className,
}: {
  status?: string | null;
  className?: string;
}) {
  const raw = status?.trim() ?? "";
  if (raw === "") {
    return (
      <Badge variant="outline" className={className}>
        —
      </Badge>
    );
  }
  return (
    <Badge variant={variantForInvoiceStatus(raw)} className={className}>
      {customerInvoiceStatusLabel(raw)}
    </Badge>
  );
}
