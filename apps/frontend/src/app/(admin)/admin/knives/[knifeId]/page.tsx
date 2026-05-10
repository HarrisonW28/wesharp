"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { KnifeDetailResponseSchema } from "@/lib/api/admin-knives-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { availableWorkflowSteps, canReportIssue, isRiskyKnifeTransition } from "@/lib/knife-status-workflow";

import { KnifePhotoGalleryCard } from "@/components/admin/KnifePhotoGalleryCard";
import { WorkshopEvidenceSection } from "@/components/admin/WorkshopEvidenceSection";
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

const DAMAGE_SEVERITIES = [
  { value: "minor", label: "Minor" },
  { value: "moderate", label: "Moderate" },
  { value: "needs_attention", label: "Needs attention" },
  { value: "severe", label: "Severe" },
] as const;

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

  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [inspCondition, setInspCondition] = useState("");
  const [inspNotes, setInspNotes] = useState("");
  const [inspInternal, setInspInternal] = useState("");
  const [inspCustomerVisible, setInspCustomerVisible] = useState(false);

  const [damageOpen, setDamageOpen] = useState(false);
  const [dmgDescription, setDmgDescription] = useState("");
  const [dmgInternal, setDmgInternal] = useState("");
  const [dmgSeverity, setDmgSeverity] = useState("moderate");
  const [dmgCustomerVisible, setDmgCustomerVisible] = useState(false);
  const [dmgCustomerDesc, setDmgCustomerDesc] = useState("");

  const [editDamageOpen, setEditDamageOpen] = useState(false);
  const [editDamageId, setEditDamageId] = useState<string | null>(null);
  const [editDmgDescription, setEditDmgDescription] = useState("");
  const [editDmgInternal, setEditDmgInternal] = useState("");
  const [editDmgSeverity, setEditDmgSeverity] = useState("moderate");
  const [editDmgCustomerVisible, setEditDmgCustomerVisible] = useState(false);
  const [editDmgCustomerDesc, setEditDmgCustomerDesc] = useState("");
  const [editDmgStatus, setEditDmgStatus] = useState("open");

  const invalidateKnifeLists = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-knives"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-knife", knifeId] });
    void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    /** Order detail uses `["admin-order", id]` — distinct from list key `admin-orders`. */
    void queryClient.invalidateQueries({ queryKey: ["admin-order"] });
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

  const transitionMutation = useMutation({
    mutationFn: async (target_status: string) => {
      const res = await admin.json<unknown>(`/api/admin/knives/${knifeId}/transition`, {
        method: "POST",
        body: JSON.stringify({ target_status }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return parseKnifeDetail(res.data);
    },
    onSuccess: () => {
      toast.success("Blade status updated.");
      invalidateKnifeLists();
    },
    onError: (e: Error) => toast.error(e.message),
  });

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

  const inspectionMutation = useMutation({
    mutationFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/knives/${knifeId}/inspection`, {
        method: "POST",
        body: JSON.stringify({
          inspection_condition: inspCondition.trim() || undefined,
          inspection_notes: inspNotes.trim() || undefined,
          inspection_internal_notes: inspInternal.trim() || undefined,
          inspection_customer_visible: inspCustomerVisible,
        }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return parseKnifeDetail(res.data);
    },
    onSuccess: (data) => {
      toast.success("Inspection saved.");
      setInspectionOpen(false);
      queryClient.setQueryData(["admin-knife", knifeId], data);
      invalidateKnifeLists();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const damageCreateMutation = useMutation({
    mutationFn: async () => {
      const cur = queryClient.getQueryData<Awaited<ReturnType<typeof parseKnifeDetail>>>(["admin-knife", knifeId]);
      const oid = cur?.order_id ?? cur?.order_summary?.id;
      if (!oid) {
        throw new Error("Link this blade to an order before filing structured damage.");
      }
      const desc = dmgDescription.trim();
      if (desc.length < 2) {
        throw new Error("Description must be at least 2 characters.");
      }
      const res = await admin.json<unknown>(`/api/admin/knives/${knifeId}/damage-reports`, {
        method: "POST",
        body: JSON.stringify({
          order_id: oid,
          description: desc,
          severity: dmgSeverity,
          internal_notes: dmgInternal.trim() || undefined,
          customer_visible: dmgCustomerVisible,
          customer_description: dmgCustomerVisible ? dmgCustomerDesc.trim() : undefined,
        }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return parseKnifeDetail(res.data);
    },
    onSuccess: (data) => {
      toast.success("Damage report created.");
      setDamageOpen(false);
      setDmgDescription("");
      setDmgInternal("");
      setDmgSeverity("moderate");
      setDmgCustomerVisible(false);
      setDmgCustomerDesc("");
      queryClient.setQueryData(["admin-knife", knifeId], data);
      invalidateKnifeLists();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const damageUpdateMutation = useMutation({
    mutationFn: async () => {
      if (!editDamageId) {
        throw new Error("No report selected.");
      }
      const res = await admin.json<unknown>(`/api/admin/damage-reports/${editDamageId}`, {
        method: "PUT",
        body: JSON.stringify({
          description: editDmgDescription.trim(),
          severity: editDmgSeverity,
          internal_notes: editDmgInternal.trim() || undefined,
          customer_visible: editDmgCustomerVisible,
          customer_description: editDmgCustomerVisible ? editDmgCustomerDesc.trim() : undefined,
          status: editDmgStatus,
        }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return parseKnifeDetail(res.data);
    },
    onSuccess: (data) => {
      toast.success("Damage report updated.");
      setEditDamageOpen(false);
      setEditDamageId(null);
      queryClient.setQueryData(["admin-knife", knifeId], data);
      invalidateKnifeLists();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const damageArchiveMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const res = await admin.json<unknown>(`/api/admin/damage-reports/${reportId}/archive`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return parseKnifeDetail(res.data);
    },
    onSuccess: (data) => {
      toast.success("Damage report archived.");
      queryClient.setQueryData(["admin-knife", knifeId], data);
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
      <Link href={`/admin/orders/${k.order_summary.id}`}>Open linked order</Link>
    </Button>
  ) : null;

  const openEditDamage = (r: NonNullable<typeof k.damage_reports>[number]) => {
    setEditDamageId(typeof r.id === "string" ? r.id : String(r.id));
    setEditDmgDescription(String(r.description ?? r.details ?? ""));
    setEditDmgInternal(typeof r.internal_notes === "string" ? r.internal_notes : "");
    setEditDmgSeverity(typeof r.severity === "string" ? r.severity : "moderate");
    setEditDmgCustomerVisible(Boolean(r.customer_visible));
    setEditDmgCustomerDesc(typeof r.customer_description === "string" ? r.customer_description : "");
    setEditDmgStatus(typeof r.status === "string" ? r.status : "open");
    setEditDamageOpen(true);
  };

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
        titleRowEnd={
          <>
            {steps.map((step) => {
              const busy = transitionMutation.isPending;
              const variant = isRiskyKnifeTransition(step.target) ? "destructive" : "secondary";

              return (
                <Button
                  key={step.target}
                  type="button"
                  size="sm"
                  variant={variant}
                  disabled={busy}
                  onClick={() => {
                    if (isRiskyKnifeTransition(step.target)) {
                      const ok = window.confirm("Confirm this blade status change?");
                      if (!ok) {
                        return;
                      }
                    }
                    transitionMutation.mutate(step.target);
                  }}
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
          </>
        }
      />

      {!steps.length && !canReportIssue(statusStr) ? (
        <p className="text-xs text-muted-foreground">Terminal state — only audit history below.</p>
      ) : null}

      <div className="grid gap-6">
        <Card className="p-4">
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Workshop inspection</div>
            <Dialog
              open={inspectionOpen}
              onOpenChange={(open) => {
                setInspectionOpen(open);
                if (open && knifeQuery.data) {
                  const i = knifeQuery.data.inspection;
                  setInspCondition(typeof i?.condition === "string" ? i.condition : "");
                  setInspNotes(typeof i?.notes === "string" ? i.notes : "");
                  setInspInternal(typeof i?.internal_notes === "string" ? i.internal_notes : "");
                  setInspCustomerVisible(Boolean(i?.customer_visible));
                }
              }}
            >
              <DialogTrigger asChild>
                <Button type="button" size="sm" variant="outline">
                  {k.inspection?.inspected_at ? "Update inspection" : "Add inspection"}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Inspection &amp; intake notes</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <div>
                    <Label htmlFor="insp-condition">Condition</Label>
                    <Input
                      id="insp-condition"
                      value={inspCondition}
                      onChange={(e) => setInspCondition(e.target.value)}
                      placeholder="e.g. light patina, true edge"
                    />
                  </div>
                  <div>
                    <Label htmlFor="insp-notes">Inspection notes</Label>
                    <Textarea
                      id="insp-notes"
                      value={inspNotes}
                      onChange={(e) => setInspNotes(e.target.value)}
                      rows={3}
                      className="resize-y"
                      placeholder="May be shown to the customer when visibility is on."
                    />
                  </div>
                  <div>
                    <Label htmlFor="insp-internal">Internal notes</Label>
                    <Textarea
                      id="insp-internal"
                      value={inspInternal}
                      onChange={(e) => setInspInternal(e.target.value)}
                      rows={3}
                      className="resize-y"
                      placeholder="Never shown in the customer portal."
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={inspCustomerVisible}
                      onChange={(e) => setInspCustomerVisible(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    Show inspection notes to customer (portal)
                  </label>
                </div>
                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={() => setInspectionOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="button" disabled={inspectionMutation.isPending} onClick={() => inspectionMutation.mutate()}>
                    {inspectionMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                    Save inspection
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          {k.inspection?.inspected_at ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Last recorded{" "}
              <span className="text-foreground">{new Date(k.inspection.inspected_at).toLocaleString("en-GB")}</span>
              {k.inspection.inspected_by?.name ? (
                <>
                  {" "}
                  · <span className="text-foreground">{k.inspection.inspected_by.name}</span>
                </>
              ) : null}
              {k.inspection.customer_visible ? (
                <Badge className="ml-2" variant="secondary">
                  Customer-visible
                </Badge>
              ) : null}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No structured inspection yet.</p>
          )}
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
                className="md:hidden"
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
                <span className="md:hidden">Choose file</span>
                <span className="hidden md:inline">Choose image</span>
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
          <WorkshopEvidenceSection
            title="Timestamped workshop evidence"
            description="Intake, inspection, damage, QC and completion photos. Distinct from the quick gallery above — these support visibility, audit, and the customer portal."
            uploadUrl={`/api/admin/knives/${knifeId}/evidence-photos`}
            photos={k.workshop_evidence_photos ?? []}
            settings={k.evidence_settings}
            invalidateQueryKeys={[["admin-knife", knifeId], ["admin-orders"]]}
          />
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
      </div>

      <section className="mt-8 space-y-4">
        <h2 className="text-sm font-semibold">Service history</h2>
        <p className="text-xs text-muted-foreground">
          Workshop periods linked to each order. Repeat service adds a new row; older rows stay for operations and customer-safe history.
        </p>
        {(k.service_history ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No service assignments recorded.</p>
        ) : (
          <ol className="space-y-3 border-l-2 border-border pl-4">
            {(k.service_history ?? []).map((row) => {
              const invs = row.invoices ?? [];
              const ord = row.order_id;
              return (
                <li key={row.id} className="relative text-sm">
                  <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" aria-hidden />
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={row.is_current ? "default" : "secondary"}>{row.is_current ? "Current" : "Past"}</Badge>
                    <span className="font-medium">{row.service_kind_label ?? row.service_kind ?? "Service"}</span>
                    {typeof row.service_date === "string" ? (
                      <span className="text-xs text-muted-foreground">{new Date(row.service_date).toLocaleString("en-GB")}</span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    Order{" "}
                    <Link className="font-medium text-primary underline underline-offset-2" href={`/admin/orders/${ord}`}>
                      {ord.slice(0, 8)}…
                    </Link>
                    {row.order_status_label ? <> · {row.order_status_label}</> : null}
                  </div>
                  {row.condition_summary ? (
                    <p className="mt-2 rounded-md bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                      Condition / damage (summary): {row.condition_summary}
                    </p>
                  ) : null}
                  {invs.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-2 text-xs">
                      {invs.map((inv) => (
                        <li key={inv.id}>
                          <Link
                            href={inv.admin_path ?? `/admin/invoices/${inv.id}`}
                            className="text-primary underline underline-offset-2"
                          >
                            {inv.invoice_number?.trim() ? inv.invoice_number : "Invoice"}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
        {(k.past_orders ?? []).length > 0 ? (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Orders touched:</span>{" "}
            {(k.past_orders ?? [])
              .map((p) => p.order_id.slice(0, 8))
              .join(", ")}
          </div>
        ) : null}
      </section>

      <Separator className="my-8" />

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Damage reports</h2>
          <Dialog
            open={damageOpen}
            onOpenChange={(open) => {
              setDamageOpen(open);
              if (!open) {
                setDmgDescription("");
                setDmgInternal("");
                setDmgSeverity("moderate");
                setDmgCustomerVisible(false);
                setDmgCustomerDesc("");
              }
            }}
          >
            <DialogTrigger asChild>
              <Button type="button" size="sm" variant="secondary" disabled={!k.order_id && !k.order_summary?.id}>
                New damage report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create damage report</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div>
                  <Label>Severity</Label>
                  <select
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={dmgSeverity}
                    onChange={(e) => setDmgSeverity(e.target.value)}
                  >
                    {DAMAGE_SEVERITIES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="dmg-desc">Description (required)</Label>
                  <Textarea
                    id="dmg-desc"
                    value={dmgDescription}
                    onChange={(e) => setDmgDescription(e.target.value)}
                    rows={4}
                    className="resize-y"
                    placeholder="Workshop-facing description of condition or damage."
                  />
                </div>
                <div>
                  <Label htmlFor="dmg-int">Internal notes</Label>
                  <Textarea
                    id="dmg-int"
                    value={dmgInternal}
                    onChange={(e) => setDmgInternal(e.target.value)}
                    rows={3}
                    className="resize-y"
                    placeholder="Never shown to customers."
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={dmgCustomerVisible}
                    onChange={(e) => setDmgCustomerVisible(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  Customer-visible summary
                </label>
                {dmgCustomerVisible ? (
                  <div>
                    <Label htmlFor="dmg-cust">Customer-facing wording</Label>
                    <Textarea
                      id="dmg-cust"
                      value={dmgCustomerDesc}
                      onChange={(e) => setDmgCustomerDesc(e.target.value)}
                      rows={3}
                      className="resize-y"
                      placeholder="Plain-language text for the portal when visibility is on."
                    />
                  </div>
                ) : null}
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setDamageOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" disabled={damageCreateMutation.isPending} onClick={() => damageCreateMutation.mutate()}>
                  {damageCreateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Structured damage logging. Internal notes never appear in the customer portal.
        </p>
        <div className="mt-3 space-y-2">
          {(k.damage_reports ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">None recorded.</p>
          ) : (
            (k.damage_reports ?? []).map((r) => {
              const rid = typeof r.id === "string" ? r.id : String(r.id ?? "");
              const det = String(r.description ?? r.details ?? "");
              const sev = r.severity !== undefined ? String(r.severity) : "";
              const cre = typeof r.created_at === "string" ? r.created_at : "";
              const archived = typeof r.archived_at === "string" && r.archived_at !== "";
              const st = typeof r.status === "string" ? r.status : "";

              return (
                <Card key={rid} className={`p-3 text-sm ${archived ? "opacity-60" : ""}`}>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{cre ? new Date(cre).toLocaleString("en-GB") : "—"}</span>
                    {sev ? <Badge variant="outline">{sev}</Badge> : null}
                    {st ? <Badge variant="secondary">{st}</Badge> : null}
                    {r.customer_visible ? <Badge variant="default">Customer-visible</Badge> : null}
                    {archived ? <Badge variant="destructive">Archived</Badge> : null}
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap font-sans text-sm">{det}</pre>
                  {typeof r.internal_notes === "string" && r.internal_notes.trim() !== "" ? (
                    <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Internal:</span> {r.internal_notes}
                    </p>
                  ) : null}
                  {!archived ? (
                    <WorkshopEvidenceSection
                      className="mt-3 border border-dashed bg-muted/30"
                      title="Photos for this report"
                      description="Upload images tied to this damage report (private storage; mark customer-visible only when appropriate)."
                      uploadUrl={`/api/admin/damage-reports/${rid}/evidence-photos`}
                      photos={Array.isArray(r.evidence_photos) ? r.evidence_photos : []}
                      settings={k.evidence_settings}
                      invalidateQueryKeys={[["admin-knife", knifeId]]}
                      categoryChoices={[
                        { value: "damage", label: "Damage" },
                        { value: "knife_detail", label: "Knife detail" },
                        { value: "before", label: "Before" },
                        { value: "after", label: "After" },
                        { value: "general_order", label: "General" },
                      ]}
                    />
                  ) : null}
                  {!archived ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => openEditDamage(r)}>
                        Edit
                      </Button>
                      {st !== "resolved" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            openEditDamage(r);
                            setEditDmgStatus("resolved");
                          }}
                        >
                          Mark resolved
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        disabled={damageArchiveMutation.isPending}
                        onClick={() => {
                          if (window.confirm("Archive this damage report?")) {
                            damageArchiveMutation.mutate(rid);
                          }
                        }}
                      >
                        Archive
                      </Button>
                    </div>
                  ) : null}
                </Card>
              );
            })
          )}
        </div>

        <Dialog open={editDamageOpen} onOpenChange={setEditDamageOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit damage report</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div>
                <Label>Status</Label>
                <select
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editDmgStatus}
                  onChange={(e) => setEditDmgStatus(e.target.value)}
                >
                  <option value="open">Open</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <div>
                <Label>Severity</Label>
                <select
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editDmgSeverity}
                  onChange={(e) => setEditDmgSeverity(e.target.value)}
                >
                  {DAMAGE_SEVERITIES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="ed-dmg-desc">Description</Label>
                <Textarea
                  id="ed-dmg-desc"
                  value={editDmgDescription}
                  onChange={(e) => setEditDmgDescription(e.target.value)}
                  rows={4}
                  className="resize-y"
                />
              </div>
              <div>
                <Label htmlFor="ed-dmg-int">Internal notes</Label>
                <Textarea
                  id="ed-dmg-int"
                  value={editDmgInternal}
                  onChange={(e) => setEditDmgInternal(e.target.value)}
                  rows={3}
                  className="resize-y"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editDmgCustomerVisible}
                  onChange={(e) => setEditDmgCustomerVisible(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                Customer-visible summary
              </label>
              {editDmgCustomerVisible ? (
                <div>
                  <Label htmlFor="ed-dmg-cust">Customer-facing wording</Label>
                  <Textarea
                    id="ed-dmg-cust"
                    value={editDmgCustomerDesc}
                    onChange={(e) => setEditDmgCustomerDesc(e.target.value)}
                    rows={3}
                    className="resize-y"
                  />
                </div>
              ) : null}
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setEditDamageOpen(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={damageUpdateMutation.isPending} onClick={() => damageUpdateMutation.mutate()}>
                {damageUpdateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      <Separator className="my-8" />

      <section>
        <h2 className="text-sm font-semibold">Status timeline (audit)</h2>
        <ol className="mt-4 space-y-4 border-l-2 border-border pl-4">
          {(k.timeline ?? []).map((entry, idx) => {
            const record = entry as Record<string, unknown>;
            const actor = record.actor && typeof record.actor === "object" ? (record.actor as { name?: string }) : null;
            const at =
              typeof record.at === "string"
                ? record.at
                : typeof record.created_at === "string"
                  ? record.created_at
                  : "";

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
