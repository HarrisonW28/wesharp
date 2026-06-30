import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ProcessStepCardProps = {
  step: number | string;
  title: string;
  description: ReactNode;
  className?: string;
};

export function ProcessStepCard({ step, title, description, className }: ProcessStepCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-base font-semibold text-primary">
          {step}
        </span>
        <div className="flex-1 space-y-2">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <div className="text-sm leading-relaxed text-muted-foreground">{description}</div>
        </div>
      </div>
    </div>
  );
}

type ProcessStepsGridProps = {
  steps: Array<{
    step: number | string;
    title: string;
    description: ReactNode;
  }>;
  className?: string;
  columns?: 1 | 2 | 3;
};

export function ProcessStepsGrid({ steps, className, columns = 2 }: ProcessStepsGridProps) {
  const gridClass = {
    1: "grid-cols-1",
    2: "md:grid-cols-2",
    3: "md:grid-cols-2 lg:grid-cols-3",
  }[columns];

  return (
    <div className={cn("grid gap-4", gridClass, className)}>
      {steps.map((stepData, idx) => (
        <ProcessStepCard
          key={`${stepData.title}-${idx}`}
          step={stepData.step}
          title={stepData.title}
          description={stepData.description}
        />
      ))}
    </div>
  );
}
