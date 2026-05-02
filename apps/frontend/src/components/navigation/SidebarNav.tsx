"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import type { NavItem, NavSection } from "@/config/navigation";
import { cn } from "@/lib/utils";

export type SidebarNavProps = {
  items?: NavItem[];
  sections?: NavSection[];
  onNavigate?: () => void;
  className?: string;
};

function NavLinkRow({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={() => onNavigate?.()}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors md:min-h-0 md:py-2 md:text-sm",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      <Icon className="h-5 w-5 shrink-0 opacity-90 md:h-4 md:w-4" aria-hidden />
      {item.title}
    </Link>
  );
}

function sectionHasActiveChild(section: NavSection, pathname: string): boolean {
  return section.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}

function CollapsibleNavSection({
  section,
  onNavigate,
}: {
  section: NavSection;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const hasActiveChild = useMemo(() => sectionHasActiveChild(section, pathname), [section, pathname]);

  const [open, setOpen] = useState(hasActiveChild);

  useEffect(() => {
    setOpen(hasActiveChild);
  }, [hasActiveChild]);

  return (
    <div className="flex flex-col gap-1 border-t border-border/60 pt-2 first:border-t-0 first:pt-0 md:pt-2.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full min-h-11 items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent/50 md:min-h-0"
        aria-expanded={open}
      >
        <span className="min-w-0 truncate">{section.label}</span>
        <ChevronRight
          className={cn("h-4 w-4 shrink-0 text-muted-foreground/80 transition-transform", open && "rotate-90")}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="flex flex-col gap-0.5 pb-1">
          {section.items.map((item) => (
            <NavLinkRow key={item.href} item={item} onNavigate={onNavigate} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SidebarNav({ items, sections, onNavigate, className }: SidebarNavProps) {
  if (sections !== undefined && sections.length > 0) {
    return (
      <nav className={cn("flex flex-col gap-2 md:gap-3", className)} aria-label="Primary">
        {sections.map((section) => (
          <CollapsibleNavSection key={section.label} section={section} onNavigate={onNavigate} />
        ))}
      </nav>
    );
  }

  if (items !== undefined && items.length > 0) {
    return (
      <nav className={cn("flex flex-col gap-0.5 p-2 md:gap-1 md:p-3", className)} aria-label="Primary">
        {items.map((item) => (
          <NavLinkRow key={item.href} item={item} onNavigate={onNavigate} />
        ))}
      </nav>
    );
  }

  return null;
}
