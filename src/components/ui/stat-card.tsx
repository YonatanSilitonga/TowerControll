"use client";

import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { CARD_PADDING, FONT_SIZES, FONT_WEIGHTS, ICON_SIZES } from "@/lib/design-tokens";

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: number; // positive or negative percentage
  icon?: LucideIcon;
  color?: "blue" | "green" | "purple" | "amber";
}

const colorMap = {
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  green: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
};

export function StatCard({
  label,
  value,
  trend,
  icon: Icon,
  color = "blue",
}: StatCardProps) {
  const isTrendUp = trend && trend > 0;
  const TrendIcon = isTrendUp ? TrendingUp : TrendingDown;

  return (
    <div className={`rounded-lg border border-slate-200 bg-white ${CARD_PADDING.default} dark:border-slate-800 dark:bg-slate-900`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={`${FONT_SIZES.caption} ${FONT_WEIGHTS.medium} uppercase tracking-wider text-slate-500 dark:text-slate-400`}>
            {label}
          </p>
          <div className="mt-3 flex items-baseline gap-2">
            <p className={`${FONT_SIZES.metric} ${FONT_WEIGHTS.bold} text-slate-900 dark:text-white`}>
              {value}
            </p>
            {trend !== undefined && (
              <div className={`flex items-center gap-1 text-xs font-medium ${isTrendUp ? "text-green-600 dark:text-green-400" : "text-rose-600 dark:text-rose-400"}`}>
                <TrendIcon className={ICON_SIZES.sm} />
                <span>{Math.abs(trend)}%</span>
              </div>
            )}
          </div>
        </div>
        {Icon && (
          <div className={`flex h-9 w-9 items-center justify-center rounded-md ${colorMap[color]}`}>
            <Icon className={ICON_SIZES.md} />
          </div>
        )}
      </div>
    </div>
  );
}
