import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Building2,
  CalendarDays,
  ClipboardList,
  Landmark,
  MapPinned,
  Receipt,
  Repeat2,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ACTIONS: { href: string; label: string; hint: string; icon: typeof CalendarDays }[] = [
  { href: "/admin/bookings", label: "Bookings", hint: "Confirm windows & routes", icon: CalendarDays },
  { href: "/admin/crm", label: "Accounts", hint: "CRM & site details", icon: Building2 },
  { href: "/admin/orders", label: "Orders", hint: "Workshop & fulfilment", icon: ClipboardList },
  { href: "/admin/routes/today", label: "Today’s routes", hint: "Drivers & stops", icon: MapPinned },
  { href: "/admin/invoices", label: "Invoices", hint: "Issue & chase payment", icon: Receipt },
  { href: "/admin/finance", label: "Finance", hint: "Cash & receipts", icon: Landmark },
  { href: "/admin/payments", label: "Payments", hint: "Match bank & receipts", icon: Banknote },
  { href: "/admin/subscriptions", label: "Subscriptions", hint: "Plans on accounts", icon: Repeat2 },
];

/** Compact “next step” grid for the operations dashboard (Sprint 11.2). */
export function AdminQuickActionsCard() {
  return (
    <Card className="border-primary/15 bg-gradient-to-br from-primary/5 via-background to-background">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Where to go next</CardTitle>
        <CardDescription className="text-sm">
          Jump straight into day-to-day work — same permissions as the sidebar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {ACTIONS.map(({ href, label, hint, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex min-h-[4.25rem] flex-col rounded-lg border bg-card/80 p-3 shadow-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  {label}
                  <ArrowRight className="ml-auto h-3.5 w-3.5 opacity-40" aria-hidden />
                </span>
                <span className="mt-1 text-xs text-muted-foreground">{hint}</span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
