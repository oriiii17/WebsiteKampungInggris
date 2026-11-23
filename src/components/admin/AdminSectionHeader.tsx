import type { HTMLAttributes, ReactNode } from "react";

interface AdminSectionHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function AdminSectionHeader({ title, description, actions, className = "" }: AdminSectionHeaderProps) {
  return (
    <div className={`flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div className="min-w-0">
        <div className="inline-flex max-w-full items-center rounded-full border border-[#d2c5ad] bg-[#e8eee5] px-4 py-2 text-lg font-extrabold text-[#183b2d]">{title}</div>
        {description && <p className="mt-1 max-w-2xl text-sm leading-6 text-[#625f54]">{description}</p>}
      </div>
      {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{actions}</div>}
    </div>
  );
}

export function AdminToolbar({ children, className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end ${className}`}>{children}</div>;
}
