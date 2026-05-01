"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function NotificationHistoryPlaceholder(props: { scopeLabel: string }) {
  return (
    <Card className="rounded-xl border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4 text-muted-foreground" aria-hidden />
          Notification history
        </CardTitle>
        <CardDescription className="text-sm">
          Delivery tracking for {props.scopeLabel}. This is a placeholder — the history list will be added in a later sprint.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
        <p>
          Emails are queued and logged with idempotency, but we haven’t surfaced the delivery timeline in the admin UI yet.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/admin/audit">Open audit log</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

