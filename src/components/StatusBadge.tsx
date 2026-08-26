import React from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "../i18n";
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  Lock, 
  Unlock, 
  Camera, 
  ShieldAlert, 
  ShieldCheck,
  RefreshCw,
  Sparkles
} from "lucide-react";

export type SystemStatus =
  | "OPEN"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "PROOF_SUBMITTED"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED"
  | "PENDING"
  | "PENDING_REVIEW"
  | "UNDER_INVESTIGATION"
  | "RESOLVED_REFUNDED"
  | "RESOLVED_RELEASED"
  | "ACTIVE"
  | "UNVERIFIED"
  | "VERIFIED"
  | "REJECTED"
  | "REVOKED"
  | "SUSPENDED"
  | "LOCKED"
  | "RELEASED"
  | "REFUNDED"
  | "PARTIAL_RELEASE"
  | "APPROVED"
  | string;

interface StatusBadgeProps {
  status: SystemStatus;
  size?: "sm" | "default" | "lg";
  showIcon?: boolean;
  className?: string;
  customLabel?: string;
}

export function StatusBadge({
  status,
  size = "default",
  showIcon = true,
  className,
  customLabel,
}: StatusBadgeProps) {
  const { t } = useTranslation();
  const normalized = (status || "").toUpperCase();

  let colorClasses = "bg-slate-100 text-slate-700 border-slate-200";
  let dotColor = "bg-slate-400";
  let IconComponent: React.ElementType = Clock;
  let labelKey = `status.${normalized.toLowerCase()}`;

  switch (normalized) {
    case "OPEN":
      colorClasses = "bg-blue-50 text-blue-800 border-blue-200/80 font-medium";
      dotColor = "bg-blue-500";
      IconComponent = Clock;
      break;
    case "ACCEPTED":
      colorClasses = "bg-indigo-50 text-indigo-800 border-indigo-200/80 font-medium";
      dotColor = "bg-indigo-500";
      IconComponent = Clock;
      break;
    case "IN_PROGRESS":
      colorClasses = "bg-amber-50 text-amber-900 border-amber-300/80 font-medium";
      dotColor = "bg-amber-500 animate-pulse";
      IconComponent = RefreshCw;
      break;
    case "PROOF_SUBMITTED":
      colorClasses = "bg-purple-50 text-purple-900 border-purple-200 font-medium";
      dotColor = "bg-purple-600";
      IconComponent = Camera;
      break;
    case "COMPLETED":
    case "RESOLVED_RELEASED":
    case "APPROVED":
    case "VERIFIED":
    case "ACTIVE":
      colorClasses = "bg-emerald-50 text-emerald-900 border-emerald-200 font-medium";
      dotColor = "bg-emerald-600";
      IconComponent = CheckCircle2;
      break;
    case "CANCELLED":
    case "REJECTED":
    case "REVOKED":
    case "REFUNDED":
    case "RESOLVED_REFUNDED":
      colorClasses = "bg-rose-50 text-rose-800 border-rose-200 font-medium";
      dotColor = "bg-rose-500";
      IconComponent = XCircle;
      break;
    case "DISPUTED":
    case "UNDER_INVESTIGATION":
    case "SHIELD_ALERT":
      colorClasses = "bg-red-50 text-red-900 border-red-300 font-medium";
      dotColor = "bg-red-600 animate-ping";
      IconComponent = ShieldAlert;
      break;
    case "PENDING":
    case "PENDING_REVIEW":
    case "UNVERIFIED":
      colorClasses = "bg-amber-50 text-amber-800 border-amber-200 font-medium";
      dotColor = "bg-amber-500";
      IconComponent = Clock;
      break;
    case "SUSPENDED":
      colorClasses = "bg-zinc-100 text-zinc-800 border-zinc-300 font-medium";
      dotColor = "bg-zinc-600";
      IconComponent = AlertTriangle;
      break;
    case "LOCKED":
      colorClasses = "bg-slate-100 text-slate-800 border-slate-300 font-medium";
      dotColor = "bg-slate-600";
      IconComponent = Lock;
      break;
    case "RELEASED":
      colorClasses = "bg-emerald-50 text-emerald-800 border-emerald-200 font-medium";
      dotColor = "bg-emerald-600";
      IconComponent = Unlock;
      break;
    default:
      colorClasses = "bg-slate-100 text-slate-700 border-slate-200 font-medium";
      dotColor = "bg-slate-400";
      IconComponent = Clock;
  }

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[11px] gap-1.5",
    default: "px-2.5 py-1 text-xs gap-1.5",
    lg: "px-3 py-1.5 text-sm gap-2",
  }[size];

  // Try fetching localized string or format the raw key
  const localized = t(labelKey);
  const displayLabel = customLabel || (localized !== labelKey ? localized : normalized.replace(/_/g, " "));

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border tracking-tight transition-colors select-none",
        sizeClasses,
        colorClasses,
        className
      )}
    >
      {showIcon && (
        <span className="relative flex items-center justify-center">
          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColor)} />
        </span>
      )}
      <span className="font-semibold">{displayLabel}</span>
    </span>
  );
}
