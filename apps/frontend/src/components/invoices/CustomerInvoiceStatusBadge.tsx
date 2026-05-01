import type { BadgeProps } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  customerLabel,
  hint,
  className,
}: {
  status?: string | null;
  /** Server-computed label (payment due, partially paid, etc.) — overrides local mapping when set. */
  customerLabel?: string | null;
  hint?: string | null;
  className?: string;
}) {
  const raw = status?.trim() ?? "";
  const label =
    customerLabel != null && customerLabel.trim() !== ""
      ? customerLabel.trim()
      : raw === ""
        ? ""
        : customerInvoiceStatusLabel(raw);

  if (label === "" && raw === "") {
    return (
      <Badge variant="outline" className={className}>
        —
      </Badge>
    );
  }

  const badge = (
    <Badge variant={raw === "" ? "outline" : variantForInvoiceStatus(raw)} className={className}>
      {label}
    </Badge>
  );

  const h = hint?.trim() ?? "";
  if (h === "") {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent className="max-w-xs text-left">{h}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
