"use client";

import { cn } from "@/lib/utils";
import { BADGE_STYLES } from "@/lib/design-tokens";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "sm" | "lg" | "success" | "warning" | "error" | "info";
  children: React.ReactNode;
}

const variantClasses = {
  default: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  sm: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  lg: "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  error: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
};

const sizeClasses = {
  default: BADGE_STYLES.default,
  sm: BADGE_STYLES.sm,
  lg: BADGE_STYLES.lg,
};

export function Badge({
  variant = "default",
  className,
  children,
  ...props
}: BadgeProps) {
  const sizeClass = sizeClasses[variant === "default" ? "default" : variant === "sm" ? "sm" : "lg"];
  const variantClass = variantClasses[variant];

  return (
    <div
      className={cn(sizeClass, variantClass, "inline-flex items-center whitespace-nowrap", className)}
      {...props}
    >
      {children}
    </div>
  );
}
