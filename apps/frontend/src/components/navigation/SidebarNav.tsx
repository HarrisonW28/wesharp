"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import type { NavItem, NavLeaf, NavSection } from "@/config/navigation";
import { navHrefIsActive } from "@/lib/nav-href-active";
import { cn } from "@/lib/utils";

export type SidebarNavProps = {
  items?: NavItem[];
  sections?: NavSection[];
  onNavigate?: () => void;
  className?: string;
};

function navItemIsActive(pathname: string, item: NavItem): boolean {
  if (item.href && navHrefIsActive(pathname, item.href)) return true;
  return Boolean(item.children?.some((c) => navHrefIsActive(pathname, c.href)));
}

function navEntryKey(item: NavItem): string {
  if (item.href) return item.href;
  if (item.children?.length) return `${item.title}:${item.children.map((c) => c.href).join(",")}`;
  return item.title;
}

function NavLeafLinkRow({ leaf, onNavigate }: { leaf: NavLeaf; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = navHrefIsActive(pathname, leaf.href);
  const Icon = leaf.icon;
  return (
    <Link
      href={leaf.href}
      onClick={() => onNavigate?.()}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors md:min-h-0 md:py-2 md:text-sm",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      <Icon className="h-5 w-5 shrink-0 opacity-90 md:h-4 md:w-4" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{leaf.title}</span>
    </Link>
  );
}

function NavBranch({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const children = item.children ?? [];
  if (children.length === 0) return null;

  const childActive = children.some((c) => navHrefIsActive(pathname, c.href));
  const parentActive = item.href ? navHrefIsActive(pathname, item.href) : false;
  const branchActive = childActive || parentActive;

  const [open, setOpen] = useState(branchActive);
  useEffect(() => {
    setOpen(branchActive);
  }, [branchActive]);

  const Icon = item.icon;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full min-h-11 items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-[15px] font-medium transition-colors md:min-h-0 md:py-2 md:text-sm",
          open || branchActive
            ? "text-foreground"
            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
          branchActive && !open ? "bg-accent/40" : null,
        )}
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-3">
          <Icon className="h-5 w-5 shrink-0 opacity-90 md:h-4 md:w-4" aria-hidden />
          <span className="min-w-0 truncate">{item.title}</span>
        </span>
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground/90 transition-transform duration-200 ease-out",
            open && "rotate-90",
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          className="space-y-1.5 rounded-xl border border-border/60 bg-muted/25 p-1.5 shadow-sm dark:bg-muted/15"
          role="region"
          aria-label={`${item.title} links`}
        >
          {item.href ? (
            <div className="px-0.5 pb-0.5">
              <NavLeafLinkRow
                leaf={{
                  title: item.title,
                  href: item.href,
                  icon: item.icon,
                  permission: item.permission,
                  description: item.description,
                }}
                onNavigate={onNavigate}
              />
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            {children.map((child) => {
              const CIcon = child.icon;
              const active = navHrefIsActive(pathname, child.href);
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={() => onNavigate?.()}
                  className={cn(
                    "flex min-h-[3.25rem] gap-3 rounded-lg border bg-card/80 px-3 py-2.5 shadow-sm backdrop-blur-[2px] transition-colors md:min-h-0",
                    active
                      ? "border-primary/40 bg-accent text-accent-foreground"
                      : "border-border/70 text-foreground hover:border-border hover:bg-accent/55",
                  )}
                >
                  <CIcon className="mt-0.5 h-5 w-5 shrink-0 opacity-90 md:h-4 md:w-4" aria-hidden />
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-sm font-semibold leading-snug">{child.title}</span>
                    {child.description ? (
                      <span className="mt-0.5 block text-xs font-normal leading-snug text-muted-foreground">
                        {child.description}
                      </span>
                    ) : null}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NavEntryRow({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  if (item.children?.length) {
    return <NavBranch item={item} onNavigate={onNavigate} />;
  }
  if (item.href) {
    return (
      <NavLeafLinkRow
        leaf={{
          title: item.title,
          href: item.href,
          icon: item.icon,
          permission: item.permission,
          description: item.description,
        }}
        onNavigate={onNavigate}
      />
    );
  }
  return null;
}

function sectionHasActiveChild(section: NavSection, pathname: string): boolean {
  return section.items.some((item) => navItemIsActive(pathname, item));
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
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground/80 transition-transform duration-200 ease-out",
            open && "rotate-90",
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="flex flex-col gap-0.5 pb-1">
          {section.items.map((item) => (
            <NavEntryRow key={navEntryKey(item)} item={item} onNavigate={onNavigate} />
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
          <NavEntryRow key={navEntryKey(item)} item={item} onNavigate={onNavigate} />
        ))}
      </nav>
    );
  }

  return null;
}
