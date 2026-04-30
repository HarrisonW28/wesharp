"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { KnifeDetailResponseSchema } from "@/lib/api/admin-knives-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { availableWorkflowSteps, canReportIssue } from "@/lib/knife-status-workflow";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

function formatTimelineEntry(entry: Record<string, unknown>): string {
  const action = typeof entry.action === "string" ? entry.action : "event";
  const payload = entry.payload && typeof entry.payload === "object" ? (entry.payload as Record<string, unknown>) : {};
  const from = payload.from !== undefined ? String(payload.from) : "";
  const to = payload.to !== undefined ? String(payload.to) : "";

  if (from && to) {
    return `${action}: ${from} → ${to}`;
  }

  return action;
}

export default function AdminKnifeDetailPage() {
  const params = useParams<{ knifeId: string }>();
  const knifeId = params.knifeId;
  const admin = useAdminApi();
  const queryClient = useQueryClient();
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueNotes, setIssueNotes] = useState("");
  const [knifeTypeDraft, setKnifeTypeDraft] = useState("");

  const invalidateKnifeLists = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-knives"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-knife", knifeId] });
    void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
  };

  const parseKnifeDetail = async (body: unknown) => {
    const parsed = KnifeDetailResponseSchema.safeParse(body);
    if (!parsed.success) {
      throw new Error("Unexpected knife payload.");
    }
    return parsed.data.data;
  };

  const knifeQuery = useQuery({
    queryKey: ["admin-knife", knifeId],
    enabled: Boolean(knifeId),
    queryFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/knives/${knifeId}`);
      if (!res.ok) {
        throw new Error(res.message);
      }

      return parseKnifeDetail(res.data);
    },
  });

  useEffect(() => {
    const t = knifeQuery.data?.knife_type;

    setKnifeTypeDraft(typeof t === "string" ? t : "");
  }, [knifeQuery.data]);

  const mutateTransition = async (pathSegment: string) => {
    const res = await admin.json<unknown>(`/api/admin/knives/${knifeId}/${pathSegment}`, {
      method: "POST",
      body: "{}",
    });

    if (!res.ok) {
      throw new Error(res.message);
    }

    return parseKnifeDetail(res.data);
  };

  const mutInspected = useMutation({
    mutationFn: async () => mutateTransition("mark-inspected"),
    onSuccess: () => {
      toast.success("Status updated.");
      invalidateKnifeLists();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const mutSharpened = useMutation({
    mutationFn: async () => mutateTransition("mark-sharpened"),
    onSuccess: () => {
      toast.success("Status updated.");
      invalidateKnifeLists();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const mutQC = useMutation({
    mutationFn: async () => mutateTransition("mark-quality-checked"),
    onSuccess: () => {
      toast.success("Status updated.");
      invalidateKnifeLists();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const mutReturned = useMutation({
    mutationFn: async () => mutateTransition("mark-returned"),
    onSuccess: () => {
      toast.success("Status updated.");
      invalidateKnifeLists();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pathToMutation = {
    "mark-inspected": mutInspected,
    "mark-sharpened": mutSharpened,
    "mark-quality-checked": mutQC,
    "mark-returned": mutReturned,
  } as const;

  const photoMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await admin.json<unknown>(`/api/admin/knives/${knifeId}/photos`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = KnifeDetailResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected knife payload after upload.");
      }
      return parsed.data.data;
    },
    onSuccess: (data) => {
      toast.success("Photo uploaded.");
      queryClient.setQueryData(["admin-knife", knifeId], data);
      invalidateKnifeLists();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const issueMutation = useMutation({
    mutationFn: async () => {
      const trimmed = issueNotes.trim();
      if (trimmed.length < 2) {
        throw new Error("Describe the issue (2+ characters).");
      }

      const res = await admin.json<unknown>(`/api/admin/knives/${knifeId}/report-issue`, {
        method: "POST",
        body: JSON.stringify({ damage_notes: trimmed }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }

      await parseKnifeDetail(res.data);
    },
    onSuccess: () => {
      toast.success("Issue recorded.");
      setIssueOpen(false);
      setIssueNotes("");
      invalidateKnifeLists();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await admin.json(`/api/admin/knives/${knifeId}`, {
        method: "PUT",
        body: JSON.stringify({
          knife_type: knifeTypeDraft || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(res.message);
      }

      void queryClient.invalidateQueries({ queryKey: ["admin-knife", knifeId] });

      return res.data;
    },
    onSuccess: () => toast.success("Knife saved."),
    onError: (e: Error) => toast.error(e.message),
  });

  if (knifeQuery.isPending) {
    return (
      <>
        <Breadcrumbs crumbs={[{ label: "Knives", href: "/admin/knives" }, { label: "…" }]} />
        <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        </div>
      </>
    );
  }

  if (knifeQuery.isError) {
    return (
      <>
        <Breadcrumbs crumbs={[{ label: "Knives", href: "/admin/knives" }, { label: "Error" }]} />
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          <p className="font-medium text-destructive">{(knifeQuery.error as Error).message}</p>
          <Button className="mt-3" type="button" variant="outline" size="sm" onClick={() => void knifeQuery.refetch()}>
            Retry
          </Button>
        </div>
      </>
    );
  }

  if (!knifeQuery.data) {
    return (
      <>
        <Breadcrumbs crumbs={[{ label: "Knives", href: "/admin/knives" }, { label: "Not found" }]} />
        <p className="text-sm text-muted-foreground">Knife could not be loaded.</p>
      </>
    );
  }

  const k = knifeQuery.data;

  const statusStr = k.status ?? "";
  const steps = availableWorkflowSteps(statusStr);

  const orderLink = k.order_summary?.id ? (
    <Button asChild variant="link" className="h-auto px-0">
      <Link href={`/admin/orders/${k.order_summary.id}`}>Open order #{k.order_summary.id.slice(0, 8)}…</Link>
    </Button>
  ) : null;

  return (
    <>
      <Breadcrumbs
        crumbs={[
          { label: "Knives", href: "/admin/knives" },
          { label: k.tag_id ?? "Blade" },
        ]}
      />
      <PageHeader
        title={k.tag_id ?? "Knife"}
        description={`${statusStr.replace(/_/g, " ")}${typeof k.company?.name === "string" ? ` · ${k.company.name}` : ""}`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Identification</div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Tag</dt>
              <dd className="font-mono text-xs">{k.tag_id}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Type</dt>
              <dd>
                <Input
                  value={knifeTypeDraft}
                  onChange={(e) => setKnifeTypeDraft(e.target.value)}
                  className="mt-1"
                  placeholder="e.g. chefs, paring"
                />
                <Button size="sm" className="mt-2" type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                  {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  Save attributes
                </Button>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Description</dt>
              <dd>{k.description ?? "—"}</dd>
            </div>
          </dl>
          <Separator className="my-4" />
          <div className="text-xs font-semibold uppercase text-muted-foreground">Photos</div>
          <p className="mt-2 text-sm text-muted-foreground">
            Condition shots for the workshop file. Images stay on our servers; customer-facing download is not wired in this MVP.
          </p>
          <div className="mt-3">
            <Label htmlFor="knife-photo">Upload or capture</Label>
            <Input
              id="knife-photo"
              type="file"
              accept="image/*"
              capture="environment"
              className="mt-1 cursor-pointer"
              disabled={photoMutation.isPending}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) {
                  photoMutation.mutate(f);
                }
              }}
            />
            {photoMutation.isPending ? (
              <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Uploading…
              </p>
            ) : null}
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {(k.photos ?? []).length === 0 ? (
              <li className="text-muted-foreground">No photos yet.</li>
            ) : (
              (k.photos ?? []).map((p) => (
                <li key={p.id} className="rounded-md border bg-muted/30 px-3 py-2">
                  <div className="font-medium">{p.file?.original_filename ?? "Image"}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.file?.byte_size != null ? `${Math.round(p.file.byte_size / 1024)} KB` : "—"}
                    {p.caption ? ` · ${p.caption}` : ""}
                  </div>
                </li>
              ))
            )}
          </ul>
          <Separator className="my-4" />
          <div className="text-xs font-semibold uppercase text-muted-foreground">Order link</div>
          <div className="mt-2 text-sm">{orderLink ?? "No order linked."}</div>
          <Separator className="my-4" />
          <div className="text-xs font-semibold uppercase text-muted-foreground">Responsible users</div>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Sharpened</dt>
              <dd>{k.sharpened_by?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">QC</dt>
              <dd>{k.quality_checked_by?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Returned</dt>
              <dd>{k.returned_by?.name ?? "—"}</dd>
            </div>
          </dl>
        </Card>

        <Card className="space-y-3 p-4">
          <div className="text-sm font-semibold">Workflow</div>
          <div className="flex flex-wrap gap-2">
            {steps.map((step) => {
              const mutation = pathToMutation[step.path];
              const busy = mutation.isPending;

              return (
                <Button
                  key={step.path}
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => mutation.mutate()}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  {step.label}
                </Button>
              );
            })}
            {canReportIssue(statusStr) ? (
              <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
                <DialogTrigger asChild>
                  <Button type="button" size="sm" variant="outline">
                    Report issue
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Report a workshop issue</DialogTitle>
                  </DialogHeader>
                  <Label htmlFor="issue">Damage / issue notes</Label>
                  <Textarea
                    id="issue"
                    value={issueNotes}
                    onChange={(e) => setIssueNotes(e.target.value)}
                    rows={5}
                    placeholder="Describe the defect, wear, or customer concern."
                  />
                  <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={() => setIssueOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="button" disabled={issueMutation.isPending} onClick={() => issueMutation.mutate()}>
                      {issueMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                      Submit issue
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : null}
          </div>
          {!steps.length && !canReportIssue(statusStr) ? (
            <p className="text-xs text-muted-foreground">Terminal state — only audit history below.</p>
          ) : null}
        </Card>
      </div>

      <Separator className="my-8" />

      <section>
        <h2 className="text-sm font-semibold">Damage reports</h2>
        <div className="mt-3 space-y-2">
          {(k.damage_reports ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">None recorded.</p>
          ) : (
            (k.damage_reports ?? []).map((r) => {
              const rid = typeof r.id === "string" ? r.id : String(r.id ?? "");
              const det = typeof r.details === "string" ? r.details : "";
              const sev = r.severity !== undefined ? String(r.severity) : "";

              const cre = typeof r.created_at === "string" ? r.created_at : "";

              return (
                <Card key={rid} className="p-3 text-sm">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{new Date(cre).toLocaleString()}</span>
                    {sev ? <Badge variant="outline">{sev}</Badge> : null}
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap font-sans text-sm">{det}</pre>
                </Card>
              );
            })
          )}
        </div>
      </section>

      <Separator className="my-8" />

      <section>
        <h2 className="text-sm font-semibold">Status timeline (audit)</h2>
        <ol className="mt-4 space-y-4 border-l-2 border-border pl-4">
          {(k.timeline ?? []).map((entry, idx) => {
            const record = entry as Record<string, unknown>;
            const actor = record.actor && typeof record.actor === "object" ? (record.actor as { name?: string }) : null;
            const at = typeof record.created_at === "string" ? record.created_at : "";

            return (
              <li key={idx} className="relative text-sm">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" aria-hidden />
                <div className="font-medium">{formatTimelineEntry(record)}</div>
                <div className="text-xs text-muted-foreground">{new Date(at).toLocaleString()}</div>
                {actor?.name ? <div className="text-xs">By {actor.name}</div> : null}
              </li>
            );
          })}
        </ol>
        {(k.timeline ?? []).length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No audit rows yet.</p> : null}
      </section>
    </>
  );
}
