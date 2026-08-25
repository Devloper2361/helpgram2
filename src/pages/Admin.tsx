import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ShieldAlert, CheckCircle, Activity, Banknote } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "../i18n";

export default function AdminPage() {
    const { t } = useTranslation();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [partialState, setPartialState] = useState<{ id: string, rAmt: string, tAmt: string } | null>(null);

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
    if (!confirm(`Confirm ${action}?`)) return;
    try {
      const res = await fetch(`/api/admin/disputes/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {})
      });
      if (res.ok) fetchDisputes();
      else {
        const d = await res.json();
        alert(d.error);
      }
    } catch(e) {}
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
                          <Button size="sm" variant="outline" onClick={() => handleAction(d.id, 'refund')}>{t("ui.refund_requester")}</Button>
                          <Button size="sm" variant="outline" onClick={() => handleAction(d.id, 'payout')}>{t("ui.pay_tasker_net")}</Button>
                        </div>
                        {partialState?.id === d.id ? (
                          <div className="flex gap-2 items-center mt-2 border p-2 rounded bg-slate-50">
                            <input placeholder="Req Amt" className="w-20 px-2 py-1 border text-sm" value={partialState.rAmt} onChange={e => setPartialState({...partialState, rAmt: e.target.value})} />
                            <input placeholder="Task Amt" className="w-20 px-2 py-1 border text-sm" value={partialState.tAmt} onChange={e => setPartialState({...partialState, tAmt: e.target.value})} />
                            <Button size="sm" onClick={() => {
                              handleAction(d.id, 'partial-release', { requesterAmount: Number(partialState.rAmt), taskerAmount: Number(partialState.tAmt) });
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
    </div>
  );
}
