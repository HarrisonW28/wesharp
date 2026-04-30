"use client";

import { Badge } from "@/components/ui/badge";

import type { CompanyRow } from "@/lib/api/admin-crm-schema";

const VARIANT: Partial<Record<CompanyRow["company_status"], React.ComponentProps<typeof Badge>["variant"]>> = {
  active: "secondary",
  at_risk: "destructive",
  lost: "outline",
};

const LABELS: Partial<Record<CompanyRow["company_status"], string>> = {
  lead: "Lead",
  trial_booked: "Trial booked",
  trial_completed: "Trial completed",
  active: "Active",
  at_risk: "At risk",
  lost: "Lost",
  do_not_contact: "DNC",
};

export function CompanyStatusBadge({ status }: { status: CompanyRow["company_status"] }) {
  return (
    <Badge variant={VARIANT[status] ?? "outline"} className="capitalize">
      {LABELS[status] ?? status.replace(/_/g, " ")}
    </Badge>
  );
}
