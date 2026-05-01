"use client";

import { useEffect, useId, useState } from "react";

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
import { cn } from "@/lib/utils";
import type { z } from "zod";

type EvidenceRow = z.infer<typeof EvidencePhotoAdminRowSchema>;
type EvidenceSettings = z.infer<typeof EvidenceSettingsSchema>;

const STOP_CATEGORIES: { value: string; label: string }[] = [
  { value: "collection_proof", label: "Collection proof" },
  { value: "return_proof", label: "Return proof" },
  { value: "failed_collection", label: "Failed collection" },
  { value: "general_route_stop", label: "General (stop)" },
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

export function RouteStopEvidenceSection({
  stopId,
  routeId,
  photos,
  settings,
}: {
  stopId: string;
  routeId: string;
  photos: EvidenceRow[];
  settings?: EvidenceSettings;
}) {
  const idPrefix = useId();
  const admin = useAdminApi();
  const queryClient = useQueryClient();

  const [category, setCategory] = useState(STOP_CATEGORIES[0]?.value ?? "general_route_stop");
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<string>(
    settings?.default_visibility === "customer_visible" ? "customer_visible" : "internal_only",
  );
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
      if (allowCustomerVisible) {
        fd.append("visibility", visibility);
      }
      const res = await admin.json<unknown>(`/api/admin/route-stops/${stopId}/evidence-photos`, {
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
      void queryClient.invalidateQueries({ queryKey: ["admin-route-stop", stopId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-route-detail", routeId] });
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
      void queryClient.invalidateQueries({ queryKey: ["admin-route-stop", stopId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-route-detail", routeId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="border-white/10 bg-white/[0.03] p-4 md:border-border md:bg-card">
      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400 md:text-muted-foreground">
        <ImageIcon className="h-5 w-5" aria-hidden />
        Photos & evidence
      </div>
      <p className="mt-2 text-base text-slate-300 md:text-muted-foreground">
        Timestamped images for collection, returns, or failed visits. Files stay private; customers only see photos you mark
        visible.
      </p>

      <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-white/5 p-4 md:border-border md:bg-muted/20">
        <div>
          <Label className="text-base">New photo</Label>
          <Input
            id={`${idPrefix}-camera`}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            capture="environment"
            className="mt-2 h-12 cursor-pointer text-base"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setDraftFile(f);
              e.target.value = "";
            }}
          />
        </div>

        {previewUrl ? (
          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/30 md:border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Preview" className="max-h-64 w-full object-contain" />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="absolute right-2 top-2 rounded-lg"
              onClick={() => setDraftFile(null)}
            >
              <Trash2 className="mr-1 h-4 w-4" aria-hidden />
              Remove
            </Button>
          </div>
        ) : null}

        <div>
          <Label className="text-base">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="mt-2 h-12 rounded-xl text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STOP_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value} className="text-base">
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor={`${idPrefix}-cap`} className="text-base">
            Caption / notes (optional)
          </Label>
          <Input
            id={`${idPrefix}-cap`}
            className="mt-2 h-12 rounded-xl text-base"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Short description"
          />
        </div>

        {allowCustomerVisible ? (
          <div>
            <Label className="text-base">Visibility</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger className="mt-2 h-12 rounded-xl text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internal_only" className="text-base">
                  Internal only
                </SelectItem>
                <SelectItem value="customer_visible" className="text-base">
                  Customer-visible
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <Button
          type="button"
          className="h-12 w-full rounded-xl text-base font-semibold"
          disabled={!draftFile || uploadMutation.isPending}
          onClick={() => uploadMutation.mutate()}
        >
          {uploadMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> : null}
          Upload photo
        </Button>
      </div>

      {photos.length > 0 ? (
        <div className="mt-6 space-y-4">
          <div className="text-sm font-semibold text-slate-200 md:text-foreground">Uploaded</div>
          <ul className="space-y-4">
            {photos.map((p) => {
              const path = p.file_fetch_path;
              const archived = Boolean(p.archived_at);
              return (
                <li
                  key={p.id}
                  className={cn(
                    "flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 md:flex-row md:border-border md:bg-muted/20",
                    archived && "opacity-60",
                  )}
                >
                  {path ? (
                    <EvidenceThumb fetchPath={path} className="h-36 w-full shrink-0 md:h-28 md:w-40" />
                  ) : null}
                  <div className="min-w-0 flex-1 space-y-2 text-base">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-200 md:bg-muted md:text-foreground">
                        {p.category_label ?? p.category}
                      </span>
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-xs font-semibold",
                          p.visibility === "customer_visible"
                            ? "bg-emerald-500/20 text-emerald-100 md:text-emerald-900"
                            : "bg-slate-500/20 text-slate-200 md:text-muted-foreground",
                        )}
                      >
                        {p.visibility === "customer_visible" ? "Customer-visible" : "Internal"}
                      </span>
                      {archived ? (
                        <span className="text-xs font-medium text-amber-200 md:text-amber-800">Archived</span>
                      ) : null}
                    </div>
                    <div className="text-sm text-slate-400 md:text-muted-foreground">
                      {formatCapturedAt(p.captured_at)}
                      {p.uploaded_by?.name ? ` · ${p.uploaded_by.name}` : null}
                    </div>
                    {p.caption ? <p className="text-sm text-slate-100 md:text-foreground">{p.caption}</p> : null}
                    {!archived ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {allowCustomerVisible ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-lg"
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
                          className="rounded-lg"
                          disabled={patchMutation.isPending}
                          onClick={() => {
                            if (!window.confirm("Archive this photo? It will stay for audit but hidden from active lists.")) {
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

      {settings?.require_collection_photo || settings?.require_return_photo || settings?.require_failed_collection_photo ? (
        <p className="mt-4 text-sm text-amber-200 md:text-amber-900">
          Some transitions require a matching photo first — check ops settings if you are blocked at mark collected / returned /
          failed collection.
        </p>
      ) : null}
    </Card>
  );
}
