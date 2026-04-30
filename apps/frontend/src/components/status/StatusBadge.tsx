import { Badge } from "@/components/ui/badge";
import { bookingStatusLabel } from "@/lib/helpers/status-helpers";

function variantFor(status: string): "default" | "secondary" | "success" | "warning" | "destructive" | "outline" {
  switch (status) {
    case "completed":
      return "success";
    case "confirmed":
    case "in_progress":
      return "default";
    case "requested":
      return "secondary";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

type StatusBadgeProps = {
  status: string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge variant={variantFor(status)}>{bookingStatusLabel(status)}</Badge>;
}
