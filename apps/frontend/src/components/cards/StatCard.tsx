"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  title: string;
  value: string;
  hint?: string;
  trend?: string;
  trendPositive?: boolean;
  icon: LucideIcon;
  className?: string;
};

export function StatCard({ title, value, hint, trend, trendPositive = true, icon: Icon, className }: StatCardProps) {
  return (
    <motion.div
      className="h-full"
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className={cn("flex h-full flex-col overflow-hidden", className)}>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <CardTitle className="min-w-0 flex-1 pr-2 text-sm font-medium leading-snug text-muted-foreground">{title}</CardTitle>
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-2">
          <div className="text-3xl font-semibold tracking-tight">{value}</div>
          {trend || hint ? (
            <div className="mt-auto space-y-2 pt-0.5">
              {trend ? (
                <p className={cn("text-xs", trendPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                  {trend}
                </p>
              ) : null}
              {hint ? <p className="break-words text-xs text-muted-foreground">{hint}</p> : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  );
}
