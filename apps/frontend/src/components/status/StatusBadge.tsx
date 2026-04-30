import type { BadgeProps } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";
import {
  bookingStatusLabel,
  invoiceStatusLabel,
  knifeStatusLabel,
  orderStatusLabel,
  paymentAttemptLabel,
  routeStatusLabel,
  routeStopStatusLabel,
} from "@/lib/helpers/status-helpers";

type Variant = NonNullable<BadgeProps["variant"]>;

function variantBooking(status: string): Variant {
  switch (status.trim()) {
    case "completed":
    case "returned":
      return "success";
    case "cancelled":
    case "no_show":
      return "destructive";
    case "requested":
      return "secondary";
    default:
      return "default";
  }
}

function variantOrder(status: string): Variant {
  switch (status.trim()) {
    case "completed":
      return "success";
    case "cancelled":
      return "destructive";
    case "draft":
      return "secondary";
    case "active":
    default:
      return "default";
  }
}

function variantInvoice(status: string): Variant {
  switch (status.trim()) {
    case "paid":
      return "success";
    case "void":
    case "overdue":
      return "destructive";
    case "draft":
      return "secondary";
    default:
      return "default";
  }
}

function variantKnife(status: string): Variant {
  switch (status.trim()) {
    case "issue_reported":
      return "destructive";
    case "sharpened":
    case "returned":
    case "quality_checked":
      return "success";
    case "logged":
      return "secondary";
    default:
      return "default";
  }
}

function variantRoute(status: string): Variant {
  switch (status.trim()) {
    case "completed":
      return "success";
    case "cancelled":
      return "destructive";
    case "draft":
    case "scheduled":
      return "secondary";
    default:
      return "default";
  }
}

function variantRouteStop(status: string): Variant {
  switch (status.trim()) {
    case "completed":
    case "returned":
      return "success";
    case "skipped":
      return "warning";
    case "not_started":
    case "travelling":
      return "secondary";
    default:
      return "default";
  }
}

function variantPayment(status: string): Variant {
  const s = status.trim().toLowerCase();
  if (["succeeded", "paid"].includes(s)) return "success";
  if (["failed", "canceled", "cancelled", "refunded"].includes(s)) return "destructive";
  if (["pending", "processing", "requires_action", "requires_payment_method"].includes(s)) return "warning";
  if (["unpaid", "part_paid", "overdue", "written_off"].includes(s)) return "warning";
  return "secondary";
}

export type UnifiedStatusBadgeProps =
  | { kind: "booking"; status?: string | null; className?: string }
  | { kind: "order"; status?: string | null; className?: string }
  | { kind: "invoice"; status?: string | null; className?: string }
  | { kind: "knife"; status?: string | null; className?: string }
  | { kind: "route"; status?: string | null; className?: string }
  | { kind: "route_stop"; status?: string | null; className?: string }
  | { kind: "payment"; status?: string | null; className?: string };

export function StatusBadge(props: UnifiedStatusBadgeProps) {
  const raw = props.status?.trim() ?? "";
  const { className, kind } = props;

  if (raw === "") {
    return (
      <Badge variant="outline" className={className}>
        —
      </Badge>
    );
  }

  switch (kind) {
    case "booking":
      return (
        <Badge variant={variantBooking(raw)} className={className}>
          {bookingStatusLabel(raw)}
        </Badge>
      );
    case "order":
      return (
        <Badge variant={variantOrder(raw)} className={className}>
          {orderStatusLabel(raw)}
        </Badge>
      );
    case "invoice":
      return (
        <Badge variant={variantInvoice(raw)} className={className}>
          {invoiceStatusLabel(raw)}
        </Badge>
      );
    case "knife":
      return (
        <Badge variant={variantKnife(raw)} className={className}>
          {knifeStatusLabel(raw)}
        </Badge>
      );
    case "route":
      return (
        <Badge variant={variantRoute(raw)} className={className}>
          {routeStatusLabel(raw)}
        </Badge>
      );
    case "route_stop":
      return (
        <Badge variant={variantRouteStop(raw)} className={className}>
          {routeStopStatusLabel(raw)}
        </Badge>
      );
    case "payment":
      return (
        <Badge variant={variantPayment(raw)} className={className}>
          {paymentAttemptLabel(raw)}
        </Badge>
      );
  }
}
