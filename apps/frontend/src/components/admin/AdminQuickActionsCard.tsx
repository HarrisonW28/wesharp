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
  Compass,
  Landmark,
  ListTodo,
  MapPinned,
  Receipt,
  Repeat2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ACTIONS: {
  href: string;
  label: string;
  hint: string;
  icon: typeof CalendarDays;
}[] = [
  {
    href: "/admin/work-queue",
    label: "Work queue",
    hint: "Tasks picked for your role — nothing extra to hunt through.",
    icon: ListTodo,
  },
  {
    href: "/admin/bookings",
    label: "Bookings",
    hint: "Visit slots, pickups, and what’s booked in.",
    icon: CalendarDays,
  },
  {
    href: "/admin/crm",
    label: "Accounts",
    hint: "Companies you look after and how to reach them.",
    icon: Building2,
  },
  {
    href: "/admin/orders",
    label: "Orders",
    hint: "Knives moving through sharpen and delivery.",
    icon: ClipboardList,
  },
  {
    href: "/admin/routes/today",
    label: "Today’s routes",
    hint: "Who’s out today and where they’re stopping.",
    icon: MapPinned,
  },
  {
    href: "/admin/invoices",
    label: "Invoices",
    hint: "What you’ve sent out and what’s still owed.",
    icon: Receipt,
  },
  {
    href: "/admin/finance",
    label: "Finance",
    hint: "Income and balances at a glance.",
    icon: Landmark,
  },
  {
    href: "/admin/payments",
    label: "Payments",
    hint: "Money received and matched to work.",
    icon: Banknote,
  },
  {
    href: "/admin/subscriptions",
    label: "Subscriptions",
    hint: "Recurring plans tied to customer accounts.",
    icon: Repeat2,
  },
];

/** Compact “next step” grid for the operations dashboard (Sprint 11.2). Collapsed by default to reduce noise. */
export function AdminQuickActionsCard() {
  const [open, setOpen] = useState(false);

  return (
    <Card className="min-w-0 overflow-hidden border-primary/15 bg-gradient-to-br from-primary/5 via-background to-background">
      <CardHeader className={cn("min-w-0 space-y-0", open ? "pb-0" : "pb-4")}>
        <Button
          type="button"
          variant="ghost"
          className="h-auto w-full min-w-0 flex-col items-stretch gap-2 rounded-lg px-0 py-1 text-left font-normal hover:bg-muted/40"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="admin-quick-actions-panel"
          id="admin-quick-actions-trigger"
        >
          <span className="flex w-full min-w-0 items-center gap-2 sm:gap-3">
            <Compass className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0 flex-1 text-base font-semibold leading-snug tracking-tight text-balance">
              Where to go next
            </span>
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 self-center text-muted-foreground transition-transform duration-200",
                open && "rotate-180",
              )}
              aria-hidden
            />
          </span>
          <span className="block pl-7 text-left text-sm leading-snug text-muted-foreground sm:pl-[calc(1.25rem+0.75rem)]">
            Same destinations as the sidebar — open what you’re allowed to see.
          </span>
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
              <li key={href} className="flex min-h-0 min-w-0">
                <Link
                  href={href}
                  className="flex h-full min-h-[6.75rem] w-full flex-col justify-between gap-2 rounded-lg border bg-card/80 p-3 shadow-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[7rem]"
                >
                  <span className="flex min-h-[2.75rem] items-start gap-2">
                    <Icon
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      aria-hidden
                    />
                    <span className="flex min-w-0 flex-1 items-start justify-between gap-1.5">
                      <span className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                        {label}
                      </span>
                      <ArrowRight
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-40"
                        aria-hidden
                      />
                    </span>
                  </span>
                  <span className="line-clamp-2 text-xs leading-snug text-muted-foreground">
                    {hint}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      ) : null}
    </Card>
  );
}
