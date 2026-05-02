"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavLeaf } from "@/config/navigation";
import { navHrefIsActive } from "@/lib/nav-href-active";
import { cn } from "@/lib/utils";

type MobileBottomNavProps = {
  items: NavLeaf[];
};

export function MobileBottomNav({ items }: MobileBottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 backdrop-blur-md md:hidden"
      aria-label="Route navigation"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around gap-1 px-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = navHrefIsActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[3.25rem] min-w-0 max-w-[5rem] flex-1 touch-manipulation flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-xs font-medium leading-tight",
                active ? "text-primary" : "text-muted-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={cn("h-6 w-6 shrink-0", active ? "opacity-100" : "opacity-70")} aria-hidden />
              <span className="max-w-full truncate text-center leading-none">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
