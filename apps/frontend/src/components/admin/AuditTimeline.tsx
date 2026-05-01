"use client";

import Link from "next/link";

import { adminHrefForAuditSubject } from "@/lib/admin-audit-links";

export type AuditTimelineRow = {
  id: string;
  at?: string | null;
  action: string;
  action_label?: string;
  actor?: { id?: string | null; name?: string | null; email?: string | null } | null;
  actor_name?: string | null;
  subject_type?: string;
  subject_id?: string;
  payload?: unknown;
  changed_fields?: string[] | null;
  ip_address?: string | null;
  request_id?: string | null;
  company?: { id: string; name: string } | null;
};

function formatWhen(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  try {
    return new Date(iso).toLocaleString("en-GB");
  } catch {
    return iso;
  }
}

function actionTitle(row: AuditTimelineRow): string {
  if (row.action_label && row.action_label.trim() !== "") {
    return row.action_label;
  }
  return row.action.replace(/\./g, " ").replace(/_/g, " ");
}

function actorLine(row: AuditTimelineRow): string {
  const n = row.actor?.name ?? row.actor_name;
  const e = row.actor?.email;
  if (n && e) {
    return `${n} · ${e}`;
  }
  if (n) {
    return n;
  }
  return "—";
}

export function AuditTimeline({
  title,
  items,
  emptyLabel = "No audit entries yet.",
  showPayload = true,
  showMeta = true,
}: {
  title?: string;
  items: AuditTimelineRow[];
  emptyLabel?: string;
  showPayload?: boolean;
  showMeta?: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="space-y-2">
        {title ? <h3 className="text-base font-semibold">{title}</h3> : null}
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {title ? <h3 className="text-base font-semibold">{title}</h3> : null}
      <ul className="max-h-[min(28rem,70vh)] space-y-2 overflow-y-auto text-sm">
        {items.map((row) => {
          const href = adminHrefForAuditSubject(row.subject_type, row.subject_id);
          return (
            <li key={row.id} className="rounded-md border bg-muted/10 px-3 py-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">{actionTitle(row)}</span>
                <span className="text-xs text-muted-foreground">{formatWhen(row.at)}</span>
              </div>
              <div className="text-xs text-muted-foreground">by {actorLine(row)}</div>
              {row.company ? (
                <div className="mt-1 text-xs text-muted-foreground">
                  Company:{" "}
                  <Link href={`/admin/crm/${row.company.id}`} className="text-primary underline underline-offset-2">
                    {row.company.name}
                  </Link>
                </div>
              ) : null}
              {href ? (
                <div className="mt-1 text-xs">
                  <Link href={href} className="text-primary underline underline-offset-2">
                    Open related record
                  </Link>
                </div>
              ) : null}
              {row.changed_fields && row.changed_fields.length > 0 ? (
                <div className="mt-1 text-xs text-muted-foreground">
                  Changed: <span className="font-mono text-foreground">{row.changed_fields.join(", ")}</span>
                </div>
              ) : null}
              {showMeta && (row.request_id || row.ip_address) ? (
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  {row.request_id ? (
                    <span>
                      Request: <span className="font-mono text-foreground">{row.request_id}</span>
                    </span>
                  ) : null}
                  {row.ip_address ? (
                    <span>
                      IP: <span className="font-mono text-foreground">{row.ip_address}</span>
                    </span>
                  ) : null}
                </div>
              ) : null}
              {showPayload && row.payload !== undefined && row.payload !== null ? (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Details (sanitised)</summary>
                  <pre className="mt-1 max-h-40 overflow-auto rounded bg-muted p-2 whitespace-pre-wrap">
                    {typeof row.payload === "string" ? row.payload : JSON.stringify(row.payload, null, 2)}
                  </pre>
                </details>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
