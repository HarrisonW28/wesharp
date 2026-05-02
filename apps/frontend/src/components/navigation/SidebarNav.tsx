"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavItem, NavSection } from "@/config/navigation";
import { cn } from "@/lib/utils";

export type SidebarNavProps = {
  items?: NavItem[];
  sections?: NavSection[];
  onNavigate?: () => void;
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
        "flex min-h-12 items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-colors md:min-h-0 md:py-2 md:text-sm",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      <Icon className="h-5 w-5 shrink-0 opacity-90 md:h-4 md:w-4" aria-hidden />
      {item.title}
    </Link>
  );
}

export function SidebarNav({ items, sections, onNavigate }: SidebarNavProps) {
  if (sections !== undefined && sections.length > 0) {
    return (
      <nav className="flex flex-col gap-5 overflow-y-auto p-2 md:max-h-[calc(100vh-8rem)] md:p-3" aria-label="Primary">
        {sections.map((section) => (
          <div key={section.label} className="flex flex-col gap-1">
            <p className="px-3 pb-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">{section.label}</p>
            {section.items.map((item) => (
              <NavLinkRow key={item.href} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </nav>
    );
  }

  if (items !== undefined && items.length > 0) {
    return (
      <nav className="flex flex-col gap-1 p-2 md:p-3" aria-label="Primary">
        {items.map((item) => (
          <NavLinkRow key={item.href} item={item} onNavigate={onNavigate} />
        ))}
      </nav>
    );
  }

  return null;
}
