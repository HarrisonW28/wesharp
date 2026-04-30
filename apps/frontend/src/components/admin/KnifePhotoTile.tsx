"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  load: () => Promise<Blob>;
  alt: string;
  className?: string;
  loadingClassName?: string;
};

export function KnifePhotoTile({ load, alt, className = "", loadingClassName = "aspect-square rounded-md bg-muted" }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const createdUrls: string[] = [];

    setLoading(true);
    setErr(null);
    setUrl(null);

    load()
      .then((blob) => {
        if (cancelled) {
          return;
        }
        const objectUrl = URL.createObjectURL(blob);
        createdUrls.push(objectUrl);
        setUrl(objectUrl);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Could not load photo.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      for (const u of createdUrls) {
        URL.revokeObjectURL(u);
      }
    };
  }, [load]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${loadingClassName}`}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (err !== null) {
    return (
      <div className={`rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive ${className}`}>{err}</div>
    );
  }

  if (url === null) {
    return null;
  }

  // Blob URLs from authenticated API; next/image remotePatterns would not apply.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={`h-full w-full object-cover ${className}`} />;
}
