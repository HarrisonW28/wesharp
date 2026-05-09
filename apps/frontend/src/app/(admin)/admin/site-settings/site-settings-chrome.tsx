"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { SITE_SETTINGS_BASE, SITE_SETTINGS_SECTIONS } from "./site-settings-sections";

const SITE_SETTINGS_PATHS = new Set([
  SITE_SETTINGS_BASE,
  ...SITE_SETTINGS_SECTIONS.map((s) => s.href),
]);

export function SiteSettingsChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const overviewActive = pathname === SITE_SETTINGS_BASE;

  const pickerValue = SITE_SETTINGS_PATHS.has(pathname) ? pathname : SITE_SETTINGS_BASE;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
      <div className="lg:hidden">
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Section</p>
        <Select value={pickerValue} onValueChange={(href) => router.push(href)}>
          <SelectTrigger className="h-11 w-full rounded-lg shadow-sm" aria-label="Choose site settings section">
            <SelectValue placeholder="Jump to section" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[min(70vh,22rem)] w-[var(--radix-select-trigger-width)]">
            <SelectItem value={SITE_SETTINGS_BASE}>Overview</SelectItem>
            {SITE_SETTINGS_SECTIONS.map((s) => (
              <SelectItem key={s.href} value={s.href}>
                {s.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <aside className="hidden lg:block lg:w-56 lg:shrink-0">
        <nav aria-label="Site settings sections" className="flex flex-col gap-0.5">
          <Link
            href={SITE_SETTINGS_BASE}
            aria-current={overviewActive ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              overviewActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            <LayoutGrid className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            Overview
          </Link>
          {SITE_SETTINGS_SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = pathname === s.href;
            return (
              <Link
                key={s.href}
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
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
