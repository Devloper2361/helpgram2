import { WorkforceIntelligenceTab } from "../components/WorkforceIntelligenceTab";
import { InstitutionalContractsTab } from "../components/InstitutionalContractsTab";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { IntelligencePanel } from "../components/IntelligencePanel.js";
import { useTranslation } from "../i18n";

export default function SocietyDashboardPage() {
    const { t } = useTranslation();
  const { user } = useAuth();

  if (user?.role !== "SOCIETY_ADMIN" && user?.role !== "ADMIN" && user?.role !== "SUPER_ADMIN") {
    return <div className="p-8 text-center text-red-500">Access Denied. Society Admin privileges required.</div>;
  }

  const [searchParams] = useSearchParams();
  const societyId = searchParams.get("societyId");
  
  const [metrics, setMetrics] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actualTargetId, setActualTargetId] = useState<string | undefined>();
      
  useEffect(() => {
    fetchDashboard();
  }, [societyId]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = societyId ? `/api/dashboard/society?societyId=${societyId}` : `/api/dashboard/society`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch society dashboard");
      
      setMetrics(data);
      
      // We also need to fetch members to manage them, if authorized
      // We need the society ID. If it's not in the URL, maybe we can fetch members of "my" society? 
      // The backend needs `id` in the URL: /api/societies/:id/members
      // Wait, if societyId is not in URL, we need to know it. We can fetch /api/memberships/me to find the user's societyId if SOCIETY_ADMIN.
      let targetId = societyId;
      if (!targetId && user?.role === "SOCIETY_ADMIN") {
         const meRes = await fetch("/api/memberships/me");
         if (meRes.ok) {
           const meData = await meRes.json();
           const adminSoc = meData.societyMemberships?.find((m: any) => m.role === "ADMIN" && m.status === "ACTIVE");
           if (adminSoc) {
             targetId = adminSoc.societyId;
           }
         }
      }
      setActualTargetId(targetId || societyId || undefined);
      
      if (targetId) {
        const membersRes = await fetch(`/api/societies/${targetId}/members`);
        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setMembers(membersData.members || []);
        }

        
        

      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  
  
  
  
  const handleUpdateStatus = async (membershipId: string, status: string) => {
    try {
      const res = await fetch(`/api/memberships/${membershipId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");
      // refresh
      fetchDashboard();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div>{t("ui.loading")}</div>;
  if (error) return <div className="text-red-500">{typeof error === 'string' ? error : JSON.stringify(error)}</div>;
  if (!metrics) return <div>{t("ui.no_data_available")}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("ui.society_dashboard")}</h1>
        <p className="text-slate-500">{t("ui.overview_of_cooperative")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Skill Certifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Review</div>
            <Link to="/admin/certifications" className="text-xs text-blue-500 hover:underline">Manage Worker Certifications →</Link>
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

      

      <Tabs defaultValue="overview" className="mt-8">
                <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">{t("ui.membership_management")}</TabsTrigger>
          <TabsTrigger value="institutional">Institutional Contracts</TabsTrigger>
          <TabsTrigger value="intelligence">Workforce Intelligence</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          {actualTargetId && (
            <div>
              <h2 className="text-xl font-semibold mb-4">{t("ui.strategic_intelligence")}</h2>
              <IntelligencePanel type="society" id={actualTargetId} />
            </div>
          )}
        </TabsContent>
        <TabsContent value="members">
          <h2 className="text-xl font-semibold mb-4">{t("ui.membership_management")}</h2>
        <div className="bg-white rounded-md border overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700">{t("ui.name")}</th>
                <th className="px-4 py-3 font-medium text-slate-700">{t("ui.email")}</th>
                <th className="px-4 py-3 font-medium text-slate-700">{t("ui.status")}</th>
                <th className="px-4 py-3 font-medium text-slate-700">{t("ui.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">{m.user?.profile?.fullName || "N/A"}</td>
                  <td className="px-4 py-3">{m.user?.email || "N/A"}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    {m.status === "PENDING" && (
                      <>
                        <Button size="sm" onClick={() => handleUpdateStatus(m.id, "ACTIVE")}>{t("ui.approve")}</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus(m.id, "REJECTED")}>{t("ui.reject")}</Button>
                      </>
                    )}
                    {m.status === "ACTIVE" && (
                      <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus(m.id, "SUSPENDED")}>{t("ui.suspend")}</Button>
                    )}
                    {m.status === "SUSPENDED" && (
                      <Button size="sm" onClick={() => handleUpdateStatus(m.id, "ACTIVE")}>{t("ui.restore")}</Button>
                    )}
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">{t("ui.no_members_found")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </TabsContent>
        
                <TabsContent value="institutional">
          <InstitutionalContractsTab societyId={actualTargetId || ''} onRefresh={fetchDashboard} />
        </TabsContent>
              <TabsContent value="intelligence">
          <WorkforceIntelligenceTab societyId={actualTargetId || ''} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
