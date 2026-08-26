/**
 * Design Tokens - Single source of truth untuk styling
 * Gunakan di semua component untuk konsistensi visual
 */

// ========== ICON SIZES ==========
export const ICON_SIZES = {
  xs: "h-3 w-3",        // smallest (badges)
  sm: "h-3.5 w-3.5",    // small
  base: "h-4 w-4",      // standard (DEFAULT)
  md: "h-5 w-5",        // medium (headers)
  lg: "h-6 w-6",        // large (hero)
} as const;

// ========== FONT SIZES ==========
export const FONT_SIZES = {
  label: "text-[10px]",      // smallest labels
  caption: "text-xs",        // captions
  body: "text-sm",           // body text
  title: "text-base",        // card titles
  heading: "text-lg",        // section headers
  metric: "text-2xl",        // KPI values (DEFAULT)
  pageTitle: "text-2xl",     // page h1
} as const;

// ========== FONT WEIGHTS ==========
export const FONT_WEIGHTS = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
} as const;

// ========== CARD PADDING ==========
export const CARD_PADDING = {
  compact: "p-3",       // dense layouts
  default: "p-4",       // standard (DEFAULT)
  large: "p-5",         // spacious
  xl: "p-6",            // extra space
} as const;

// ========== SPACING / GAPS ==========
export const GAPS = {
  xs: "gap-1",
  sm: "gap-2",
  base: "gap-3",        // DEFAULT
  md: "gap-4",
  lg: "gap-5",
} as const;

// ========== BUTTON HEIGHTS (Touch-friendly) ==========
export const BUTTON_HEIGHTS = {
  sm: "h-7",            // 28px
  md: "h-8",            // 32px (standard)
  lg: "h-10",           // 40px (mobile accessible)
} as const;

// ========== INPUT FIELDS (Standard) ==========
export const INPUT_STYLES = {
  base: "h-8 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100",
  focus: "focus:ring-2 focus:ring-[#FEA103] focus:border-transparent dark:focus:border-transparent",
  compact: "h-7 px-2 py-1.5 rounded-md border border-slate-200 bg-white text-xs dark:border-slate-700 dark:bg-slate-800",
} as const;

// ========== FORM LABELS & HELPERS ==========
export const FORM_STYLES = {
  label: "text-sm font-medium text-slate-700 dark:text-slate-300",
  helper: "text-xs text-slate-500 dark:text-slate-400 mt-1",
  error: "text-xs text-rose-600 dark:text-rose-400 mt-1",
} as const;

// ========== BADGES ==========
export const BADGE_STYLES = {
  default: "px-2 py-1 rounded-md text-xs font-medium",
  sm: "px-1.5 py-0.5 rounded-md text-[10px] font-semibold",
  lg: "px-2.5 py-1.5 rounded-lg text-sm font-medium",
} as const;

// ========== BORDER RADIUS ==========
export const BORDER_RADIUS = {
  sm: "rounded-md",
  base: "rounded-lg",   // DEFAULT
  lg: "rounded-xl",
  xl: "rounded-2xl",
} as const;

// ========== COLORS ==========
export const COLORS = {
  primary: "#0c1e3a",        // navy
  accent: "#FEA103",         // orange
  success: "bg-emerald-500 text-white",
  warning: "bg-amber-500 text-white",
  error: "bg-rose-500 text-white",
  info: "bg-blue-500 text-white",
} as const;

// ========== RESPONSIVE ==========
export const BREAKPOINTS = {
  sm: "sm",   // 640px
  md: "md",   // 768px
  lg: "lg",   // 1024px
  xl: "xl",   // 1280px
  "2xl": "2xl", // 1536px
} as const;

// ========== COMMON PATTERNS ==========
export const PATTERNS = {
  // Card base
  cardBase: "rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
  
  // Metric/KPI card
  metricCard: `${CARD_PADDING.default} rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900`,
  
  // Button base
  buttonBase: "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
  
  // Page header
  pageHeader: "border-b border-slate-200 bg-white px-8 py-6 dark:border-slate-800 dark:bg-slate-900",
  
  // Sidebar
  sidebarBase: "border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
  
  // Data table header row
  tableHeader: "border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50",
  
  // Data table body row
  tableRow: "border-b border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/50 transition-colors",
  
  // Empty state
  emptyState: "py-12 text-center",
} as const;

// ========== MODAL / DIALOG ==========
export const MODAL_STYLES = {
  backdrop: "fixed inset-0 bg-black/50 z-40",
  overlay: "fixed inset-0 z-50 flex items-center justify-center",
  content: "rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900 max-w-md w-full mx-4",
  header: "border-b border-slate-200 px-6 py-4 dark:border-slate-800",
  footer: "border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3 dark:border-slate-800",
} as const;
