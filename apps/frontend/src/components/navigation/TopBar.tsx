"use client";

import { Menu } from "lucide-react";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TopBarProps = {
  title?: ReactNode;
  subtitle?: string;
  onMenuClick?: () => void;
  showMenu?: boolean;
  /** Desktop-focused strip (e.g. wide search). Mobile still shares this row between title and actions. */
  center?: ReactNode;
  /** Account menu, company switcher, etc. */
  trailing?: ReactNode;
  className?: string;
};

export function TopBar({ title, subtitle, onMenuClick, showMenu, center, trailing, className }: TopBarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex min-h-14 items-center gap-2 border-b bg-background/80 px-3 py-2 backdrop-blur-md md:h-14 md:gap-3 md:px-6 md:py-0",
        className,
      )}
    >
      {showMenu ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="-ml-1 h-11 min-h-11 min-w-11 shrink-0 touch-manipulation md:hidden md:h-10 md:min-h-10 md:min-w-10"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6 md:h-5 md:w-5" />
        </Button>
      ) : null}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col justify-center",
          center ? "md:max-w-[13rem] md:flex-none md:shrink-0 lg:max-w-[16rem]" : "",
        )}
      >
        {title ? (
          typeof title === "string" ? (
            <h1 className="truncate text-lg font-semibold leading-tight md:text-base">{title}</h1>
          ) : (
            <>
              <span className="sr-only">WeSharp</span>
              <div className="flex min-w-0 items-center">{title}</div>
            </>
          )
        ) : null}
        {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {center ? (
        <div className="flex min-w-0 flex-1 justify-center px-0.5 md:px-2">
          <div className="w-full max-w-2xl">{center}</div>
        </div>
      ) : null}
      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden md:flex md:items-center">
          <ThemeToggle />
        </div>
        {trailing}
      </div>
    </header>
  );
}
