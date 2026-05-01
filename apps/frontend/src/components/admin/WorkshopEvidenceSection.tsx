"use client";

import { useEffect, useId, useMemo, useState } from "react";

import { ImageIcon, Loader2, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { EvidencePhotoAdminRowSchema, EvidenceSettingsSchema } from "@/lib/api/admin-routes-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { z } from "zod";

type EvidenceRow = z.infer<typeof EvidencePhotoAdminRowSchema>;
type EvidenceSettings = z.infer<typeof EvidenceSettingsSchema>;

const DEFAULT_WORKSHOP_CATEGORIES: { value: string; label: string }[] = [
  { value: "general_order", label: "General (order)" },
  { value: "intake_condition", label: "Intake condition" },
  { value: "knife_detail", label: "Knife detail" },
  { value: "damage", label: "Damage" },
  { value: "completed_work", label: "Completed work" },
  { value: "quality_check", label: "Quality check" },
  { value: "before", label: "Before" },
  { value: "after", label: "After" },
];

function formatCapturedAt(iso?: string | null): string {
  if (!iso) {
    return "—";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function EvidenceThumb({ fetchPath, className }: { fetchPath: string; className?: string }) {
  const admin = useAdminApi();
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    void (async () => {
      try {
        const blob = await admin.fetchBlob(fetchPath);
        if (!cancelled) {
          objectUrl = URL.createObjectURL(blob);
          setSrc(objectUrl);
        }
      } catch {
        if (!cancelled) {
          setSrc(null);
        }
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [fetchPath, admin]);

  if (!src) {
    return (
      <div
        className={cn("flex items-center justify-center rounded-lg bg-muted/50 text-muted-foreground", className)}
        aria-hidden
      >
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={cn("rounded-lg object-cover", className)} />
  );
}

export function WorkshopEvidenceSection({
  uploadUrl,
  photos,
  settings,
  invalidateQueryKeys,
  title = "Workshop evidence photos",
  description = "Timestamped images for intake, inspection, damage, QC and completion. Files stay on private storage; customers only see photos you mark visible.",
  categoryChoices = DEFAULT_WORKSHOP_CATEGORIES,
  knifeLinkOptions,
  damageReportLinkOptions,
  className,
}: {
  uploadUrl: string;
  photos: EvidenceRow[];
  settings?: EvidenceSettings;
  invalidateQueryKeys: readonly (readonly string[])[];
  title?: string;
  description?: string;
  categoryChoices?: { value: string; label: string }[];
  knifeLinkOptions?: { id: string; label: string }[];
  damageReportLinkOptions?: { id: string; label: string }[];
  className?: string;
}) {
  const idPrefix = useId();
  const admin = useAdminApi();
  const queryClient = useQueryClient();

  const firstCat = categoryChoices[0]?.value ?? "general_order";
  const [category, setCategory] = useState(firstCat);
  const [caption, setCaption] = useState("");
  const [notes, setNotes] = useState("");
  const [knifeLink, setKnifeLink] = useState<string>("");
  const [damageLink, setDamageLink] = useState<string>("");
  const [visibility, setVisibility] = useState<string>(
    settings?.default_visibility === "customer_visible" ? "customer_visible" : "internal_only",
  );
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!categoryChoices.some((c) => c.value === category)) {
      setCategory(firstCat);
    }
  }, [category, categoryChoices, firstCat]);

  useEffect(() => {
    if (!draftFile) {
      setPreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(draftFile);
    setPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [draftFile]);

  const allowCustomerVisible = settings?.allow_customer_visible_photos !== false;

  const invalidate = () => {
    for (const key of invalidateQueryKeys) {
      void queryClient.invalidateQueries({ queryKey: [...key] });
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!draftFile) {
        throw new Error("Choose a photo first.");
      }
      const fd = new FormData();
      fd.append("photo", draftFile);
      fd.append("category", category);
      if (caption.trim()) {
        fd.append("caption", caption.trim());
      }
      if (notes.trim()) {
        fd.append("notes", notes.trim());
      }
      if (allowCustomerVisible) {
        fd.append("visibility", visibility);
      }
      if (knifeLinkOptions && knifeLink && knifeLink !== "_none") {
        fd.append("knife_id", knifeLink);
      }
      if (damageReportLinkOptions && damageLink && damageLink !== "_none") {
        fd.append("damage_report_id", damageLink);
      }
      const res = await admin.json<unknown>(uploadUrl, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: () => {
      toast.success("Photo uploaded.");
      setDraftFile(null);
      setCaption("");
      setNotes("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patchMutation = useMutation({
    mutationFn: async (args: { photoId: string; body: Record<string, unknown> }) => {
      const res = await admin.json<unknown>(`/api/admin/evidence-photos/${args.photoId}`, {
        method: "PATCH",
        body: JSON.stringify(args.body),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: () => {
      toast.success("Photo updated.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sortedPhotos = useMemo(
    () => [...photos].sort((a, b) => String(b.captured_at ?? "").localeCompare(String(a.captured_at ?? ""))),
    [photos],
  );

  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
        <ImageIcon className="h-4 w-4" aria-hidden />
        {title}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>

      <div className="mt-4 space-y-3 rounded-lg border bg-muted/20 p-4">
        <div>
          <Label>New photo</Label>
          <Input
            id={`${idPrefix}-camera`}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            capture="environment"
            className="mt-2 cursor-pointer"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setDraftFile(f);
              e.target.value = "";
            }}
          />
        </div>

        {previewUrl ? (
          <div className="relative overflow-hidden rounded-lg border bg-background">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Preview" className="max-h-64 w-full object-contain" />
            <Button type="button" variant="secondary" size="sm" className="absolute right-2 top-2" onClick={() => setDraftFile(null)}>
              <Trash2 className="mr-1 h-4 w-4" aria-hidden />
              Remove
            </Button>
          </div>
        ) : null}

        <div>
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categoryChoices.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {knifeLinkOptions && knifeLinkOptions.length > 0 ? (
          <div>
            <Label>Link to blade (optional)</Label>
            <Select
              value={knifeLink || "_none"}
              onValueChange={(v) => setKnifeLink(v === "_none" ? "" : v)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Order-level only" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Order-level only</SelectItem>
                {knifeLinkOptions.map((k) => (
                  <SelectItem key={k.id} value={k.id}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {damageReportLinkOptions && damageReportLinkOptions.length > 0 ? (
          <div>
            <Label>Link to damage report (optional)</Label>
            <Select
              value={damageLink || "_none"}
              onValueChange={(v) => setDamageLink(v === "_none" ? "" : v)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None</SelectItem>
                {damageReportLinkOptions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div>
          <Label htmlFor={`${idPrefix}-cap`}>Caption (optional)</Label>
          <Input
            id={`${idPrefix}-cap`}
            className="mt-2"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Customer-safe short description when shared"
          />
        </div>

        <div>
          <Label htmlFor={`${idPrefix}-notes`}>Internal notes (optional)</Label>
          <Textarea
            id={`${idPrefix}-notes`}
            className="mt-2"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Staff-only context — never shown in the customer portal"
          />
        </div>

        {allowCustomerVisible ? (
          <div>
            <Label>Visibility</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internal_only">Internal only</SelectItem>
                <SelectItem value="customer_visible">Customer-visible</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <Button type="button" disabled={!draftFile || uploadMutation.isPending} onClick={() => uploadMutation.mutate()}>
          {uploadMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
          Upload
        </Button>
      </div>

      {sortedPhotos.length > 0 ? (
        <div className="mt-6 space-y-4">
          <div className="text-sm font-medium">Gallery</div>
          <ul className="space-y-4">
            {sortedPhotos.map((p) => {
              const path = p.file_fetch_path;
              const archived = Boolean(p.archived_at);
              return (
                <li
                  key={p.id}
                  className={cn(
                    "flex flex-col gap-3 rounded-lg border bg-muted/10 p-3 md:flex-row",
                    archived && "opacity-60",
                  )}
                >
                  {path ? <EvidenceThumb fetchPath={path} className="h-36 w-full shrink-0 md:h-28 md:w-40" /> : null}
                  <div className="min-w-0 flex-1 space-y-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                        {p.category_label ?? p.category}
                      </span>
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-xs font-medium",
                          p.visibility === "customer_visible" ? "bg-emerald-500/15 text-emerald-800" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {p.visibility === "customer_visible" ? "Customer-visible" : "Internal"}
                      </span>
                      {archived ? <span className="text-xs font-medium text-amber-700">Archived</span> : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatCapturedAt(p.captured_at)}
                      {p.uploaded_by?.name ? ` · ${p.uploaded_by.name}` : null}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {p.order_id ? <span>Order {p.order_id.slice(0, 8)}…</span> : null}
                      {p.knife_id ? <span>Blade {p.knife_id.slice(0, 8)}…</span> : null}
                      {p.damage_report_id ? <span>Damage report {p.damage_report_id.slice(0, 8)}…</span> : null}
                    </div>
                    {p.caption ? <p className="text-sm">{p.caption}</p> : null}
                    {p.notes ? <p className="border-l-2 border-muted pl-2 text-xs text-muted-foreground">Note: {p.notes}</p> : null}
                    {!archived ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {allowCustomerVisible ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={patchMutation.isPending}
                            onClick={() =>
                              patchMutation.mutate({
                                photoId: p.id,
                                body: {
                                  visibility: p.visibility === "customer_visible" ? "internal_only" : "customer_visible",
                                },
                              })
                            }
                          >
                            {p.visibility === "customer_visible" ? "Make internal" : "Share with customer"}
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={patchMutation.isPending}
                          onClick={() => {
                            if (!window.confirm("Archive this photo? It remains in audit history.")) {
                              return;
                            }
                            patchMutation.mutate({ photoId: p.id, body: { archived: true } });
                          }}
                        >
                          Archive
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
