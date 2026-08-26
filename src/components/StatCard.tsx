import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number | string;
    isPositive?: boolean;
    isNeutral?: boolean;
    label?: string;
  };
  badge?: React.ReactNode;
  variant?: "default" | "primary" | "emerald" | "amber";
  className?: string;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  badge,
  variant = "default",
  className,
  onClick,
}: StatCardProps) {
  const variantStyles = {
    default: "bg-card border-border text-card-foreground",
    primary: "bg-blue-50/50 border-blue-200/80 text-blue-950",
    emerald: "bg-emerald-50/50 border-emerald-200/80 text-emerald-950",
    amber: "bg-amber-50/50 border-amber-200/80 text-amber-950",
  }[variant];

  const iconStyles = {
    default: "bg-slate-100 text-slate-700",
    primary: "bg-blue-100 text-blue-800",
    emerald: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
  }[variant];

  return (
    <Card
      className={cn(
        "rounded-xl border shadow-xs transition-all duration-150",
        variantStyles,
        onClick && "cursor-pointer hover:shadow-md hover:border-slate-300",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold tracking-tight text-foreground truncate">
                {value}
              </h3>
              {badge}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {subtitle}
              </p>
            )}
          </div>
          {Icon && (
            <div className={cn("p-2.5 rounded-lg shrink-0 flex items-center justify-center", iconStyles)}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>

        {trend && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs">
            {trend.isNeutral ? (
              <Minus className="h-3.5 w-3.5 text-slate-400" />
            ) : trend.isPositive ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
            )}
            <span
              className={cn(
                "font-semibold",
                trend.isNeutral && "text-slate-600",
                trend.isPositive && "text-emerald-700",
                !trend.isPositive && !trend.isNeutral && "text-rose-700"
              )}
            >
              {trend.value}
            </span>
            {trend.label && (
              <span className="text-muted-foreground truncate">
                {trend.label}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
