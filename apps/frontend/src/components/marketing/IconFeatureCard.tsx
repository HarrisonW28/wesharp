import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type IconFeatureCardProps = {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  className?: string;
};

export function IconFeatureCard({ icon: Icon, title, description, className }: IconFeatureCardProps) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md",
        className,
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="text-sm font-semibold leading-snug text-foreground">{title}</h3>
        <div className="text-sm leading-relaxed text-muted-foreground">{description}</div>
      </div>
    </div>
  );
}

type IconFeatureGridProps = {
  features: Array<{
    icon: LucideIcon;
    title: string;
    description: ReactNode;
  }>;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
};

export function IconFeatureGrid({ features, className, columns = 2 }: IconFeatureGridProps) {
  const gridClass = {
    1: "grid-cols-1",
    2: "md:grid-cols-2",
    3: "md:grid-cols-2 lg:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4",
  }[columns];

  return (
    <div className={cn("grid gap-4", gridClass, className)}>
      {features.map((feature, idx) => (
        <IconFeatureCard
          key={`${feature.title}-${idx}`}
          icon={feature.icon}
          title={feature.title}
          description={feature.description}
        />
      ))}
    </div>
  );
}
