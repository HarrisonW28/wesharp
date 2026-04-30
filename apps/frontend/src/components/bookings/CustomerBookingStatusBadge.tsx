"use client";

import { Badge } from "@/components/ui/badge";
import { customerBookingStatusLabel } from "@/lib/helpers/status-helpers";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success";

function variantForCustomerBooking(status: string): BadgeVariant {
  const s = status.trim().toLowerCase();
  if (["completed", "returned", "converted_to_order"].includes(s)) {
    return "success";
  }
  if (["cancelled", "no_show"].includes(s)) {
    return "destructive";
  }
  if (["requested", "draft"].includes(s)) {
    return "secondary";
  }
  return "default";
}

export function CustomerBookingStatusBadge({ status, className }: { status?: string | null; className?: string }) {
  const raw = status?.trim() ?? "";
  if (!raw) {
    return (
      <Badge variant="outline" className={className}>
        —
      </Badge>
    );
  }
  return (
    <Badge variant={variantForCustomerBooking(raw)} className={cn(className)}>
      {customerBookingStatusLabel(raw)}
    </Badge>
  );
}
