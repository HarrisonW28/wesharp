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
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-3xl font-semibold tracking-tight">{value}</div>
          {trend ? (
            <p className={cn("text-xs", trendPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
              {trend}
            </p>
          ) : null}
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </CardContent>
      </Card>
    </motion.div>
  );
}
