"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { INPUT_STYLES, FORM_STYLES } from "@/lib/design-tokens";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  compact?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, compact = false, className, ...props }, ref) => {
    const baseStyle = compact ? INPUT_STYLES.compact : INPUT_STYLES.base;
    const focusStyle = INPUT_STYLES.focus;
    
    return (
      <div>
        {label && <label className={FORM_STYLES.label}>{label}</label>}
        <input
          ref={ref}
          className={cn(baseStyle, focusStyle, "outline-none transition-all", error && "border-rose-500 focus:ring-rose-500", className)}
          {...props}
        />
        {error && <p className={FORM_STYLES.error}>{error}</p>}
        {helper && !error && <p className={FORM_STYLES.helper}>{helper}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
