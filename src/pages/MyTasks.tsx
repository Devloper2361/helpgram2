import { useTranslation } from "../i18n";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function MyTasksPage() {
  const { t } = useTranslation();
  const [postedTasks, setPostedTasks] = useState<any[]>([]);
  const [helpingTasks, setHelpingTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyTasks();
  }, []);

  const fetchMyTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks/my-tasks");
      if (res.ok) {
        const data = await res.json();
        setPostedTasks(data.postedTasks);
        setHelpingTasks(data.helpingTasks);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const renderTask = (task: any) => (
    <Card key={task.id} className="flex flex-col">
      <CardHeader className="pb-3 border-b">
        <div className="flex justify-between items-start mb-2">
          <Badge variant={task.status === "OPEN" ? "default" : "secondary"}>{task.status}</Badge>
          <span className="text-lg font-bold text-green-600">${task.price}</span>
        </div>
        <CardTitle className="text-xl line-clamp-1">{task.title}</CardTitle>
      </CardHeader>
      <CardContent className="py-4 flex-1 space-y-2">
        <p className="text-slate-600 text-sm line-clamp-2">{task.description}</p>
        <div className="text-sm text-slate-500 mt-2">
          <p><strong>{t("ui.location")}</strong> {task.address ? `${task.address}${task.city ? `, ${task.city}` : ''}` : 'Location hidden'}</p>
          <p><strong>{t("ui.date")}</strong> {new Date(task.scheduledFor).toLocaleDateString()}</p>
          {task.tasker && <p><strong>{t("ui.helper")}</strong> {task.tasker.profile?.fullName || task.tasker.email}</p>}
        </div>
      </CardContent>
      <CardFooter className="pt-0 border-t bg-slate-50 p-4">
        <Link to={`/tasks/${task.id}`} className="w-full">
          <Button variant="outline" className="w-full">{t("ui.view_details")}</Button>
        </Link>
      </CardFooter>
    </Card>
  );

  if (loading) {
    return <div className="p-8 text-center">{t("ui.loading_your_tasks")}</div>;
  }

  const categorize = (tasks: any[]) => {
    return {
      Open: tasks.filter(t => t.status === "OPEN"),
      Applied: tasks.filter(t => t.status === "OPEN" && t.taskerId == null), 
      Accepted: tasks.filter(t => t.status === "ACCEPTED"),
      InProgress: tasks.filter(t => t.status === "IN_PROGRESS"),
      ProofSubmitted: tasks.filter(t => t.status === "PROOF_SUBMITTED"),
      Completed: tasks.filter(t => t.status === "COMPLETED"),
      Cancelled: tasks.filter(t => t.status === "CANCELLED"),
      Disputed: tasks.filter(t => t.status === "DISPUTED" || t.dispute),
    };
  };

  const posted = categorize(postedTasks);
  
  const helping = {
    Applied: helpingTasks.filter(t => t.taskerId === null || t.status === "OPEN"),
    Accepted: helpingTasks.filter(t => t.status === "ACCEPTED"),
    InProgress: helpingTasks.filter(t => t.status === "IN_PROGRESS"),
    ProofSubmitted: helpingTasks.filter(t => t.status === "PROOF_SUBMITTED"),
    Completed: helpingTasks.filter(t => t.status === "COMPLETED"),
    Cancelled: helpingTasks.filter(t => t.status === "CANCELLED"),
    Disputed: helpingTasks.filter(t => t.status === "DISPUTED" || t.dispute),
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("navigation.myTasks")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("ui.manage_tasks_you")}</p>
      </div>

      <Tabs defaultValue="posted" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="posted">{t("ui.posted_by_me")}</TabsTrigger>
          <TabsTrigger value="helping">{t("ui.helping_others")}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="posted" className="space-y-8">
          {postedTasks.length === 0 && <p className="text-slate-500 text-center py-8">{t("ui.you_haven_t")}</p>}
          
          {posted.Open.length > 0 && <div><h3 className="font-semibold text-lg mb-3">{t("ui.open")}</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{posted.Open.map(renderTask)}</div></div>}
          {posted.Accepted.length > 0 && <div><h3 className="font-semibold text-lg mb-3 mt-6">{t("ui.accepted")}</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{posted.Accepted.map(renderTask)}</div></div>}
          {posted.InProgress.length > 0 && <div><h3 className="font-semibold text-lg mb-3 mt-6">{t("ui.in_progress")}</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{posted.InProgress.map(renderTask)}</div></div>}
          {posted.ProofSubmitted.length > 0 && <div><h3 className="font-semibold text-lg mb-3 mt-6">{t("ui.proof_submitted")}</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{posted.ProofSubmitted.map(renderTask)}</div></div>}
          {posted.Completed.length > 0 && <div><h3 className="font-semibold text-lg mb-3 mt-6">{t("ui.completed")}</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{posted.Completed.map(renderTask)}</div></div>}
          {posted.Cancelled.length > 0 && <div><h3 className="font-semibold text-lg mb-3 mt-6">{t("ui.cancelled")}</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{posted.Cancelled.map(renderTask)}</div></div>}
          {posted.Disputed.length > 0 && <div><h3 className="font-semibold text-lg mb-3 mt-6">{t("ui.disputed")}</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{posted.Disputed.map(renderTask)}</div></div>}
        </TabsContent>
        
        <TabsContent value="helping" className="space-y-8">
          {helpingTasks.length === 0 && <p className="text-slate-500 text-center py-8">{t("ui.you_haven_t")}</p>}
          
          {helping.Applied.length > 0 && <div><h3 className="font-semibold text-lg mb-3">{t("ui.applied")}</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{helping.Applied.map(renderTask)}</div></div>}
          {helping.Accepted.length > 0 && <div><h3 className="font-semibold text-lg mb-3 mt-6">{t("ui.accepted")}</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{helping.Accepted.map(renderTask)}</div></div>}
          {helping.InProgress.length > 0 && <div><h3 className="font-semibold text-lg mb-3 mt-6">{t("ui.in_progress")}</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{helping.InProgress.map(renderTask)}</div></div>}
          {helping.ProofSubmitted.length > 0 && <div><h3 className="font-semibold text-lg mb-3 mt-6">{t("ui.proof_submitted")}</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{helping.ProofSubmitted.map(renderTask)}</div></div>}
          {helping.Completed.length > 0 && <div><h3 className="font-semibold text-lg mb-3 mt-6">{t("ui.completed")}</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{helping.Completed.map(renderTask)}</div></div>}
          {helping.Cancelled.length > 0 && <div><h3 className="font-semibold text-lg mb-3 mt-6">{t("ui.cancelled")}</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{helping.Cancelled.map(renderTask)}</div></div>}
          {helping.Disputed.length > 0 && <div><h3 className="font-semibold text-lg mb-3 mt-6">{t("ui.disputed")}</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{helping.Disputed.map(renderTask)}</div></div>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
