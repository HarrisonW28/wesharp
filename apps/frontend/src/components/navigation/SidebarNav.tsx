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
  if (item.children?.length)
    return `${item.title}:${item.children.map((c) => c.href).join(",")}`;
  return item.title;
}

function NavLeafLinkRow({
  leaf,
  onNavigate,
  nested,
}: {
  leaf: NavLeaf;
  onNavigate?: () => void;
  /** Under a branch group — matches flat rows, optional two-line + description */
  nested?: boolean;
}) {
  const pathname = usePathname();
  const active = navHrefIsActive(pathname, leaf.href);
  const Icon = leaf.icon;
  const iconClass =
    nested && leaf.description
      ? "mt-0.5 h-4 w-4 shrink-0 opacity-90"
      : nested
        ? "h-4 w-4 shrink-0 opacity-90"
        : "h-5 w-5 shrink-0 opacity-90 md:h-4 md:w-4";

  if (nested && leaf.description) {
    return (
      <Link
        href={leaf.href}
        onClick={() => onNavigate?.()}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-10 gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors md:min-h-0 items-start",
          active
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
        )}
      >
        <Icon className={iconClass} aria-hidden />
        <span className="min-w-0 flex-1 text-left">
          <span className="block font-medium leading-snug">{leaf.title}</span>
          <span
            className={cn(
              "mt-0.5 block text-xs font-normal leading-snug",
              active ? "text-accent-foreground/80" : "text-muted-foreground",
            )}
          >
            {leaf.description}
          </span>
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={leaf.href}
      onClick={() => onNavigate?.()}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors md:py-2 md:text-sm",
        nested
          ? "min-h-10 items-center md:min-h-0"
          : "min-h-11 items-center md:min-h-0",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      <Icon className={iconClass} aria-hidden />
      <span className="min-w-0 flex-1 truncate">{leaf.title}</span>
    </Link>
  );
}

function NavBranch({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const children = item.children ?? [];

  const childActive =
    children.length > 0 &&
    children.some((c) => navHrefIsActive(pathname, c.href));
  const parentActive = item.href ? navHrefIsActive(pathname, item.href) : false;
  const branchActive = childActive || parentActive;

  const [open, setOpen] = useState(branchActive);
  useEffect(() => {
    setOpen(branchActive);
  }, [branchActive]);

  if (children.length === 0) return null;

  const Icon = item.icon;

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] font-medium transition-colors md:min-h-0 md:py-2 md:text-sm",
          open || branchActive
            ? "text-foreground"
            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
          branchActive && !open ? "bg-accent/40" : null,
        )}
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-3">
          <Icon
            className="h-5 w-5 shrink-0 opacity-90 md:h-4 md:w-4"
            aria-hidden
          />
          <span className="min-w-0 truncate">{item.title}</span>
        </span>
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground/80 transition-transform duration-200 ease-out md:h-3.5 md:w-3.5",
            open && "rotate-90",
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          className="ml-2 space-y-0.5 border-l border-border/40 pl-3 dark:border-border/50"
          role="region"
          aria-label={`${item.title} links`}
        >
          {item.href ? (
            <div className="pb-0.5 pt-0.5">
              <NavLeafLinkRow
                nested
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
          <div className="flex flex-col gap-px pb-0.5 pt-0.5">
            {children.map((child) => (
              <NavLeafLinkRow
                key={child.href}
                nested
                leaf={child}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NavEntryRow({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: () => void;
}) {
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
  sectionIndex,
  onNavigate,
}: {
  section: NavSection;
  /** Used for a light divider between groups — first section is flush to the chrome. */
  sectionIndex: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const hasActiveChild = useMemo(
    () => sectionHasActiveChild(section, pathname),
    [section, pathname],
  );

  const [open, setOpen] = useState(hasActiveChild);

  useEffect(() => {
    setOpen(hasActiveChild);
  }, [hasActiveChild]);

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        sectionIndex > 0 &&
          "mt-2 border-t border-border/30 pt-3 md:mt-3 md:pt-3.5",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full min-h-11 items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-[15px] font-medium transition-colors hover:bg-accent/60 md:min-h-0 md:py-2 md:text-sm",
          hasActiveChild
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-expanded={open}
      >
        <span className="min-w-0 truncate">{section.label}</span>
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground/80 transition-transform duration-200 ease-out md:h-3.5 md:w-3.5",
            open && "rotate-90",
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="flex flex-col gap-1 pb-0.5">
          {section.items.map((item) => (
            <NavEntryRow
              key={navEntryKey(item)}
              item={item}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SidebarNav({
  items,
  sections,
  onNavigate,
  className,
}: SidebarNavProps) {
  if (sections !== undefined && sections.length > 0) {
    return (
      <nav className={cn("flex flex-col", className)} aria-label="Primary">
        {sections.map((section, sectionIndex) => (
          <CollapsibleNavSection
            key={section.label}
            section={section}
            sectionIndex={sectionIndex}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    );
  }

  if (items !== undefined && items.length > 0) {
    return (
      <nav
        className={cn("flex flex-col gap-0.5 p-2 md:gap-1 md:p-3", className)}
        aria-label="Primary"
      >
        {items.map((item) => (
          <NavEntryRow
            key={navEntryKey(item)}
            item={item}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    );
  }

  return null;
}
