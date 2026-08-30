import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ShieldAlert, CheckCircle, Activity, Banknote } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "../i18n";
import { toast } from "sonner";

export default function AdminPage() {
    const { t } = useTranslation();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [partialState, setPartialState] = useState<{ id: string, rAmt: string, tAmt: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    variant: "default" | "destructive" | "success";
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    description: "",
    confirmText: "",
    variant: "default",
    onConfirm: async () => {},
  });

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    try {
      const res = await fetch("/api/admin/disputes");
      if (res.ok) {
        const data = await res.json();
        setDisputes(data.disputes);
      }
    } catch(e) {}
    setLoading(false);
  }

  const handleAction = async (id: string, action: string, body?: any) => {
    try {
      const res = await fetch(`/api/admin/disputes/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {})
      });
      if (res.ok) {
        toast.success(`Action '${action}' completed successfully`);
        fetchDisputes();
      } else {
        const d = await res.json();
        toast.error(d.error || "Action failed");
      }
    } catch(e: any) {
      toast.error(e?.message || "An unexpected error occurred");
    } finally {
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const confirmAction = (id: string, action: string, body?: any) => {
    setConfirmModal({
      isOpen: true,
      title: "Confirm Action",
      description: `Are you sure you want to perform '${action}' on this dispute?`,
      confirmText: "Confirm",
      variant: action === 'refund' ? 'destructive' : 'default',
      onConfirm: () => handleAction(id, action, body),
    });
  };

  const activeDisputes = disputes.filter(d => d.status === "PENDING_REVIEW" || d.status === "IN_MEDIATION");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t("ui.admin_dashboard")}</h1>
        <p className="text-muted-foreground mt-1">{t("ui.platform_overview_dispute")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
                <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Skill Certifications</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Review</div>
            <Link to="/admin/certifications" className="text-xs text-blue-500 hover:underline">Manage Worker Certifications →</Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("ui.open_disputes")}</CardTitle>
            <ShieldAlert className={`h-4 w-4 ${activeDisputes.length > 0 ? 'text-amber-500' : 'text-slate-300'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDisputes.length}</div>
            <p className="text-xs text-muted-foreground">{t("ui.requires_attention")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("ui.resolved_disputes")}</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{disputes.length - activeDisputes.length}</div>
            <p className="text-xs text-muted-foreground">{t("ui.historical_records")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("ui.dispute_resolution_panel")}</CardTitle>
          <CardDescription>{t("ui.escalated_task_conflicts")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("ui.taskid_disputeid")}</TableHead>
                <TableHead>{t("ui.status")}</TableHead>
                <TableHead>{t("ui.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={3} className="text-center">{t("ui.loading")}</TableCell></TableRow>
              ) : disputes.length === 0 ? (
                 <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">{t("ui.no_disputes")}</TableCell></TableRow>
              ) : disputes.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <Link to={`/tasks/${d.taskId}`} className="font-mono text-xs text-blue-600 hover:underline">{d.taskId}</Link>
                    <div className="text-xs text-slate-500 mt-1">{t("ui.task_price")}{Number(d.task.price).toFixed(2)}</div>
                    <div className="text-sm font-semibold mt-2">{t("ui.reason")}{d.reason}</div>
                    {/* Note: In full implementation, we'd fetch MediaAttachment here. We can link to task page. */}
                  </TableCell>
                  <TableCell>
                    <Badge variant={d.status === 'PENDING_REVIEW' ? 'destructive' : 'secondary'}>
                      {d.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {d.status === "PENDING_REVIEW" || d.status === "IN_MEDIATION" ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => confirmAction(d.id, 'refund')}>{t("ui.refund_requester")}</Button>
                          <Button size="sm" variant="outline" onClick={() => confirmAction(d.id, 'payout')}>{t("ui.pay_tasker_net")}</Button>
                        </div>
                        {partialState?.id === d.id ? (
                          <div className="flex gap-2 items-center mt-2 border p-2 rounded bg-slate-50">
                            <input placeholder="Req Amt" className="w-20 px-2 py-1 border text-sm" value={partialState.rAmt} onChange={e => setPartialState({...partialState, rAmt: e.target.value})} />
                            <input placeholder="Task Amt" className="w-20 px-2 py-1 border text-sm" value={partialState.tAmt} onChange={e => setPartialState({...partialState, tAmt: e.target.value})} />
                            <Button size="sm" onClick={() => {
                              confirmAction(d.id, 'partial-release', { requesterAmount: Number(partialState.rAmt), taskerAmount: Number(partialState.tAmt) });
                              setPartialState(null);
                            }}>{t("ui.confirm_split")}</Button>
                            <Button size="sm" variant="ghost" onClick={() => setPartialState(null)}>X</Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => setPartialState({id: d.id, rAmt: "", tAmt: ""})}>{t("ui.split_release")}</Button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">{t("ui.resolved")}{d.resolution || "No details"}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal: Generic Confirmation Dialog */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">{confirmModal.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{confirmModal.description}</p>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
              >
                {t("ui.cancel")}
              </Button>
              <Button
                variant={confirmModal.variant === "destructive" ? "destructive" : "default"}
                className={
                  confirmModal.variant === "success"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    : confirmModal.variant === "destructive"
                    ? "bg-red-600 hover:bg-red-700 text-white font-bold"
                    : "bg-blue-600 hover:bg-blue-700 text-white font-bold"
                }
                onClick={confirmModal.onConfirm}
              >
                {confirmModal.confirmText}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
