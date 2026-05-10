import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

import type { BadgeProps } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
    case "converted_to_order":
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
    case "returned":
      return "success";
    case "cancelled":
      return "destructive";
    case "draft":
    case "received":
      return "secondary";
    case "invoiced":
      return "warning";
    case "inspection":
      return "warning";
    case "quality_check":
      return "warning";
    case "in_progress":
      return "default";
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
    case "sent":
      return "warning";
    default:
      return "default";
  }
}

function variantKnife(status: string): Variant {
  switch (status.trim()) {
    case "issue_reported":
    case "cancelled":
      return "destructive";
    case "sharpened":
    case "returned":
    case "quality_checked":
      return "success";
    case "logged":
    case "received":
    case "inspected":
      return "secondary";
    case "sharpening":
      return "warning";
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
    case "collected":
      return "success";
    case "skipped":
      return "warning";
    case "not_started":
    case "travelling":
    case "arrived":
      return "secondary";
    case "in_sharpening":
      return "warning";
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

type WithClassName = { className?: string };

export function StatusBadgeGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const cells = Children.toArray(children).filter((c) => c != null);
  if (cells.length === 0) {
    return null;
  }

  const pillStretch = "min-w-0 w-full justify-center";

  return (
    <div
      className={cn("flex max-w-full flex-nowrap items-stretch gap-2", className)}
      role="group"
      aria-label="Status"
    >
      {cells.map((child, i) => (
        <div key={i} className="flex min-h-0 min-w-0 flex-1 basis-0 items-stretch justify-center">
          {isValidElement(child)
            ? cloneElement(child as ReactElement<WithClassName>, {
                className: cn((child as ReactElement<WithClassName>).props.className, pillStretch),
              })
            : child}
        </div>
      ))}
    </div>
  );
}
