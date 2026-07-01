import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

type Step = {
  name: string;
};

type BookingWizardStepNavProps = {
  steps: readonly Step[];
  currentStep: number;
  className?: string;
};

/** Horizontal step labels with a primary underline on the active step. */
export function BookingWizardStepNav({ steps, currentStep, className }: BookingWizardStepNavProps) {
  return (
    <nav aria-label="Booking progress" className={cn("border-b border-border", className)}>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Booking progress</p>
        <p className="text-xs tabular-nums text-muted-foreground">
          Step {currentStep + 1}/{steps.length}
        </p>
      </div>
      <ol
        className="-mb-px flex overflow-x-auto [scrollbar-width:none] md:grid [&::-webkit-scrollbar]:hidden"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` } as CSSProperties}
      >
        {steps.map((step, index) => {
          const isCurrent = index === currentStep;
          const isComplete = index < currentStep;

          return (
            <li key={step.name} className="min-w-[5.5rem] shrink-0 md:min-w-0">
              <span
                className={cn(
                  "block border-b-2 px-3 py-2.5 text-center text-sm transition-colors md:px-1.5 md:text-xs lg:px-2 lg:text-sm",
                  isCurrent && "border-primary font-medium text-foreground",
                  !isCurrent && isComplete && "border-transparent text-muted-foreground",
                  !isCurrent && !isComplete && "border-transparent text-muted-foreground/45",
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                {step.name}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
