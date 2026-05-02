"use client";

import { cn } from "@/lib/utils";

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export type CustomerActivityStep = {
  at: string | null;
  label: string;
};

type Props = {
  title?: string;
  items: CustomerActivityStep[];
  emptyHint?: string;
  className?: string;
};

/** Customer-safe vertical timeline (timestamp + label only). */
export function CustomerActivityTimeline({ title = "Activity", items, emptyHint, className }: Props) {
  return (
    <div className={cn("rounded-xl border bg-card p-4 shadow-sm", className)}>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{emptyHint ?? "No recorded milestones yet."}</p>
      ) : (
        <ol className="mt-4 space-y-4">
          {items.map((step, idx) => (
            <li key={`${step.at ?? "x"}-${idx}`} className="flex gap-3 border-l-2 border-border pl-3 pb-1 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug">{step.label}</p>
                <p className="mt-1 text-xs tabular-nums text-muted-foreground">{formatWhen(step.at)}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
