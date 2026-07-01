"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Loader2, Newspaper, RotateCcw } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { NavBreadcrumbs } from "@/components/layout/NavBreadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { useBackendMe } from "@/hooks/use-backend-me";
import {
  SITE_CONTENT_DEFAULTS,
  mergeSiteContent,
  type SiteContent,
} from "@/lib/site-content/site-content-defaults";

function cloneContent(c: SiteContent): SiteContent {
  return JSON.parse(JSON.stringify(c)) as SiteContent;
}

type SiteContentEditorContextValue = {
  canManage: boolean;
  draft: SiteContent | null;
  setDraft: React.Dispatch<React.SetStateAction<SiteContent | null>>;
  saveMutation: ReturnType<typeof useMutation<void, Error, SiteContent>>;
  resetMutation: ReturnType<typeof useMutation<void, Error, void>>;
  isLoadPending: boolean;
  isLoadError: boolean;
  loadError: Error | null;
};

const SiteContentEditorContext = createContext<SiteContentEditorContextValue | null>(null);

export function SiteContentEditorProvider({ children }: { children: ReactNode }) {
  const admin = useAdminApi();
  const qc = useQueryClient();
  const { data: me } = useBackendMe();
  const permissions = useMemo(() => new Set(me?.data?.permissions ?? []), [me?.data?.permissions]);
  const canManage = permissions.has("settings.manage");

  const [draft, setDraft] = useState<SiteContent | null>(null);

  const loadQuery = useQuery({
    enabled: canManage,
    queryKey: ["admin-site-content"],
    queryFn: async () => {
      const res = await admin.json<unknown>("/api/admin/site-content");
      if (!res.ok) {
        throw new Error(res.message);
      }
      const raw = res.data as { data?: { content?: unknown } };
      const content = raw?.data?.content;
      return mergeSiteContent(SITE_CONTENT_DEFAULTS, content);
    },
  });

  useEffect(() => {
    if (loadQuery.data) {
      setDraft(cloneContent(loadQuery.data));
    }
  }, [loadQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (body: SiteContent) => {
      const res = await admin.json<unknown>("/api/admin/site-content", {
        method: "PUT",
        body: JSON.stringify({ content: body }),
      });
      if (!res.ok) {
        throw new Error(res.message);
      }
    },
    onSuccess: () => {
      toast.success("Site content saved.");
      void qc.invalidateQueries({ queryKey: ["admin-site-content"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await admin.json<unknown>("/api/admin/site-content", { method: "DELETE" });
      if (!res.ok) {
        throw new Error(res.message);
      }
    },
    onSuccess: () => {
      toast.success("Marketing copy reset to built-in defaults.");
      void qc.invalidateQueries({ queryKey: ["admin-site-content"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const value = useMemo(
    () => ({
      canManage,
      draft,
      setDraft,
      saveMutation,
      resetMutation,
      isLoadPending: loadQuery.isPending,
      isLoadError: loadQuery.isError,
      loadError: loadQuery.isError ? (loadQuery.error as Error) : null,
    }),
    [canManage, draft, saveMutation, resetMutation, loadQuery.isPending, loadQuery.isError, loadQuery.error],
  );

  return <SiteContentEditorContext.Provider value={value}>{children}</SiteContentEditorContext.Provider>;
}

export function useSiteContentEditor() {
  const ctx = useContext(SiteContentEditorContext);
  if (!ctx) {
    throw new Error("useSiteContentEditor must be used within SiteContentEditorProvider");
  }
  return ctx;
}

export function ContentSettingsGate({ children }: { children: ReactNode }) {
  const { canManage, isLoadPending, isLoadError, loadError, draft } = useSiteContentEditor();

  if (!canManage) {
    return (
      <>
        <NavBreadcrumbs />
        <PageHeader title="Site settings" description="Your role cannot edit marketing copy." />
      </>
    );
  }

  if (isLoadPending || !draft) {
    return (
      <>
        <NavBreadcrumbs />
        <PageHeader title="Site settings" description="Loading…" />
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        </div>
      </>
    );
  }

  if (isLoadError) {
    return (
      <>
        <NavBreadcrumbs />
        <PageHeader title="Site settings" description="Could not load settings." />
        <p className="break-words text-sm text-destructive">{loadError?.message ?? "Error"}</p>
      </>
    );
  }

  return <>{children}</>;
}

export function SaveSiteContentButton() {
  const { draft, saveMutation } = useSiteContentEditor();

  const save = useCallback(() => {
    if (!draft) {
      return;
    }
    const body: SiteContent = {
      ...draft,
      faq: (draft.faq ?? []).filter((x) => x.q.trim() !== "" && x.a.trim() !== ""),
    };
    saveMutation.mutate(body);
  }, [draft, saveMutation]);

  if (!draft) {
    return null;
  }

  return (
    <Button type="button" size="lg" disabled={saveMutation.isPending} onClick={save} className="gap-2">
      {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Newspaper className="h-4 w-4" aria-hidden />}
      Save changes
    </Button>
  );
}

export function ResetSiteContentButton() {
  const { draft, resetMutation, saveMutation } = useSiteContentEditor();

  if (!draft) {
    return null;
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={resetMutation.isPending || saveMutation.isPending}
        >
          {resetMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <RotateCcw className="h-4 w-4" aria-hidden />
          )}
          Reset to defaults
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset all marketing copy?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes every stored override and restores the built-in defaults on the marketing site and booking flow.
            Notification email settings are not affected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={resetMutation.isPending}
            onClick={() => resetMutation.mutate()}
          >
            {resetMutation.isPending ? "Resetting…" : "Reset copy"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
