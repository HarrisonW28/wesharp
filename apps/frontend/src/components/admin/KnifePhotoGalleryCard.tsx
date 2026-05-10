"use client";

import { useCallback } from "react";

import { Loader2, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { KnifeDetailResponseSchema } from "@/lib/api/admin-knives-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { KnifePhotoTile } from "@/components/admin/KnifePhotoTile";
import { Button } from "@/components/ui/button";

export type KnifePhotoGalleryItem = {
  id: string;
  content_api_path?: string;
  caption?: string | null;
  photo_kind?: string;
  file?: { original_filename?: string | null; byte_size?: number } | null;
  uploaded_by?: { name?: string | null } | null;
};

type AdminApi = ReturnType<typeof useAdminApi>;

export function KnifePhotoGalleryCard({
  photo,
  knifeId,
  admin,
  allowDelete = true,
}: {
  photo: KnifePhotoGalleryItem;
  knifeId: string;
  admin: AdminApi;
  /** When false, hide remove (e.g. order card viewers without `knives.update`). */
  allowDelete?: boolean;
}) {
  const queryClient = useQueryClient();
  const path = photo.content_api_path ?? `/api/admin/knife-photos/${photo.id}/file`;
  const load = useCallback(() => admin.fetchBlob(path), [admin, path]);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await admin.json<unknown>(`/api/admin/knives/${knifeId}/photos/${photo.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = KnifeDetailResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected knife response after delete.");
      }
      return parsed.data.data;
    },
    onSuccess: (data) => {
      toast.success("Photo removed.");
      queryClient.setQueryData(["admin-knife", knifeId], data);
      void queryClient.invalidateQueries({ queryKey: ["admin-knives"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-order"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const name = photo.file?.original_filename ?? "Photo";
  const kind = photo.photo_kind ?? "general";
  const meta = [kind, photo.uploaded_by?.name].filter(Boolean).join(" · ");

  return (
    <li className="overflow-hidden rounded-lg border bg-muted/20">
      <div className="aspect-square w-full overflow-hidden bg-muted">
        <KnifePhotoTile load={load} alt={name} loadingClassName="aspect-square h-full w-full bg-muted" />
      </div>
      <div className="space-y-1 p-2 text-xs">
        <div className="font-medium leading-tight">{name}</div>
        {meta !== "" ? <div className="text-muted-foreground">{meta}</div> : null}
        {photo.caption ? <div className="text-muted-foreground">{photo.caption}</div> : null}
        {photo.file?.byte_size != null ? (
          <div className="text-muted-foreground">{Math.max(1, Math.round(photo.file.byte_size / 1024))} KB</div>
        ) : null}
        {allowDelete ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-1 w-full gap-1 text-destructive hover:text-destructive"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          >
            {deleteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : <Trash2 className="h-3 w-3" aria-hidden />}
            Remove
          </Button>
        ) : null}
      </div>
    </li>
  );
}
