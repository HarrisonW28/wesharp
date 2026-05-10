"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";

import { ImageIcon, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { KnifeDetailResponseSchema } from "@/lib/api/admin-knives-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { KnifePhotoGalleryCard, type KnifePhotoGalleryItem } from "@/components/admin/KnifePhotoGalleryCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const PHOTO_KINDS = ["general", "damage", "before", "after"] as const;

type Props = {
  knifeId: string;
  orderId: string;
  photos: KnifePhotoGalleryItem[];
  canManage: boolean;
};

export function AdminKnifeQuickPhotosDialog({ knifeId, orderId, photos, canManage }: Props) {
  const admin = useAdminApi();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [photoKind, setPhotoKind] = useState<string>("general");
  const [caption, setCaption] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const invalidateAfterKnifePhotos = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["admin-order", orderId] });
    void qc.invalidateQueries({ queryKey: ["admin-order"] });
    void qc.invalidateQueries({ queryKey: ["admin-knife", knifeId] });
    void qc.invalidateQueries({ queryKey: ["admin-knives"] });
  }, [qc, orderId, knifeId]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("photo", file);
      fd.append("photo_kind", photoKind);
      fd.append("order_id", orderId);
      const c = caption.trim();
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
        throw new Error("Unexpected knife response after upload.");
      }
      return parsed.data.data;
    },
    onSuccess: () => {
      toast.success("Photo uploaded.");
      setUploadError(null);
      setCaption("");
      invalidateAfterKnifePhotos();
    },
    onError: (e: Error) => {
      setUploadError(e.message);
      toast.error(e.message);
    },
  });

  const count = photos.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="relative h-9 w-9 shrink-0"
          title={count > 0 ? `Photos (${count})` : "Blade photos"}
          aria-label={count > 0 ? `Blade photos, ${count} uploaded` : "Blade photos"}
        >
          <ImageIcon className="h-4 w-4" aria-hidden />
          {count > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium leading-none text-primary-foreground">
              {count > 9 ? "9+" : count}
            </span>
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Blade photos</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Quick gallery for this blade on this order.{" "}
          <Link href={`/admin/knives/${knifeId}`} className="font-medium text-primary underline underline-offset-2">
            Open full lifecycle
          </Link>{" "}
          for workshop evidence and full detail.
        </p>

        {canManage ? (
          <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor={`kpl-kind-${knifeId}`}>Kind</Label>
                <select
                  id={`kpl-kind-${knifeId}`}
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={photoKind}
                  onChange={(e) => setPhotoKind(e.target.value)}
                  disabled={uploadMutation.isPending}
                >
                  {PHOTO_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor={`kpl-cap-${knifeId}`}>Caption (optional)</Label>
                <Input
                  id={`kpl-cap-${knifeId}`}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  disabled={uploadMutation.isPending}
                  placeholder="Short note"
                />
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploadMutation.isPending}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) {
                  setUploadError(null);
                  uploadMutation.mutate(f);
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={uploadMutation.isPending}
              onClick={() => fileRef.current?.click()}
            >
              {uploadMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Upload image
            </Button>
            {uploadError !== null ? (
              <p className="text-sm text-destructive" role="alert">
                {uploadError}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">You don&apos;t have permission to add or remove photos.</p>
        )}

        <Separator />

        <div>
          <div className="text-sm font-medium">Uploaded ({photos.length})</div>
          {photos.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No photos yet{canManage ? " — upload one above." : "."}</p>
          ) : (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {photos.map((p) => (
                <KnifePhotoGalleryCard key={p.id} photo={p} knifeId={knifeId} admin={admin} allowDelete={canManage} />
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
