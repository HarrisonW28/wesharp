"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useMemo, type ReactNode } from "react";

import { Landmark } from "lucide-react";

import { useBackendMe } from "@/hooks/use-backend-me";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { FINANCE_BASE, visibleFinanceSections } from "./finance-sections";

function needsDividerBefore(href: string, prevHref: string | undefined): boolean {
  if (!prevHref) return false;
  if (prevHref === FINANCE_BASE && href.startsWith(`${FINANCE_BASE}/`)) return true;
  const prevCostsArea =
    prevHref.startsWith(`${FINANCE_BASE}/costs`) ||
    prevHref === `${FINANCE_BASE}/consumables` ||
    prevHref === `${FINANCE_BASE}/cost-ledger`;
  const nextExternalOps = href.startsWith("/admin/payments") || href.startsWith("/admin/invoices");
  return prevCostsArea && (nextExternalOps || href.startsWith("/admin/subscription"));
}

export function FinanceChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data } = useBackendMe();

  const permissions = useMemo(() => new Set(data?.data?.permissions ?? []), [data?.data?.permissions]);
  const sections = useMemo(() => visibleFinanceSections(permissions), [permissions]);

  const pickerValue = useMemo(() => {
    if (sections.some((s) => s.href === pathname)) return pathname;
    const matchPrefix = [...sections].sort((a, b) => b.href.length - a.href.length).find((s) => pathname.startsWith(`${s.href}/`));
    return matchPrefix?.href ?? sections[0]?.href ?? FINANCE_BASE;
  }, [pathname, sections]);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
      <div className="lg:hidden">
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Finance</p>
        <Select value={pickerValue} onValueChange={(href) => router.push(href)}>
          <SelectTrigger className="h-11 w-full rounded-lg shadow-sm" aria-label="Choose finance section">
            <SelectValue placeholder="Jump to section" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[min(70vh,22rem)] w-[var(--radix-select-trigger-width)]">
            {sections.map((s) => (
              <SelectItem key={s.href} value={s.href}>
                {s.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <aside className="hidden lg:block lg:w-56 lg:shrink-0">
        <div className="mb-3 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Landmark className="h-3.5 w-3.5 opacity-80" aria-hidden />
          Finance
        </div>
        <nav aria-label="Finance sections" className="flex flex-col gap-0.5">
          {sections.map((s, i) => {
            const Icon = s.icon;
            const active = pathname === s.href || (s.href !== FINANCE_BASE && pathname.startsWith(`${s.href}/`));
            const prev = sections[i - 1]?.href;
            const divider = needsDividerBefore(s.href, prev);

            return (
              <Fragment key={s.href}>
                {divider ? <div className="my-2 border-t border-border" role="separator" /> : null}
                <Link
                  href={s.href}
                  title={s.description}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors lg:w-full",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                  <span className="truncate">{s.title}</span>
                </Link>
              </Fragment>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
