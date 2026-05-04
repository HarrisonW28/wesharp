"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Banknote,
  Building2,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Landmark,
  ListTodo,
  MapPinned,
  Receipt,
  Repeat2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ACTIONS: { href: string; label: string; hint: string; icon: typeof CalendarDays }[] = [
  { href: "/admin/work-queue", label: "Work queue", hint: "Role-aware next steps", icon: ListTodo },
  { href: "/admin/bookings", label: "Bookings", hint: "Confirm windows & routes", icon: CalendarDays },
  { href: "/admin/crm", label: "Accounts", hint: "CRM & site details", icon: Building2 },
  { href: "/admin/orders", label: "Orders", hint: "Workshop & fulfilment", icon: ClipboardList },
  { href: "/admin/routes/today", label: "Today’s routes", hint: "Drivers & stops", icon: MapPinned },
  { href: "/admin/invoices", label: "Invoices", hint: "Issue & chase payment", icon: Receipt },
  { href: "/admin/finance", label: "Finance", hint: "Cash & receipts", icon: Landmark },
  { href: "/admin/payments", label: "Payments", hint: "Match bank & receipts", icon: Banknote },
  { href: "/admin/subscriptions", label: "Subscriptions", hint: "Plans on accounts", icon: Repeat2 },
];

/** Compact “next step” grid for the operations dashboard (Sprint 11.2). Collapsed by default to reduce noise. */
export function AdminQuickActionsCard() {
  const [open, setOpen] = useState(false);

  return (
    <Card className="border-primary/15 bg-gradient-to-br from-primary/5 via-background to-background">
      <CardHeader className={cn("space-y-0", open ? "pb-0" : "pb-4")}>
        <Button
          type="button"
          variant="ghost"
          className="h-auto w-full min-w-0 justify-between gap-3 rounded-lg px-0 py-1 text-left font-normal hover:bg-muted/40"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="admin-quick-actions-panel"
          id="admin-quick-actions-trigger"
        >
          <span className="min-w-0 flex-1 space-y-1.5 pr-1 text-left">
            <span className="block text-balance text-base font-semibold leading-snug tracking-tight">
              Where to go next
            </span>
            <span className="block break-words text-sm leading-snug text-muted-foreground">
              Jump straight into day-to-day work — same permissions as the sidebar.
            </span>
          </span>
          <ChevronDown
            className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
            aria-hidden
          />
        </Button>
      </CardHeader>
      {open ? (
        <CardContent
          className="pt-4 pb-4 sm:pb-5"
          id="admin-quick-actions-panel"
          role="region"
          aria-labelledby="admin-quick-actions-trigger"
        >
          <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
            {ACTIONS.map(({ href, label, hint, icon: Icon }) => (
              <li key={href} className="min-w-0">
                <Link
                  href={href}
                  className="flex min-h-[4.25rem] min-w-0 flex-col rounded-lg border bg-card/80 p-3 shadow-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex items-start gap-2 text-sm font-medium text-foreground">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0 flex-1 break-words leading-snug">{label}</span>
                    <ArrowRight className="mt-0.5 ml-auto h-3.5 w-3.5 shrink-0 opacity-40" aria-hidden />
                  </span>
                  <span className="mt-1 break-words text-xs leading-snug text-muted-foreground">{hint}</span>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      ) : null}
    </Card>
  );
}
