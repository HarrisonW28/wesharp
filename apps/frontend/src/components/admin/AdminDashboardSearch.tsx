"use client";

import { useRouter } from "next/navigation";
import {
  Building2,
  CalendarClock,
  ClipboardList,
  Loader2,
  MapPin,
  Route as RouteIcon,
  Search,
  UserRound,
  Users,
  Utensils,
} from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  DASHBOARD_SEARCH_SECTION_LABEL,
  DashboardSearchItemSchema,
  DashboardSearchResponseSchema,
  type DashboardSearchItem,
  type DashboardSearchKind,
} from "@/lib/api/admin-dashboard-search-schema";
import { useAdminApi } from "@/lib/api/use-admin-api";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

const KIND_ICONS: Record<DashboardSearchKind, typeof Building2> = {
  company: Building2,
  booking: CalendarClock,
  order: ClipboardList,
  knife: Utensils,
  user: UserRound,
  route: RouteIcon,
  contact: Users,
  location: MapPin,
};

function ResultAvatar({ item }: { item: DashboardSearchItem }) {
  const Icon = KIND_ICONS[item.kind];
  const label = item.label.trim();
  const initial = label.charAt(0).toUpperCase() || "?";

  if (item.image_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote API URLs; not in next/image config
      <img
        src={item.image_url}
        alt=""
        className="h-10 w-10 shrink-0 rounded-md border border-border/80 bg-muted object-cover"
      />
    );
  }

  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border/80 bg-muted text-sm font-semibold text-muted-foreground"
      aria-hidden
    >
      {item.kind === "company" || item.kind === "user" ? initial : <Icon className="h-4 w-4 opacity-80" />}
    </div>
  );
}

export function AdminDashboardSearch() {
  const admin = useAdminApi();
  const router = useRouter();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 220);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setDebounced("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "k" || (!e.metaKey && !e.ctrlKey)) {
        return;
      }
      const el = e.target;
      if (el instanceof Element && el.closest("input, textarea, select, [contenteditable=true]")) {
        return;
      }
      e.preventDefault();
      setOpen((v) => !v);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const canSearch =
    debounced.length >= 2 || (debounced.length > 0 && /^[0-9a-f-]{36}$/i.test(debounced));

  const searchQuery = useQuery({
    queryKey: ["admin-dashboard-search", debounced],
    enabled: open && canSearch,
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set("q", debounced);
      const res = await admin.json<unknown>(`/api/admin/dashboard-search?${qs.toString()}`);
      if (!res.ok) {
        throw new Error(res.message);
      }
      const parsed = DashboardSearchResponseSchema.safeParse(res.data);
      if (!parsed.success) {
        throw new Error("Unexpected search response.");
      }
      return parsed.data.data.items.map((row) => DashboardSearchItemSchema.parse(row));
    },
    staleTime: 15_000,
  });

  const grouped = useMemo(() => {
    const items = searchQuery.data ?? [];
    const map = new Map<DashboardSearchKind, DashboardSearchItem[]>();
    for (const row of items) {
      const list = map.get(row.kind) ?? [];
      list.push(row);
      map.set(row.kind, list);
    }
    const order: DashboardSearchKind[] = [
      "company",
      "booking",
      "order",
      "knife",
      "user",
      "route",
      "contact",
      "location",
    ];
    return order.flatMap((kind) => {
      const rows = map.get(kind);
      if (!rows?.length) return [];
      return [{ kind, rows }] as const;
    });
  }, [searchQuery.data]);

  const navigateTo = useCallback(
    (path: string) => {
      setOpen(false);
      router.push(path);
    },
    [router],
  );

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Search workspace"
          onClick={() => setOpen(true)}
        >
          <Search className="h-5 w-5" aria-hidden />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="hidden h-10 w-full max-w-2xl items-center gap-3 rounded-lg border bg-muted/35 px-4 text-sm font-normal shadow-sm hover:bg-muted/60 md:inline-flex"
          aria-label="Search workspace"
          onClick={() => setOpen(true)}
        >
          <Search className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-left text-muted-foreground">Search companies, bookings, orders…</span>
          <kbd className="pointer-events-none hidden h-5 shrink-0 select-none items-center gap-0.5 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
            ⌘K
          </kbd>
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[min(85vh,36rem)] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Search workspace</DialogTitle>
          <DialogDescription>Find companies, bookings, orders, knives, and more.</DialogDescription>
        </DialogHeader>
        <div className="border-b px-3 py-2">
          <Input
            ref={inputRef}
            id={inputId}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search companies, bookings, knives…"
            className="h-11 border-0 text-base shadow-none focus-visible:ring-0"
            autoComplete="off"
            autoCorrect="off"
          />
        </div>
        <ScrollArea className="h-[min(60vh,22rem)]">
          <div className="space-y-4 p-3 pb-4">
            {!canSearch ? (
              <p className="px-1 text-sm text-muted-foreground">Type at least two characters to search.</p>
            ) : searchQuery.isPending ? (
              <div className="flex items-center gap-2 px-1 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Searching…
              </div>
            ) : searchQuery.isError ? (
              <p className="px-1 text-sm text-destructive">
                {searchQuery.error instanceof Error ? searchQuery.error.message : "Search failed."}
              </p>
            ) : grouped.length === 0 ? (
              <p className="px-1 text-sm text-muted-foreground">No matches.</p>
            ) : (
              grouped.map(({ kind, rows }) => (
                <div key={kind} className="space-y-1.5">
                  <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {DASHBOARD_SEARCH_SECTION_LABEL[kind]}
                  </p>
                  <ul className="space-y-1">
                    {rows.map((item) => (
                      <li key={`${item.kind}:${item.id}`}>
                        <button
                          type="button"
                          onClick={() => navigateTo(item.path)}
                          className={cn(
                            "flex w-full items-start gap-3 rounded-xl border border-transparent px-2 py-2 text-left transition-colors",
                            "hover:border-border hover:bg-accent/60",
                          )}
                        >
                          <ResultAvatar item={item} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium leading-snug">{item.label}</span>
                            {item.description ? (
                              <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                {item.description}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
    </>
  );
}
