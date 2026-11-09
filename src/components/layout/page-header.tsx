import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface Crumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  /** Breadcrumb (opsional): mulai dari Beranda otomatis. */
  crumbs?: Crumb[];
  className?: string;
}

export function PageHeader({ title, description, actions, crumbs, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="min-w-0 flex-1 basis-full sm:basis-auto">
        {crumbs && crumbs.length > 0 && (
          <nav className="mb-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500" aria-label="Breadcrumb">
            <Link href="/" className="inline-flex items-center gap-1 rounded transition-colors hover:text-[#0c1e3a] dark:hover:text-white">
              <Home className="h-3.5 w-3.5" /> <span>Beranda</span>
            </Link>
            {crumbs.map((c, i) => (
              <span key={i} className="inline-flex min-w-0 items-center gap-1.5">
                <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-600 shrink-0" />
                {c.href ? (
                  <Link href={c.href} className="rounded transition-colors hover:text-[#0c1e3a] dark:hover:text-white">
                    {c.label}
                  </Link>
                ) : (
                  <span className="min-w-0 break-words font-medium text-slate-700 dark:text-slate-200">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="break-words text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">{title}</h1>
        {description && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">{description}</p>
        )}
      </div>
      {actions && <div className="flex max-w-full flex-wrap items-center gap-2 [&>button]:min-h-11 sm:[&>button]:min-h-0">{actions}</div>}
    </div>
  );
}