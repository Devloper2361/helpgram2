import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useTranslation } from "../i18n";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title,
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-xl border border-red-200 bg-red-50/40 text-red-900 space-y-3 max-w-md mx-auto my-4",
        className
      )}
    >
      <div className="p-3 rounded-full bg-red-100 text-red-700 ring-4 ring-red-50">
        <AlertCircle className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <h3 className="font-semibold text-base text-red-950">
          {title || t("common.error")}
        </h3>
        {message && (
          <p className="text-xs md:text-sm text-red-800/90 max-w-xs mx-auto leading-relaxed">
            {message}
          </p>
        )}
      </div>
      {onRetry && (
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="border-red-300 text-red-900 hover:bg-red-100 gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t("ui.retry") || "Retry"}
          </Button>
        </div>
      )}
    </div>
  );
}
