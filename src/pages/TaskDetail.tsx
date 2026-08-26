import { useTranslation } from "../i18n";
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, DollarSign, User, ShieldCheck, Mail, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MapProvider } from "@/components/MapProvider";
import { LocationPicker } from "@/components/LocationPicker";

export default function TaskDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [applyMessage, setApplyMessage] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [service, setService] = useState<any>(null);
  const [workerProfile, setWorkerProfile] = useState<any>(null);
  const [applyError, setApplyError] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    title: "", description: "", price: "", scheduledFor: "", locationLat: 0, locationLng: 0, address: "", landmark: "", city: "", state: "", category: ""
  });

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.user) {
        setCurrentUser(d.user);
        if (d.user.role === 'WORKER') {
          fetch("/api/profile/me").then(r => r.ok ? r.json() : null).then(pd => {
            if (pd && pd.profile) setWorkerProfile(pd.profile);
          }).catch(() => {});
        }
      }
    }).catch(() => {});
    fetchTask();
  }, [id]);

  const fetchTask = async () => {
    try {
      const res = await fetch(`/api/tasks/${id}`);
      if (res.ok) {
        const payload = await res.json();
        setTask(payload.task);
        if (payload.task) {
           if (payload.task.serviceId) {
             fetch(`/api/services/${payload.task.serviceId}`).then(r => r.ok ? r.json() : null).then(d => {
               if (d && d.service) setService(d.service);
             }).catch(() => {});
           }
           setEditForm({
             title: payload.task.title,
             description: payload.task.description,
             price: payload.task.price,
             scheduledFor: new Date(payload.task.scheduledFor).toISOString().slice(0, 16),
             locationLat: payload.task.locationLat,
             locationLng: payload.task.locationLng,
             address: payload.task.address || "",
             landmark: payload.task.landmark || "",
             city: payload.task.city || "",
             state: payload.task.state || "",
             category: payload.task.category || ""
           });
        }
        if (currentUser) {
           fetchApplications();
        }
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await fetch(`/api/tasks/${id}/applications`);
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications);
      }
    } catch (e) {}
  }

  // Refetch apps if currentUser resolves late and is owner
  useEffect(() => {
    if (currentUser?.id && task?.id && task.status === "OPEN") {
      fetchApplications();
    }
  }, [currentUser, task?.id]);

  const isOwner = currentUser?.id === task?.requesterId;
  const isHelper = currentUser?.id === task?.taskerId;
  const canEditOrCancel = isOwner && task?.status === "OPEN";

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          price: parseFloat(editForm.price as any),
          locationLat: editForm.locationLat,
          locationLng: editForm.locationLng,
          scheduledFor: new Date(editForm.scheduledFor).toISOString()
        })
      });
      if (res.ok) {
        const data = await res.json();
        setTask({ ...task, ...data.task });
        setIsEditing(false);
      }
    } catch (e) {}
  };

  const handleCancel = async () => {
    
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (res.ok) fetchTask();
    } catch (e) {}
  };

  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [isDisputing, setIsDisputing] = useState(false);
  const [disputeForm, setDisputeForm] = useState({ reason: "" });
  const [evidenceUrl, setEvidenceUrl] = useState("");

  const handleDispute = async () => {
    try {
      const res = await fetch(`/api/tasks/${id}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(disputeForm)
      });
      if (res.ok) {
        const d = await res.json();
        if (evidenceUrl) {
          const eRes = await fetch(`/api/disputes/${d.task.dispute?.id || d.task.id}/evidence`, { // Dispute id or task id? API is /api/disputes/:id/evidence where :id is dispute ID. Since task includes dispute... Wait, create dispute doesn't return dispute directly. But we can fetch it again or send to backend. The backend is configured to use dispute id.
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: evidenceUrl, fileType: evidenceUrl.split('.').pop() || "unknown" })
          });
        }
        toast.success("Dispute submitted. Admins will review it soon.");
        setIsDisputing(false);
        fetchTask();
      } else {
        const data = await res.json();
        toast.error(typeof data.error === "string" ? data.error : (data.error?.formErrors?.[0] || JSON.stringify(data.error)));
      }
    } catch(e) {}
  };

  const handleReview = async () => {
    try {
      const res = await fetch(`/api/tasks/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewForm)
      });
      if (res.ok) {
        toast.success("Review submitted!");
        setIsReviewing(false);
        fetchTask();
      } else {
        const data = await res.json();
        toast.error(typeof data.error === "string" ? data.error : (data.error?.formErrors?.[0] || JSON.stringify(data.error)));
      }
    } catch (e) {}
  };

  const handleApply = async () => {
    if (!currentUser) {
      toast.error("Please log in to apply");
      return;
    }
    setApplyError(null);
    try {
      const res = await fetch(`/api/tasks/${id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: applyMessage })
      });
      if (res.ok) {
        toast.success("Applied successfully!");
        setIsApplying(false);
        fetchTask();
      } else {
        const data = await res.json();
        if (res.status === 403) {
          setApplyError(data);
        } else {
          toast.error(typeof data.error === "string" ? data.error : (data.error?.formErrors?.[0] || JSON.stringify(data.error) || "Failed to apply"));
        }
      }
    } catch (e) {}
  };

  const handleSelectHelper = async (taskerId: string) => {
    console.log("handleSelectHelper called with taskerId:", taskerId);
    console.log("Fetching /api/tasks/" + id + "/select-helper");
    
    try {
      const res = await fetch(`/api/tasks/${id}/select-helper`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskerId })
      });
      console.log("Response status:", res.status);
      if (res.ok) {
        console.log("Success! Refetching task...");
        fetchTask();
      } else {
        res.json().then((d: any) => {
          console.log("Error response:", d);
          toast.error(typeof d.error === "string" ? d.error : (d.error?.formErrors?.[0] || JSON.stringify(d.error) || "Failed to select helper"));
        }).catch(() => toast.error("Failed to select helper"));
      }
    } catch (e) {}
  };

  const handleTransitionAction = async (actionUrl: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}/${actionUrl}`, { method: "POST" });
      if (res.ok) fetchTask();
      else {
        const data = await res.json();
        toast.error(typeof data.error === "string" ? data.error : (data.error?.formErrors?.[0] || JSON.stringify(data.error)));
      }
    } catch (e) {}
  };

  if (loading) return <div className="text-center py-10">{t("ui.loading_task_details")}</div>;
  if (!task) return <div className="text-center py-10">{t("ui.task_not_found")}</div>;

  const hasApplied = applications.some(a => a.taskerId === currentUser?.id);

  return (
    <MapProvider>
      <div className="max-w-4xl mx-auto py-8 space-y-6">
        <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
        <div className="space-y-2">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant={task.status === "OPEN" ? "default" : (task.status === "COMPLETED" ? "secondary" : "default")} className="text-sm">
              {task.status.replace("_", " ")}
            </Badge>
            {task.category && (
              <Badge variant="outline" className="text-sm text-slate-600">
                {task.category}
              </Badge>
            )}
            <span className="text-sm text-slate-500">{t("ui.posted")}{new Date(task.createdAt).toLocaleDateString()}</span>
          </div>
          
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{task.title}</h1>
            {task.isEmergency && (
              <Badge variant="destructive" className="w-fit bg-red-500 hover:bg-red-600 text-white font-bold mb-1">
                {t("ui.emergency_service_request")}</Badge>
            )}
          </div>

          <div className="flex items-center gap-4 text-slate-600 text-sm">
            <span className="flex items-center gap-1 font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-md"><DollarSign className="h-4 w-4" /> {task.price}</span>
            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {new Date(task.scheduledFor).toLocaleString()}</span>
            <div className="flex items-start gap-1">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" /> 
              <div className="flex flex-col">
                 {task.address ? (
                   <>
                     <span>{task.address}{task.city ? `, ${task.city}` : ''}</span>
                     {task.landmark && <span className="text-xs text-slate-500 font-normal">{t("ui.near")}{task.landmark}</span>}
                   </>
                 ) : (
                   <span>{task.locationLat}, {task.locationLng}</span>
                 )}
              </div>
            </div>
          </div>
        </div>

        {canEditOrCancel && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? "Cancel Edit" : "Edit Task"}
            </Button>
            <Button variant="destructive" onClick={handleCancel}>{t("ui.cancel_task")}</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Status Timeline Component */}
          {task.status !== "OPEN" && task.status !== "CANCELLED" && task.status !== "DRAFT" && (
            <Card className="bg-slate-50/50">
              <CardContent className="py-6">
                <div className="flex items-center justify-between text-sm">
                  <div className={`flex flex-col items-center ${task.status === "ACCEPTED" || task.status === "IN_PROGRESS" || task.status === "PROOF_SUBMITTED" || task.status === "COMPLETED" ? 'text-primary font-semibold' : 'text-slate-400'}`}>
                    <CheckCircle2 className="h-6 w-6 mb-1 text-blue-500" /> {t("ui.helper_selected")}</div>
                  <div className="flex-1 h-px bg-slate-200 mx-2"></div>
                  <div className={`flex flex-col items-center ${task.status === "IN_PROGRESS" || task.status === "PROOF_SUBMITTED" || task.status === "COMPLETED" ? 'text-primary font-semibold' : 'text-slate-400'}`}>
                    <CheckCircle2 className={`h-6 w-6 mb-1 ${task.status === "IN_PROGRESS" || task.status === "PROOF_SUBMITTED" || task.status === "COMPLETED" ? 'text-amber-500' : 'text-slate-300'}`} /> {t("ui.in_progress")}</div>
                  <div className="flex-1 h-px bg-slate-200 mx-2"></div>
                  <div className={`flex flex-col items-center ${task.status === "PROOF_SUBMITTED" || task.status === "COMPLETED" ? 'text-primary font-semibold' : 'text-slate-400'}`}>
                    <CheckCircle2 className={`h-6 w-6 mb-1 ${task.status === "PROOF_SUBMITTED" || task.status === "COMPLETED" ? 'text-purple-500' : 'text-slate-300'}`} /> {t("ui.proof_submitted")}</div>
                  <div className="flex-1 h-px bg-slate-200 mx-2"></div>
                  <div className={`flex flex-col items-center ${task.status === "COMPLETED" ? 'text-primary font-semibold' : 'text-slate-400'}`}>
                    <CheckCircle2 className={`h-6 w-6 mb-1 ${task.status === "COMPLETED" ? 'text-green-500' : 'text-slate-300'}`} /> {t("ui.completed")}</div>
                </div>

                <div className="mt-6 flex justify-center gap-4">
                  {isHelper && task.status === "ACCEPTED" && (
                     <Button onClick={() => handleTransitionAction("start")}>{t("ui.start_task")}</Button>
                  )}
                  {isHelper && task.status === "IN_PROGRESS" && (
    <label className="cursor-pointer bg-slate-900 text-white hover:bg-slate-800 inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2">
      {t("ui.submit_proof_of")}<input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        onChange={async (e) => {
          if (!e.target.files || !e.target.files[0]) return;
          const formData = new FormData();
          formData.append('evidence', e.target.files[0]);
          try {
            const res = await fetch(`/api/tasks/${id}/submit-proof`, {
              method: 'POST',
              body: formData
            });
            if (res.ok) fetchTask();
            else {
              const d = await res.json();
              toast.error(d.error);
            }
          } catch(e) {}
        }}
      />
    </label>
  )}
                  {isOwner && task.status === "PROOF_SUBMITTED" && (
                     <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleTransitionAction("approve")}>{t("ui.approve_completion")}</Button>
                  )}
                  {(isOwner || isHelper) && task.status === "COMPLETED" && !isReviewing && (
                     <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => setIsReviewing(true)}>{t("ui.leave_a_review")}</Button>
                  )}
                  {(isOwner || isHelper) && (task.status === "COMPLETED" || task.status === "CLOSED") && (
                     <Link to={`/tasks/${task.id}/invoice`}>
                       <Button variant="outline" className="flex items-center gap-2">
                         {t("ui.view_invoice")}</Button>
                     </Link>
                  )}
                  {(isOwner || isHelper) && ['ACCEPTED', 'IN_PROGRESS', 'PROOF_SUBMITTED', 'COMPLETED'].includes(task.status) && !task.dispute && !isDisputing && (
                     <Button variant="destructive" onClick={() => setIsDisputing(true)}>{t("ui.file_a_dispute")}</Button>
                  )}
                </div>

                  {task.media && task.media.length > 0 && (
    <div className="mt-6 pt-6 border-t">
      <h3 className="font-semibold mb-3">{t("ui.evidence_provided")}</h3>
      <div className="flex gap-2 flex-wrap">
        {task.media.map(m => (
          <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer">
            <img src={m.url} alt="Evidence" className="h-24 w-24 object-cover rounded-md border shadow-sm hover:opacity-80 transition-opacity" />
          </a>
        ))}
      </div>
    </div>
  )}
  {isDisputing && (
                  <div className="mt-6 pt-6 border-t space-y-4">
                    <h3 className="font-semibold text-lg text-red-600">{t("ui.file_a_dispute")}</h3>
                    <p className="text-sm text-slate-500">{t("ui.escrow_funds_will")}</p>
                    <textarea value={disputeForm.reason} onChange={(e) => setDisputeForm({ ...disputeForm, reason: e.target.value })} placeholder="Detailed reason for dispute..." className="w-full border p-2 rounded-md" rows={3}></textarea>
                    <input type="text" placeholder="Evidence URL (e.g. image link)" className="w-full border p-2 rounded-md" value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} />
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setIsDisputing(false)}>{t("ui.cancel")}</Button>
                      <Button variant="destructive" onClick={handleDispute}>{t("ui.submit_dispute")}</Button>
                    </div>
                  </div>
                )}

                {task.dispute && (
                  <div className="mt-6 pt-6 border-t space-y-4">
                    <div className="bg-red-50 border border-red-100 p-4 rounded-lg">
                      <h3 className="font-semibold text-red-800 flex items-center gap-2 mb-2">
                        <ShieldCheck className="h-5 w-5" /> {t("ui.dispute")}{task.dispute.status}
                      </h3>
                      <p className="text-sm text-red-700 mb-1"><strong>{t("ui.reason")}</strong> {task.dispute.reason}</p>
                      {task.dispute.resolution && <p className="text-sm text-red-700 text-bold"><strong>{t("ui.resolution")}</strong> {task.dispute.resolution}</p>}
                      {task.media && task.media.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm text-red-800 font-semibold mb-1">{t("ui.evidence_files")}</p>
                          <ul className="list-disc pl-5">
                            {task.media.map((m: any) => (
                              <li key={m.id}><a href={m.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{m.url}</a></li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {isReviewing && (
                  <div className="mt-6 pt-6 border-t space-y-4">
                    <h3 className="font-semibold text-lg">{t("ui.rate_your_experience")}</h3>
                    <div className="flex gap-2">
                       {[1, 2, 3, 4, 5].map(star => (
                         <button key={star} onClick={() => setReviewForm({ ...reviewForm, rating: star })} className={`text-2xl ${star <= reviewForm.rating ? 'text-amber-500' : 'text-slate-300'}`}>
                           ★
                         </button>
                       ))}
                    </div>
                    <textarea value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} placeholder="Write your review..." className="w-full border p-2 rounded-md" rows={3}></textarea>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setIsReviewing(false)}>{t("ui.cancel")}</Button>
                      <Button onClick={handleReview}>{t("ui.submit_review")}</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {isEditing ? (
            <Card>
              <CardHeader><CardTitle>{t("ui.edit_task")}</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm mb-1">{t("ui.title")}</label>
                    <input type="text" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full border p-2 rounded" />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">{t("ui.description")}</label>
                    <textarea rows={4} value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full border p-2 rounded" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-1">{t("ui.price")}</label>
                      <input type="number" step="0.01" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} className="w-full border p-2 rounded" />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">{t("ui.scheduled")}</label>
                      <input type="datetime-local" value={editForm.scheduledFor} onChange={e => setEditForm({...editForm, scheduledFor: e.target.value})} className="w-full border p-2 rounded" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm mb-1">{t("ui.category")}</label>
                    <select
                      value={editForm.category}
                      onChange={e => setEditForm({...editForm, category: e.target.value})}
                      className="w-full border rounded-md p-2 bg-background"
                    >
                      <option value="">{t("ui.no_category")}</option>
                      <option value="Home Services">{t("ui.home_services")}</option>
                      <option value="Delivery">{t("ui.delivery")}</option>
                      <option value="Tech Support">{t("ui.tech_support")}</option>
                      <option value="Handyman">{t("ui.handyman")}</option>
                      <option value="Cleaning">{t("ui.cleaning")}</option>
                      <option value="Moving">{t("ui.moving")}</option>
                      <option value="Other">{t("ui.other")}</option>
                    </select>
                  </div>
                  <div className="pt-2">
                    <label className="block text-sm font-medium mb-2">{t("ui.location")}</label>
                    <LocationPicker 
                       initialLocation={{
                         address: editForm.address,
                         landmark: editForm.landmark,
                         city: editForm.city,
                         state: editForm.state,
                         locationLat: editForm.locationLat,
                         locationLng: editForm.locationLng
                       }}
                       onLocationSelect={(loc) => {
                         setEditForm(prev => ({ ...prev, ...loc }));
                       }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>{t("ui.cancel")}</Button>
                    <Button type="submit">{t("ui.save_changes")}</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader><CardTitle>{t("ui.description")}</CardTitle></CardHeader>
              <CardContent className="whitespace-pre-wrap leading-relaxed text-slate-700">
                {task.description}
              </CardContent>
            </Card>
          )}

          {service && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{t("ui.structured_service")}{service.name}</span>
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-50">{t("ui.service_task")}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600">{service.description}</p>
                {service.skills && service.skills.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-slate-700">{t("ui.required_skills")}</h4>
                    <div className="flex gap-2 flex-wrap">
                      {service.skills.map((skill: any) => {
                        const hasSkill = workerProfile?.skills?.some((ws: any) => ws.id === skill.id);
                        return (
                          <Badge key={skill.id} variant={hasSkill ? "default" : "outline"} className={hasSkill ? "bg-green-100 text-green-700 hover:bg-green-100 border-none" : ""}>
                            {skill.name} {hasSkill && "✓"}
                          </Badge>
                        );
                      })}
                    </div>
                    {currentUser?.role === 'WORKER' && (
                      <p className="text-xs text-slate-500 mt-2">
                        {t("ui.claimed_skills_are")}</p>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 italic">{t("ui.this_service_requires")}</div>
                )}
              </CardContent>
            </Card>
          )}

          {task.serviceId === null && (
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center justify-between">
                <span>{t("ui.legacy_task")}</span>
                <Badge variant="outline" className="text-xs bg-slate-100 text-slate-700 hover:bg-slate-100">{t("ui.general")}</Badge>
              </CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">
                  {t("ui.this_is_a")}</p>
              </CardContent>
            </Card>
          )}

          {isOwner && task.status === "OPEN" && applications.length > 0 && (
            <Card>
              <CardHeader><CardTitle>{t("ui.applicants")}{applications.length})</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {applications.map(app => (
                  <div key={app.id} className="flex gap-4 p-4 border rounded-lg items-center">
                    <Avatar className="h-12 w-12 border">
                      <AvatarFallback className="bg-slate-100 text-slate-600">
                        {app.tasker.profile?.fullName?.[0] || app.tasker.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Link to={`/user/${app.tasker.id}`} className="font-semibold hover:underline block">
                        {app.tasker.profile?.fullName || 'Anonymous User'}
                      </Link>
                      <span className="text-sm text-amber-500 font-medium">★ {app.tasker.profile?.trustScore || "0.0"} {t("ui.score")}</span>
                      {app.message && <p className="text-sm text-slate-600 mt-1">"{app.message}"</p>}
                    </div>
                    <Button onClick={() => handleSelectHelper(app.tasker.id)}>{t("ui.accept")}</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {isOwner && task.status === "OPEN" && applications.length === 0 && (
            <div className="p-6 border border-dashed rounded-lg text-center text-slate-500 bg-slate-50">
              {t("ui.no_applicants_yet")}</div>
          )}

        </div>

        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">{t("ui.financials")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">{t("ui.gross_price")}</span>
                <span className="font-medium">${Number(task.price).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">{t("ui.platform_fee")}</span>
                <span className="font-medium text-amber-600">-${(Number(task.price) * 0.10).toFixed(2)}</span>
              </div>
              <div className="h-px w-full bg-slate-100" />
              <div className="flex justify-between items-center">
                <span className="font-semibold">{t("ui.net_payout")}</span>
                <span className="font-bold text-green-600">${(Number(task.price) * 0.90).toFixed(2)}</span>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className="text-xs text-slate-500 block mb-2">{t("ui.escrow_status")}</span>
                {task.status === "OPEN" && <Badge variant="secondary">{t("ui.waiting_for_helper")}</Badge>}
                {(task.status === "ACCEPTED" || task.status === "IN_PROGRESS" || task.status === "PROOF_SUBMITTED") && <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 uppercase border-none">{t("ui.locked")}</Badge>}
                {task.status === "COMPLETED" && <Badge className="bg-green-100 text-green-700 hover:bg-green-100 uppercase border-none">{t("ui.released")}</Badge>}
                {task.status === "CANCELLED" && task.taskerId && <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 uppercase border-none">{t("ui.refunded")}</Badge>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">{t("ui.requester")}</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center text-center">
              <Avatar className="h-16 w-16 mb-2">
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  {task.requester.profile?.fullName?.[0] || task.requester.email[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Link to={`/user/${task.requester.id}`} className="font-semibold hover:underline">
                {task.requester.profile?.fullName || 'Anonymous'}
              </Link>
              <p className="text-sm text-slate-500 mb-4">{task.requester.email}</p>
              {task.requester.profile?.trustScore && (
                <div className="flex items-center gap-1 text-sm text-amber-500 mb-2">
                  <ShieldCheck className="w-4 h-4" /> {task.requester.profile.trustScore} {t("ui.trust_score")}</div>
              )}
            </CardContent>
          </Card>

           {task.tasker && (
             <Card>
             <CardHeader><CardTitle className="text-lg">{t("ui.assigned_tasker")}</CardTitle></CardHeader>
             <CardContent className="flex flex-col items-center text-center">
               <Avatar className="h-16 w-16 mb-2">
                 <AvatarFallback className="bg-purple-100 text-purple-600">
                   {task.tasker.profile?.fullName?.[0] || task.tasker.email[0].toUpperCase()}
                 </AvatarFallback>
               </Avatar>
               <Link to={`/user/${task.tasker.id}`} className="font-semibold hover:underline">
                 {task.tasker.profile?.fullName || 'Anonymous'}
               </Link>
               {(isOwner || isHelper) && (
                 <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/chat')}>{t("ui.message")}</Button>
               )}
             </CardContent>
           </Card>
          )}

          {!isOwner && task.status === "OPEN" && (
             isApplying ? (
               <Card>
                 <CardContent className="pt-6 space-y-4">
                   <textarea
                    placeholder="Why are you a good fit?"
                    className="w-full border p-2 rounded text-sm"
                    rows={3}
                    value={applyMessage}
                    onChange={e => setApplyMessage(e.target.value)}
                   />
                   {applyError && (
                     <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-100">
                       <p className="font-semibold">{typeof applyError.error === 'string' ? applyError.error : JSON.stringify(applyError.error)}</p>
                       {applyError.error === 'ACCOUNT_RESTRICTED' && (
                         <p className="mt-1">{applyError.message}</p>
                       )}
                       {applyError.reason === 'MISSING_SKILLS' && applyError.missingSkills && (
                         <p className="mt-1">{t("ui.missing_required_skills")}{applyError.missingSkills.join(", ")}</p>
                       )}
                       {applyError.reason === 'CROSS_FEDERATION' && (
                         <p className="mt-1">{t("ui.you_must_belong")}</p>
                       )}
                       {applyError.reason === 'NO_ACTIVE_SOCIETY_MEMBERSHIP' && (
                         <p className="mt-1">{t("ui.you_must_have")}</p>
                       )}
                       {applyError.reason === 'SERVICE_INACTIVE' && (
                         <p className="mt-1">{t("ui.the_structured_service")}</p>
                       )}
                     </div>
                   )}
                   <div className="flex gap-2">
                     <Button variant="outline" className="flex-1" onClick={() => { setIsApplying(false); setApplyError(null); }}>{t("ui.cancel")}</Button>
                     <Button className="flex-1" onClick={handleApply}>{t("ui.confirm")}</Button>
                   </div>
                 </CardContent>
               </Card>
             ) : (
               <Button className="w-full" size="lg" onClick={() => setIsApplying(true)} disabled={hasApplied}>
                 {hasApplied ? "Already Applied" : t("task.apply")}
               </Button>
             )
          )}
        </div>
      </div>
    </div>
    </MapProvider>
  );
}
