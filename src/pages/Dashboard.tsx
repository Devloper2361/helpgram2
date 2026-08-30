import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Search, Clock, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  
  useEffect(() => {
    fetch("/api/dashboard")
      .then(res => res.json())
      .then(data => setData(data))
      .catch(err => setData({ error: err.message || "Failed to load dashboard" }));
  }, []);

  if (!data) return <div className="p-8 text-center">{t("ui.loading_dashboard")}</div>;
  if (data.error) return <div className="p-8 text-center text-red-500">{t("ui.error")}{typeof data.error === 'string' ? data.error : JSON.stringify(data.error)}</div>;

  const { activeTasksCount, myRecentTasks, suggestedTasks, walletBalance, escrowBalance, trustScore } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("ui.welcome")}{user?.email}</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            {t("ui.you_have")}{activeTasksCount} {t("ui.active_tasks_and")}{Number(escrowBalance).toFixed(2)} {t("ui.in_escrow")}</p>
        </div>
        <Link to="/tasks/new" className={buttonVariants({ className: "w-full sm:w-auto gap-2" })}>
          <PlusCircle className="h-4 w-4" />
          {t("ui.create_new_task")}</Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("ui.active_tasks")}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTasksCount}</div>
            <p className="text-xs text-muted-foreground">
              {t("ui.currently_open_or")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("ui.wallet_balance")}</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Number(walletBalance).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {t("ui.available_for_withdrawal")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("ui.trust_score")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Number(trustScore).toFixed(1).replace(/\.0$/, '')}/100</div>
            <p className="text-xs text-muted-foreground">
              {t("ui.based_on_platform")}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 pt-4">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>{t("ui.recent_activity")}</CardTitle>
            <CardDescription>{t("ui.your_latest_tasks")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {myRecentTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("ui.no_recent_activity")}</p>
            ) : myRecentTasks.map((task: any) => (
              <div key={task.id} className="flex items-center gap-4 border-b pb-3 last:border-0 last:pb-0">
                <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                  {task.title.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none truncate max-w-[200px]">
                    {task.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("ui.status")}{task.status}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                  ${Number(task.price).toFixed(2)}
                </div>
              </div>
            ))}
            <Link to="/my-tasks" className={buttonVariants({ variant: "ghost", size: "sm", className: "w-full justify-between mt-2" })}>
              {t("ui.view_all_my")}<ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>{t("ui.suggested_tasks")}</CardTitle>
            <CardDescription>{t("ui.open_tasks_needing")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {suggestedTasks.length === 0 ? (
               <p className="text-sm text-muted-foreground">{t("ui.no_suggested_tasks")}</p>
             ) : suggestedTasks.map((task: any) => (
              <div key={task.id} className="flex items-center gap-4 p-3 rounded-lg border bg-card text-card-foreground">
                 <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none flex items-center gap-2 truncate max-w-[200px]">
                    {task.title}
                    {task.urgent && <Badge variant="outline" className="text-[10px] text-destructive border-destructive">{t("ui.urgent")}</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {task.city ? `${task.city}` : 'Remote'}
                  </p>
                </div>
                <div className="font-semibold text-sm">
                  ${Number(task.price).toFixed(2)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
