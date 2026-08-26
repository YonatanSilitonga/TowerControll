"use client";

import { AlertTriangle, Info, CheckCircle2, AlertCircle, X } from "lucide-react";
import { useState } from "react";
import { ICON_SIZES } from "@/lib/design-tokens";

type AlertType = "success" | "warning" | "error" | "info";

interface AlertBannerProps {
  type: AlertType;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const typeConfig = {
  success: {
    icon: CheckCircle2,
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-800 dark:text-emerald-300",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-800 dark:text-amber-300",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  error: {
    icon: AlertCircle,
    bg: "bg-rose-50 dark:bg-rose-950/30",
    border: "border-rose-200 dark:border-rose-800",
    text: "text-rose-800 dark:text-rose-300",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
  info: {
    icon: Info,
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-800 dark:text-blue-300",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
};

export function AlertBanner({
  type,
  message,
  dismissible = false,
  onDismiss,
}: AlertBannerProps) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const config = typeConfig[type];
  const Icon = config.icon;

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${config.bg} ${config.border} ${config.text}`}
    >
      <Icon className={`${ICON_SIZES.md} shrink-0 ${config.iconColor}`} />
      <p className="text-sm font-medium flex-1">{message}</p>
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="shrink-0 hover:opacity-70 transition-opacity"
          aria-label="Dismiss"
        >
          <X className={ICON_SIZES.base} />
        </button>
      )}
    </div>
  );
}
