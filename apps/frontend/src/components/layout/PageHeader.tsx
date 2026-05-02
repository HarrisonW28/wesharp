import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  /** Status, workflow actions — kept beside the title (wrapping) instead of a full-width strip below. */
  titleRowEnd?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ title, description, titleRowEnd, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-5 md:flex-row md:items-start md:justify-between md:gap-6", className)}>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2">
          <h2 className="text-pretty text-2xl font-semibold tracking-tight md:text-3xl">{title}</h2>
          {titleRowEnd ? <div className="flex min-w-0 flex-wrap items-center gap-2">{titleRowEnd}</div> : null}
        </div>
        {description ? (
          <div className="max-w-2xl text-sm text-muted-foreground sm:text-base">{description}</div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full shrink-0 flex-col gap-2 [&>*]:w-full md:w-auto md:flex-row md:flex-wrap md:items-center md:[&>*]:w-auto">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
