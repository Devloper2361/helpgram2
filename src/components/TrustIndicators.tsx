import React from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "../i18n";
import { 
  ShieldCheck, 
  CheckCircle2, 
  Lock, 
  Users, 
  Sparkles, 
  Award,
  HeartHandshake,
  Shield
} from "lucide-react";

/**
 * KYC Verified Worker Ribbon / Badge
 */
export function VerifiedWorkerBadge({ 
  className, 
  showText = true, 
  size = "default" 
}: { 
  className?: string; 
  showText?: boolean;
  size?: "sm" | "default" | "lg";
}) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/90 select-none",
        size === "sm" && "px-2 py-0.5 text-[11px]",
        size === "default" && "px-2.5 py-0.5 text-xs",
        size === "lg" && "px-3 py-1 text-sm font-semibold",
        className
      )}
      title="Identity & Police KYC Verified Worker"
    >
      <ShieldCheck className={cn("text-emerald-700 shrink-0", size === "sm" ? "h-3 w-3" : size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5")} />
      {showText && <span>{t("trust.kyc_verified")}</span>}
    </span>
  );
}

/**
 * Cooperative Society Membership Badge
 */
export function SocietyMemberBadge({ 
  societyName, 
  className,
  size = "default"
}: { 
  societyName?: string; 
  className?: string;
  size?: "sm" | "default";
}) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-md bg-blue-50 text-blue-900 border border-blue-200/80 select-none",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs",
        className
      )}
      title="Member of registered Cooperative Society"
    >
      <Users className="h-3.5 w-3.5 text-blue-700 shrink-0" />
      <span>{societyName || t("trust.cooperative_member")}</span>
    </span>
  );
}

/**
 * Escrow Protected Payment Badge
 */
export function EscrowProtectedBadge({ 
  className,
  variant = "pill"
}: { 
  className?: string;
  variant?: "pill" | "banner";
}) {
  const { t } = useTranslation();

  if (variant === "banner") {
    return (
      <div className={cn("flex items-center gap-3 p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/90 text-emerald-950", className)}>
        <div className="p-2 rounded-md bg-emerald-100/80 text-emerald-800 shrink-0">
          <Lock className="h-4 w-4" />
        </div>
        <div>
          <div className="font-semibold text-xs text-emerald-900 flex items-center gap-1.5">
            <span>{t("trust.escrow_guarantee_title")}</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 inline" />
          </div>
          <p className="text-[11px] text-emerald-800/90 mt-0.5 leading-snug">
            {t("trust.escrow_guarantee_desc")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200/90 select-none",
        className
      )}
      title="Payment held safely in cooperative escrow until work is completed"
    >
      <Lock className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
      <span>{t("trust.escrow_protected")}</span>
    </span>
  );
}

/**
 * Worker Welfare Coverage Active Shield
 */
export function WelfareCoverageBadge({
  className,
  size = "default"
}: {
  className?: string;
  size?: "sm" | "default";
}) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200/80 font-medium select-none",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        className
      )}
      title="Covered by Cooperative Worker Welfare & Emergency Relief Fund"
    >
      <HeartHandshake className="h-3.5 w-3.5 text-amber-700 shrink-0" />
      <span>{t("trust.welfare_covered")}</span>
    </span>
  );
}

/**
 * Trust Score Meter & Badge
 */
export function TrustScoreBadge({
  score,
  maxScore = 100,
  showMeter = false,
  className
}: {
  score: number;
  maxScore?: number;
  showMeter?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const safeScore = Math.min(Math.max(Number(score) || 0, 0), maxScore);
  const displayScore = Number.isInteger(safeScore) ? safeScore : safeScore.toFixed(1);
  const percentage = Math.round((safeScore / maxScore) * 100);

  let badgeColor = "bg-emerald-50 text-emerald-900 border-emerald-200";
  let barColor = "bg-emerald-600";
  let label = t("trust.high_trust");

  if (percentage < 60) {
    badgeColor = "bg-rose-50 text-rose-900 border-rose-200";
    barColor = "bg-rose-600";
    label = t("trust.needs_improvement");
  } else if (percentage < 80) {
    badgeColor = "bg-amber-50 text-amber-900 border-amber-200";
    barColor = "bg-amber-600";
    label = t("trust.good_standing");
  }

  return (
    <div className={cn("inline-flex flex-col gap-1", className)}>
      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-xs font-semibold select-none", badgeColor)}>
        <Award className="h-3.5 w-3.5 shrink-0" />
        <span>{t("trust.trust_score")}: {displayScore}/{maxScore}</span>
        <span className="text-[10px] opacity-80">({label})</span>
      </span>
      {showMeter && (
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${percentage}%` }} />
        </div>
      )}
    </div>
  );
}

/**
 * AI Demand Intelligence Sparkle Tag
 */
export function AiInsightBadge({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200 select-none", className)}>
      <Sparkles className="h-3 w-3 text-indigo-600 shrink-0" />
      <span>{t("trust.ai_demand_insight")}</span>
    </span>
  );
}

/**
 * HelpGram Cooperative Emblem / Shield Icon
 */
export function CooperativeShield({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-900 to-blue-950 text-white p-2 shadow-sm", className)}>
      <Shield className="h-5 w-5 fill-blue-800/50 text-blue-200" />
      <span className="absolute text-[10px] font-black tracking-tighter text-amber-400">HG</span>
    </div>
  );
}
