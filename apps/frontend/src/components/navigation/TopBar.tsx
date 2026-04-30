"use client";

import { Menu } from "lucide-react";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

type TopBarProps = {
  title?: ReactNode;
  subtitle?: string;
  onMenuClick?: () => void;
  showMenu?: boolean;
  /** Account menu, company switcher, etc. */
  trailing?: ReactNode;
};

export function TopBar({ title, subtitle, onMenuClick, showMenu, trailing }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
      {showMenu ? (
        <Button type="button" variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        {title ? (
          typeof title === "string" ? (
            <h1 className="truncate text-base font-semibold leading-tight">{title}</h1>
          ) : (
            <>
              <span className="sr-only">WeSharp</span>
              <div className="flex min-w-0 items-center text-xl leading-none [&_img]:max-h-7">{title}</div>
            </>
          )
        ) : null}
        {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <ThemeToggle />
        {trailing}
      </div>
    </header>
  );
}
