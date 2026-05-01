import type { BadgeProps } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";
import { customerOrderStatusLabel } from "@/lib/helpers/status-helpers";

type Variant = NonNullable<BadgeProps["variant"]>;

function variantForStatus(status: string): Variant {
  const s = status.trim().toLowerCase();
  if (s === "completed" || s === "returned") {
    return "success";
  }
  if (s === "cancelled") {
    return "destructive";
  }
  if (s === "draft" || s === "received") {
    return "secondary";
  }
  if (s === "invoiced") {
    return "warning";
  }
  return "default";
}

export function CustomerOrderStatusBadge({
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
    <Badge variant={variantForStatus(raw)} className={className}>
      {customerOrderStatusLabel(raw)}
    </Badge>
  );
}
