"use client";

import { ChevronDown, Loader2, X } from "lucide-react";
import { type KeyboardEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAdminApi } from "@/lib/api/use-admin-api";
import {
  type LookupInitialOption,
  type LookupItem,
  type LookupResource,
  LookupListResponseSchema,
  lookupQueryString,
} from "@/lib/api/admin-lookup-schema";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export type AsyncEntityLookupProps = {
  resource: LookupResource;
  value: string | null;
  onChange: (id: string | null) => void;
  nullable?: boolean;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  id?: string;
  className?: string;
  initialOption?: LookupInitialOption | null;
  extraParams?: Record<string, string | boolean | undefined>;
};

function stableExtraKey(extra: Record<string, string | boolean | undefined> | undefined): string {
  if (!extra || Object.keys(extra).length === 0) {
    return "";
  }

  return JSON.stringify(
    Object.keys(extra)
      .sort()
      .reduce<Record<string, string | boolean | undefined>>((acc, k) => {
        acc[k] = extra[k];

        return acc;
      }, {}),
  );
}

export function AsyncEntityLookup({
  resource,
  value,
  onChange,
  nullable = false,
  disabled = false,
  label,
  placeholder = "Search…",
  id: idProp,
  className,
  initialOption,
  extraParams,
}: AsyncEntityLookupProps) {
  const admin = useAdminApi();
  const autoId = useId();
  const listId = `${autoId}-list`;
  const inputId = idProp ?? `${autoId}-input`;
  const containerRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [picked, setPicked] = useState<{ id: string; label: string; description?: string | null } | null>(null);

  const extraKey = useMemo(() => stableExtraKey(extraParams), [extraParams]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(searchInput), 250);

    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (open) {
      setSearchInput("");
      setDebouncedQ("");
    }
  }, [open]);

  useEffect(() => {
    if (!value) {
      setPicked(null);
    }
  }, [value]);

  const resolveEnabled = Boolean(value) && !(initialOption != null && initialOption.id === value);

  const resolveQuery = useQuery({
    queryKey: ["admin-lookup-resolve", resource, value, extraKey],
    enabled: resolveEnabled && Boolean(value),
    queryFn: async () => {
      const qs = lookupQueryString(extraParams, "", value);
      const path = `/api/admin/lookups/${resource}?${qs}`;
      const res = await admin.json<unknown>(path);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = LookupListResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected lookup response.");
      }

      return parsed.data.data.items;
    },
  });

  const searchQuery = useQuery({
    queryKey: ["admin-lookup-search", resource, debouncedQ, extraKey, open],
    enabled: open,
    queryFn: async () => {
      const qs = lookupQueryString(extraParams, debouncedQ, undefined);
      const path = `/api/admin/lookups/${resource}?${qs}`;
      const res = await admin.json<unknown>(path);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = LookupListResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected lookup response.");
      }

      return parsed.data.data.items;
    },
  });

  const items = searchQuery.data ?? [];

  useEffect(() => {
    setActiveIdx(0);
  }, [debouncedQ, items.length, open]);

  const resolvedFromApi = resolveQuery.data?.[0];
  const closedLabel = useMemo(() => {
    if (!value) {
      return "";
    }
    if (picked?.id === value) {
      return picked.label;
    }
    if (initialOption?.id === value) {
      return initialOption.label;
    }

    return resolvedFromApi?.label ?? "";
  }, [value, picked, initialOption, resolvedFromApi]);

  const resolveLoading = resolveEnabled && Boolean(value) && resolveQuery.isFetching && !resolvedFromApi && !picked;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!open) {
        return;
      }
      const el = containerRef.current;
      if (el && !el.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);

    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const selectItem = useCallback(
    (item: LookupItem) => {
      setPicked({ id: item.id, label: item.label, description: item.description });
      onChange(item.id);
      setOpen(false);
      setSearchInput("");
    },
    [onChange],
  );

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (items.length === 0) {
        return;
      }
      setActiveIdx((i) => Math.min(items.length - 1, i + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (items.length === 0) {
        return;
      }
      setActiveIdx((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const row = items[activeIdx];
      if (row) {
        selectItem(row);
      }
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full space-y-1.5", className)}>
      {label ? <Label htmlFor={inputId}>{label}</Label> : null}
      <div className="relative flex gap-1">
        <div className="relative min-w-0 flex-1">
          <input
            id={inputId}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            disabled={disabled}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            )}
            placeholder={placeholder}
            value={open ? searchInput : closedLabel}
            onChange={(e) => {
              if (!open) {
                return;
              }
              setSearchInput(e.target.value);
            }}
            onFocus={() => {
              if (!disabled) {
                setOpen(true);
              }
            }}
            onKeyDown={onInputKeyDown}
          />
          <button
            type="button"
            className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            aria-label={open ? "Close options" : "Open options"}
            tabIndex={-1}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (disabled) {
                return;
              }
              setOpen((o) => !o);
            }}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden />
          </button>
        </div>
        {nullable && value && !disabled ? (
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-10 shrink-0"
            aria-label="Clear selection"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setPicked(null);
              onChange(null);
              setOpen(false);
            }}
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        ) : null}
      </div>

      {resolveLoading ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Resolving selection…
        </p>
      ) : null}
      {resolveQuery.isError && value && !closedLabel ? (
        <p className="text-xs text-destructive" role="alert">
          {(resolveQuery.error as Error).message}
        </p>
      ) : null}

      {open ? (
        <div
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md"
        >
          {searchQuery.isFetching ? (
            <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading…
            </div>
          ) : searchQuery.isError ? (
            <p className="px-3 py-3 text-sm text-destructive" role="alert">
              {(searchQuery.error as Error).message}
            </p>
          ) : items.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">No matches.</p>
          ) : (
            items.map((item, idx) => (
              <div
                key={item.id}
                role="option"
                aria-selected={idx === activeIdx}
                tabIndex={-1}
                className={cn(
                  "cursor-pointer px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                  idx === activeIdx && "bg-accent text-accent-foreground",
                )}
                onMouseEnter={() => setActiveIdx(idx)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectItem(item)}
              >
                <div className="font-medium leading-tight">{item.label}</div>
                {item.description ? (
                  <div className="text-xs opacity-80">{item.description}</div>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

export function CompanyLookup(props: Omit<AsyncEntityLookupProps, "resource">) {
  return <AsyncEntityLookup resource="companies" {...props} />;
}

export function UserLookup(props: Omit<AsyncEntityLookupProps, "resource">) {
  return <AsyncEntityLookup resource="users" {...props} />;
}

export function BookingLookup(props: Omit<AsyncEntityLookupProps, "resource">) {
  return <AsyncEntityLookup resource="bookings" {...props} />;
}

export function RouteLookup(props: Omit<AsyncEntityLookupProps, "resource">) {
  return <AsyncEntityLookup resource="routes" {...props} />;
}

export function OrderLookup(props: Omit<AsyncEntityLookupProps, "resource">) {
  return <AsyncEntityLookup resource="orders" {...props} />;
}

export function KnifeLookup(props: Omit<AsyncEntityLookupProps, "resource">) {
  return <AsyncEntityLookup resource="knives" {...props} />;
}

export function LocationLookup(props: Omit<AsyncEntityLookupProps, "resource">) {
  return <AsyncEntityLookup resource="locations" {...props} />;
}

export function ContactLookup(props: Omit<AsyncEntityLookupProps, "resource">) {
  return <AsyncEntityLookup resource="contacts" {...props} />;
}
