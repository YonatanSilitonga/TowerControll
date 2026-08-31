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
  /** Breadcrumb (opsional): mulai dari Dashboard otomatis. */
  crumbs?: Crumb[];
  className?: string;
}

export function PageHeader({ title, description, actions, crumbs, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-start justify-between gap-4", className)}>
      <div>
        {crumbs && crumbs.length > 0 && (
          <nav className="mb-1.5 flex flex-wrap items-center gap-1 text-xs text-slate-400" aria-label="Breadcrumb">
            <Link href="/" className="inline-flex items-center gap-1 rounded hover:text-[#0c1e3a]">
              <Home className="h-3 w-3" /> Dashboard
            </Link>
            {crumbs.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                <ChevronRight className="h-3 w-3" />
                {c.href ? (
                  <Link href={c.href} className="rounded transition-colors hover:text-[#0c1e3a]">
                    {c.label}
                  </Link>
                ) : (
                  <span className="font-medium text-slate-600">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}