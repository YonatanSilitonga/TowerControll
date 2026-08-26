"use client";

import { LucideIcon } from "lucide-react";
import { CARD_PADDING, FONT_SIZES, FONT_WEIGHTS, ICON_SIZES } from "@/lib/design-tokens";

interface KPICardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  size?: "sm" | "md" | "lg";
}

export function KPICard({
  label,
  value,
  icon: Icon,
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
        <Icon className={`${config.icon} text-slate-500 dark:text-slate-400`} />
      </div>
    </div>
  );
}
