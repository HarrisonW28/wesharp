import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-xl border px-4 py-3 text-sm shadow-sm [&_svg]:pointer-events-none [&_svg]:absolute [&_svg]:left-4 [&_svg]:top-4 [&_svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "border-border/70 bg-muted/40 text-foreground [&_svg]:text-muted-foreground",
        destructive:
          "border-destructive/35 bg-destructive/10 text-destructive dark:bg-destructive/15 [&_svg]:text-destructive",
        success:
          "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-950 dark:border-emerald-400/35 dark:bg-emerald-500/10 dark:text-emerald-100 [&_svg]:text-emerald-600 dark:[&_svg]:text-emerald-400",
        warning:
          "border-amber-500/40 bg-amber-500/[0.1] text-amber-950 dark:border-amber-400/35 dark:bg-amber-950/35 dark:text-amber-50 [&_svg]:text-amber-600 dark:[&_svg]:text-amber-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn("mb-1 text-base font-semibold leading-none tracking-tight", className)} {...props} />
  ),
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />
  ),
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
