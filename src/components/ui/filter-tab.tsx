"use client";

import { cn } from "@/lib/utils";
import { BUTTON_HEIGHTS, GAPS } from "@/lib/design-tokens";

interface FilterTabProps {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}

interface FilterTabsProps {
  tabs: FilterTabProps[];
  className?: string;
}

export function FilterTab({
  label,
  active,
  onClick,
  disabled = false,
}: FilterTabProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-lg px-3 text-xs font-semibold capitalize transition-all",
        BUTTON_HEIGHTS.md,
        active
          ? "bg-[#FEA103] text-white"
          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {label}
    </button>
  );
}

export function FilterTabs({ tabs, className }: FilterTabsProps) {
  return (
    <div className={cn(`flex flex-wrap items-center ${GAPS.sm}`, className)}>
      {tabs.map((tab, idx) => (
        <FilterTab key={idx} {...tab} />
      ))}
    </div>
  );
}
