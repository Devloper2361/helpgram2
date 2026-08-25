import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IntelligencePanel } from "../components/IntelligencePanel.js";
import { useTranslation } from "../i18n";

export default function FederationDashboardPage() {
    const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const federationId = searchParams.get("federationId");
  
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actualTargetId, setActualTargetId] = useState<string | undefined>();

  useEffect(() => {
    fetchDashboard();
  }, [federationId]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = federationId ? `/api/dashboard/federation?federationId=${federationId}` : `/api/dashboard/federation`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch federation dashboard");
      
      setMetrics(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>{t("ui.loading")}</div>;
  if (error) return <div className="text-red-500">{typeof error === 'string' ? error : JSON.stringify(error)}</div>;
  if (!metrics) return <div>{t("ui.no_data_available")}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("ui.federation_dashboard")}</h1>
        <p className="text-slate-500">{t("ui.aggregate_metrics_and")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("ui.total_societies")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalSocieties}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("ui.total_workers")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalWorkers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("ui.active_workers")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeWorkers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("ui.pending_apps")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingApplications}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("ui.total_tasks")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("ui.completed_tasks")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.completedTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("ui.gross_booking_value")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Number(metrics.grossCompletedBookingValue || 0).toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("ui.platform_fees")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Number(metrics.platformFees || 0).toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {actualTargetId && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">{t("ui.strategic_intelligence")}</h2>
          <IntelligencePanel type="federation" id={actualTargetId} />
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">{t("ui.society_performance")}</h2>
        <div className="bg-white rounded-md border overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700">{t("ui.society")}</th>
                <th className="px-4 py-3 font-medium text-slate-700">{t("ui.workers_1")}</th>
                <th className="px-4 py-3 font-medium text-slate-700">{t("ui.active")}</th>
                <th className="px-4 py-3 font-medium text-slate-700">{t("ui.pending")}</th>
                <th className="px-4 py-3 font-medium text-slate-700">{t("ui.tasks_total")}</th>
                <th className="px-4 py-3 font-medium text-slate-700">{t("ui.tasks_completed")}</th>
                <th className="px-4 py-3 font-medium text-slate-700">{t("ui.gross_value")}</th>
                <th className="px-4 py-3 font-medium text-slate-700">{t("ui.platform_fees")}</th>
                <th className="px-4 py-3 font-medium text-slate-700">{t("ui.action")}</th>
              </tr>
            </thead>
            <tbody>
              {metrics.societyPerformance?.map((soc: any) => (
                <tr key={soc.societyId} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{soc.societyName}</td>
                  <td className="px-4 py-3">{soc.totalWorkers}</td>
                  <td className="px-4 py-3">{soc.activeWorkers}</td>
                  <td className="px-4 py-3">{soc.pendingApplications}</td>
                  <td className="px-4 py-3">{soc.totalTasks}</td>
                  <td className="px-4 py-3">{soc.completedTasks}</td>
                  <td className="px-4 py-3">${Number(soc.grossCompletedBookingValue || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">${Number(soc.platformFees || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => navigate(`/society/dashboard?societyId=${soc.societyId}`)}
                    >
                      {t("ui.view_society")}</Button>
                  </td>
                </tr>
              ))}
              {(!metrics.societyPerformance || metrics.societyPerformance.length === 0) && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-slate-500">{t("ui.no_society_performance")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
