"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Loader2, Newspaper } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
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

  const value = useMemo(
    () => ({
      canManage,
      draft,
      setDraft,
      saveMutation,
      isLoadPending: loadQuery.isPending,
      isLoadError: loadQuery.isError,
      loadError: loadQuery.isError ? (loadQuery.error as Error) : null,
    }),
    [canManage, draft, saveMutation, loadQuery.isPending, loadQuery.isError, loadQuery.error],
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
        <Breadcrumbs crumbs={[{ label: "Settings", href: "/admin/dashboard" }, { label: "Site content" }]} />
        <PageHeader title="Site content" description="Your role cannot edit marketing copy." />
      </>
    );
  }

  if (isLoadPending || !draft) {
    return (
      <>
        <Breadcrumbs crumbs={[{ label: "Settings", href: "/admin/dashboard" }, { label: "Site content" }]} />
        <PageHeader title="Site content" description="Loading…" />
        <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        </div>
      </>
    );
  }

  if (isLoadError) {
    return (
      <>
        <Breadcrumbs crumbs={[{ label: "Settings", href: "/admin/dashboard" }, { label: "Site content" }]} />
        <PageHeader title="Site content" description="Could not load settings." />
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
