"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import type { useAdminApi } from "@/lib/api/use-admin-api";
import { Button } from "@/components/ui/button";

type AdminApi = ReturnType<typeof useAdminApi>;

export function ReportCsvExportButton(props: {
  admin: AdminApi;
  /** Path including `/api/admin/...` and query string. */
  exportPath: string;
  label?: string;
  disabled?: boolean;
  variant?: "default" | "outline" | "secondary";
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const label = props.label ?? "Export CSV";

  return (
    <Button
      type="button"
      variant={props.variant ?? "outline"}
      className={props.className}
      disabled={props.disabled || loading || !props.admin.origin}
      onClick={() => {
        void (async () => {
          setLoading(true);
          try {
            const res = await props.admin.downloadCsv(props.exportPath);
            if (!res.ok) {
              toast.error(res.message);
              return;
            }
            toast.success(`Downloaded ${res.filename}`);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Export failed.");
          } finally {
            setLoading(false);
          }
        })();
      }}
    >
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Download className="mr-2 h-4 w-4" aria-hidden />}
      {label}
    </Button>
  );
}
