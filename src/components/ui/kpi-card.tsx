"use client";

import { LucideIcon } from "lucide-react";
import { CARD_PADDING, FONT_SIZES, FONT_WEIGHTS, ICON_SIZES } from "@/lib/design-tokens";

interface KPICardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: "blue" | "green" | "purple" | "amber" | "slate";
  size?: "sm" | "md" | "lg";
}

const colorMap = {
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  green: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export function KPICard({
  label,
  value,
  icon: Icon,
  color = "slate",
  size = "md",
}: KPICardProps) {
  const sizeClasses = {
    sm: {
      padding: CARD_PADDING.compact,
      label: FONT_SIZES.caption,
      value: FONT_SIZES.metric,
      icon: ICON_SIZES.md,
    },
    md: {
      padding: CARD_PADDING.default,
      label: FONT_SIZES.caption,
      value: FONT_SIZES.metric,
      icon: ICON_SIZES.md,
    },
    lg: {
      padding: CARD_PADDING.large,
      label: FONT_SIZES.body,
      value: "text-3xl",
      icon: ICON_SIZES.lg,
    },
  };

  const config = sizeClasses[size];

  return (
    <div className={`rounded-lg border border-slate-200 bg-white ${config.padding} dark:border-slate-800 dark:bg-slate-900`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`${config.label} ${FONT_WEIGHTS.medium} uppercase tracking-wider text-slate-500 dark:text-slate-400`}>
            {label}
          </p>
          <p className={`mt-3 ${config.value} ${FONT_WEIGHTS.bold} text-slate-900 dark:text-white`}>
            {value}
          </p>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-md ${colorMap[color]}`}>
          <Icon className={config.icon} />
        </div>
      </div>
    </div>
  );
}
