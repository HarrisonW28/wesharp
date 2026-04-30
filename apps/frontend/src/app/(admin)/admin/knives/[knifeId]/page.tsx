"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { KnifeDetailResponseSchema } from "@/lib/api/admin-knives-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { availableWorkflowSteps, canReportIssue } from "@/lib/knife-status-workflow";

import { KnifePhotoGalleryCard } from "@/components/admin/KnifePhotoGalleryCard";
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

const PHOTO_KINDS = ["general", "damage", "before", "after"] as const;

export default function AdminKnifeDetailPage() {
  const params = useParams<{ knifeId: string }>();
  const knifeId = params.knifeId;
  const admin = useAdminApi();
  const queryClient = useQueryClient();
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueNotes, setIssueNotes] = useState("");
  const [attrDraft, setAttrDraft] = useState({
    knife_type: "",
    label: "",
    brand: "",
    description: "",
    condition_before: "",
    notes: "",
  });

  const [photoCaption, setPhotoCaption] = useState("");
  const [photoKind, setPhotoKind] = useState<string>("general");
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

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
    if (!knifeQuery.data) {
      return;
    }
    const d = knifeQuery.data;
    setAttrDraft({
      knife_type: typeof d.knife_type === "string" ? d.knife_type : "",
      label: typeof d.label === "string" ? d.label : "",
      brand: typeof d.brand === "string" ? d.brand : "",
      description: typeof d.description === "string" ? d.description : "",
      condition_before: typeof d.condition_before === "string" ? d.condition_before : "",
      notes: typeof d.notes === "string" ? d.notes : "",
    });
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
      fd.append("photo_kind", photoKind);
      const c = photoCaption.trim();
      if (c !== "") {
        fd.append("caption", c);
      }
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
      setPhotoUploadError(null);
      setPhotoCaption("");
      queryClient.setQueryData(["admin-knife", knifeId], data);
      invalidateKnifeLists();
    },
    onError: (e: Error) => {
      setPhotoUploadError(e.message);
      toast.error(e.message);
    },
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
          knife_type: attrDraft.knife_type.trim() || undefined,
          label: attrDraft.label.trim() || undefined,
          brand: attrDraft.brand.trim() || undefined,
          description: attrDraft.description.trim() || undefined,
          condition_before: attrDraft.condition_before.trim() || undefined,
          notes: attrDraft.notes.trim() || undefined,
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
              <dd className="mt-1">
                <Input
                  value={attrDraft.knife_type}
                  onChange={(e) => setAttrDraft((a) => ({ ...a, knife_type: e.target.value }))}
                  placeholder="e.g. chefs, paring"
                />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Label</dt>
              <dd className="mt-1">
                <Input
                  value={attrDraft.label}
                  onChange={(e) => setAttrDraft((a) => ({ ...a, label: e.target.value }))}
                  placeholder="Readable name"
                />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Brand</dt>
              <dd className="mt-1">
                <Input
                  value={attrDraft.brand}
                  onChange={(e) => setAttrDraft((a) => ({ ...a, brand: e.target.value }))}
                  placeholder="Optional"
                />
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Description</dt>
              <dd className="mt-1">
                <Textarea
                  value={attrDraft.description}
                  onChange={(e) => setAttrDraft((a) => ({ ...a, description: e.target.value }))}
                  rows={2}
                  className="resize-y"
                />
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Condition (before)</dt>
              <dd className="mt-1">
                <Textarea
                  value={attrDraft.condition_before}
                  onChange={(e) => setAttrDraft((a) => ({ ...a, condition_before: e.target.value }))}
                  rows={2}
                  className="resize-y"
                />
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Notes</dt>
              <dd className="mt-1">
                <Textarea
                  value={attrDraft.notes}
                  onChange={(e) => setAttrDraft((a) => ({ ...a, notes: e.target.value }))}
                  rows={2}
                  className="resize-y"
                />
              </dd>
            </div>
            <div className="sm:col-span-2">
              <Button size="sm" type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Save attributes
              </Button>
            </div>
          </dl>
          <Separator className="my-4" />
          <div className="text-xs font-semibold uppercase text-muted-foreground">Photos</div>
          <p className="mt-2 text-sm text-muted-foreground">
            Workshop images are stored privately. JPEG, PNG or WebP, up to about 8&nbsp;MB. Use the camera on supported phones; gallery upload works everywhere.
          </p>
          <div className="mt-3 space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label htmlFor="photo-kind">Purpose</Label>
                <select
                  id="photo-kind"
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={photoKind}
                  onChange={(e) => setPhotoKind(e.target.value)}
                  disabled={photoMutation.isPending}
                >
                  {PHOTO_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="photo-cap">Caption (optional)</Label>
                <Input
                  id="photo-cap"
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  disabled={photoMutation.isPending}
                  placeholder="Short note"
                />
              </div>
            </div>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="sr-only"
              disabled={photoMutation.isPending}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) {
                  setPhotoUploadError(null);
                  photoMutation.mutate(f);
                }
              }}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={photoMutation.isPending}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) {
                  setPhotoUploadError(null);
                  photoMutation.mutate(f);
                }
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={photoMutation.isPending}
                onClick={() => cameraInputRef.current?.click()}
              >
                {photoMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                Take photo
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={photoMutation.isPending}
                onClick={() => galleryInputRef.current?.click()}
              >
                Choose file
              </Button>
            </div>
            {photoUploadError !== null ? (
              <p className="text-sm text-destructive" role="alert">
                {photoUploadError}
              </p>
            ) : null}
            {photoMutation.isPending ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Uploading…
              </p>
            ) : null}
          </div>
          <div className="mt-6">
            <div className="text-sm font-medium">Gallery</div>
            {(k.photos ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No photos yet — add one above.</p>
            ) : (
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(k.photos ?? []).map((p) => (
                  <KnifePhotoGalleryCard key={p.id} photo={p} knifeId={knifeId} admin={admin} />
                ))}
              </ul>
            )}
          </div>
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
