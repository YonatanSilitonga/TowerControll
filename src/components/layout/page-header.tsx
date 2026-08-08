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
    <div className={cn("mb-6 flex flex-wrap items-start justify-between gap-4", className)}>
      <div>
        {crumbs && crumbs.length > 0 && (
          <nav className="mb-1.5 flex flex-wrap items-center gap-1 text-xs text-slate-400" aria-label="Breadcrumb">
            <Link href="/" className="inline-flex items-center gap-1 rounded hover:text-[#034075]">
              <Home className="h-3 w-3" /> Dashboard
            </Link>
            {crumbs.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                <ChevronRight className="h-3 w-3" />
                {c.href ? (
                  <Link href={c.href} className="rounded transition-colors hover:text-[#034075]">
                    {c.label}
                  </Link>
                ) : (
                  <span className="font-medium text-slate-600">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}