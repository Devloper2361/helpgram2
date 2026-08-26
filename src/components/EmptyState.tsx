import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LucideIcon, Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionComponent?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  actionComponent,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-xl border border-dashed border-slate-200 bg-white/50 text-slate-600 space-y-3 max-w-md mx-auto my-4",
        className
      )}
    >
      <div className="p-3.5 rounded-full bg-slate-100 text-slate-500 ring-4 ring-slate-50">
        <Icon className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <h3 className="font-semibold text-base text-slate-900">{title}</h3>
        {description && (
          <p className="text-xs md:text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actionComponent ? (
        <div className="pt-2">{actionComponent}</div>
      ) : actionLabel && onAction ? (
        <div className="pt-2">
          <Button size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
