import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "../i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  MapPin,
  Calendar,
  DollarSign,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  MessageSquare,
  FileText,
  Star,
  Camera,
  Upload,
  User,
  Users,
  ChevronRight,
  Sparkles,
  Info,
  X,
  AlertCircle,
  Lock,
  Eye,
  Check,
  Building2,
  Compass
} from "lucide-react";
import { MapProvider } from "@/components/MapProvider";
import { LocationPicker } from "@/components/LocationPicker";
import { StatusBadge } from "../components/StatusBadge";
import {
  VerifiedWorkerBadge,
  SocietyMemberBadge,
  EscrowProtectedBadge,
  TrustScoreBadge,
  CooperativeShield
} from "../components/TrustIndicators";
import { Map, Marker } from "@vis.gl/react-google-maps";

export default function TaskDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  // Core Data States
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [workerProfile, setWorkerProfile] = useState<any>(null);
  const [service, setService] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);

  // Workflow / UI States
  const [isEditing, setIsEditing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyMessage, setApplyMessage] = useState("");
  const [applyError, setApplyError] = useState<any>(null);
  const [isSubmittingApply, setIsSubmittingApply] = useState(false);

  const [isSelectingHelper, setIsSelectingHelper] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Proof submission
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [selectedMediaPreview, setSelectedMediaPreview] = useState<string | null>(null);

  // Dispute & Review states
  const [isDisputing, setIsDisputing] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);

  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Confirmation modal states
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

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    scheduledFor: "",
    locationLat: 0,
    locationLng: 0,
    address: "",
    landmark: "",
    city: "",
    state: "",
    category: ""
  });

  // Initial user & task loading
  useEffect(() => {
    fetchCurrentUser();
    fetchTask();
  }, [id]);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const d = await res.json();
        if (d.user) {
          setCurrentUser(d.user);
          if (d.user.role === "WORKER") {
            fetchWorkerProfile();
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWorkerProfile = async () => {
    try {
      const res = await fetch("/api/profile/me");
      if (res.ok) {
        const pd = await res.json();
        if (pd && pd.profile) {
          setWorkerProfile(pd.profile);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTask = async () => {
    try {
      const res = await fetch(`/api/tasks/${id}`);
      if (res.ok) {
        const payload = await res.json();
        const tData = payload.task;
        setTask(tData);

        if (tData) {
          if (tData.serviceId) {
            fetchService(tData.serviceId);
          }
          setEditForm({
            title: tData.title || "",
            description: tData.description || "",
            scheduledFor: tData.scheduledFor ? new Date(tData.scheduledFor).toISOString().slice(0, 16) : "",
            locationLat: Number(tData.locationLat) || 0,
            locationLng: Number(tData.locationLng) || 0,
            address: tData.address || "",
            landmark: tData.landmark || "",
            city: tData.city || "",
            state: tData.state || "",
            category: tData.category || ""
          });

          // Fetch applications if open
          fetchApplications();
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchService = async (serviceId: string) => {
    try {
      const res = await fetch(`/api/services/${serviceId}`);
      if (res.ok) {
        const d = await res.json();
        if (d && d.service) setService(d.service);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await fetch(`/api/tasks/${id}/applications`);
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Roles & Permissions
  const isOwner = currentUser?.id === task?.requesterId;
  const isHelper = currentUser?.id === task?.taskerId;
  const isWorkerRole = currentUser?.role === "WORKER";
  const hasApplied = applications.some((a) => a.taskerId === currentUser?.id);
  const canEdit = isOwner && task?.status === "OPEN";
  const canCancel = isOwner && task?.status === "OPEN";

  // Handler: Update Task (Edit Mode)
  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
          scheduledFor: new Date(editForm.scheduledFor).toISOString(),
          locationLat: editForm.locationLat,
          locationLng: editForm.locationLng,
          address: editForm.address,
          landmark: editForm.landmark,
          city: editForm.city,
          state: editForm.state,
          category: editForm.category
        })
      });
      if (res.ok) {
        toast.success("Task updated successfully!");
        setIsEditing(false);
        fetchTask();
      } else {
        const data = await res.json();
        toast.error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
      }
    } catch (e) {
      toast.error("Failed to update task");
    }
  };

  // Handler: Cancel Task
  const executeCancelTask = async () => {
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/tasks/${id}/cancel`, { method: "POST" });
      if (res.ok) {
        toast.success("Booking cancelled successfully.");
        fetchTask();
      } else {
        const data = await res.json();
        toast.error(typeof data.error === "string" ? data.error : (data.error?.message || "Failed to cancel booking"));
      }
    } catch (e) {
      toast.error("An error occurred while cancelling the task");
    } finally {
      setIsCancelling(false);
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    }
  };

  // Handler: Worker Apply
  const handleApply = async () => {
    if (!currentUser) {
      toast.error("Please sign in to apply for this task");
      navigate("/auth/login");
      return;
    }
    setApplyError(null);
    setIsSubmittingApply(true);
    try {
      const res = await fetch(`/api/tasks/${id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: applyMessage.trim() || undefined })
      });
      if (res.ok) {
        toast.success("Application submitted successfully!");
        setIsApplying(false);
        setApplyMessage("");
        fetchTask();
      } else {
        const data = await res.json();
        if (res.status === 403) {
          setApplyError(data);
        } else {
          toast.error(typeof data.error === "string" ? data.error : (data.error?.message || "Failed to apply"));
        }
      }
    } catch (e) {
      toast.error("Failed to submit application");
    } finally {
      setIsSubmittingApply(false);
    }
  };

  const [isRejectingHelper, setIsRejectingHelper] = useState<string | null>(null);
  const [rejectedApplications, setRejectedApplications] = useState<string[]>([]);

  // Handler: Reject Helper
  const handleRejectHelper = async (taskerId: string) => {
    setIsRejectingHelper(taskerId);
    try {
      const res = await fetch(`/api/tasks/${id}/reject-helper`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskerId })
      });
      if (res.ok) {
        toast.success("Worker application rejected.");
        setRejectedApplications(prev => [...prev, taskerId]);
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to reject application");
      }
    } catch (e) {
      toast.error("Failed to reject application");
    } finally {
      setIsRejectingHelper(null);
    }
  };

  // Handler: Select Helper
  const handleSelectHelper = async (taskerId: string) => {
    setIsSelectingHelper(taskerId);
    try {
      const res = await fetch(`/api/tasks/${id}/select-helper`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskerId })
      });
      if (res.ok) {
        toast.success("Worker selected and escrow funds secured!");
        fetchTask();
      } else {
        const d = await res.json();
        toast.error(typeof d.error === "string" ? d.error : (d.error?.message || "Failed to select worker"));
      }
    } catch (e) {
      toast.error("Failed to select worker");
    } finally {
      setIsSelectingHelper(null);
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    }
  };

  // Handler: Worker Start Task
  const executeStartTask = async () => {
    setIsStarting(true);
    try {
      const res = await fetch(`/api/tasks/${id}/start`, { method: "POST" });
      if (res.ok) {
        toast.success("Task marked as in progress!");
        fetchTask();
      } else {
        const data = await res.json();
        toast.error(typeof data.error === "string" ? data.error : (data.error?.message || "Failed to start task"));
      }
    } catch (e) {
      toast.error("Failed to start task");
    } finally {
      setIsStarting(false);
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    }
  };

  // Handler: Worker Submit Proof
  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProofFile(file);
      const url = URL.createObjectURL(file);
      setProofPreviewUrl(url);
    }
  };

  const handleUploadProof = async () => {
    if (!proofFile) {
      toast.error("Please select a photo evidence file");
      return;
    }
    setIsUploadingProof(true);
    const formData = new FormData();
    formData.append("evidence", proofFile);
    try {
      const res = await fetch(`/api/tasks/${id}/submit-proof`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        toast.success("Proof of work uploaded! Awaiting customer review.");
        setProofFile(null);
        setProofPreviewUrl(null);
        fetchTask();
      } else {
        const d = await res.json();
        toast.error(typeof d.error === "string" ? d.error : (d.error?.message || "Failed to submit proof"));
      }
    } catch (e) {
      toast.error("Error uploading proof");
    } finally {
      setIsUploadingProof(false);
    }
  };

  // Handler: Customer Approve Completion
  const executeApproveCompletion = async () => {
    setIsApproving(true);
    try {
      const res = await fetch(`/api/tasks/${id}/approve`, { method: "POST" });
      if (res.ok) {
        toast.success("Booking completed and payment released to worker!");
        fetchTask();
      } else {
        const data = await res.json();
        toast.error(typeof data.error === "string" ? data.error : (data.error?.message || "Failed to approve completion"));
      }
    } catch (e) {
      toast.error("Failed to approve completion");
    } finally {
      setIsApproving(false);
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    }
  };

  // Handler: Submit Dispute
  const handleDispute = async () => {
    if (disputeReason.trim().length < 10) {
      toast.error("Please enter a detailed reason for the dispute (at least 10 characters)");
      return;
    }
    setIsSubmittingDispute(true);
    try {
      const res = await fetch(`/api/tasks/${id}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: disputeReason.trim() })
      });
      if (res.ok) {
        toast.success("Dispute filed. HelpGram cooperative mediators have been notified.");
        setIsDisputing(false);
        setDisputeReason("");
        fetchTask();
      } else {
        const data = await res.json();
        toast.error(typeof data.error === "string" ? data.error : (data.error?.message || "Failed to submit dispute"));
      }
    } catch (e) {
      toast.error("Failed to submit dispute");
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  // Handler: Submit Review
  const handleReview = async () => {
    setIsSubmittingReview(true);
    try {
      const res = await fetch(`/api/tasks/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewForm)
      });
      if (res.ok) {
        toast.success("Review submitted! Thank you for strengthening community trust.");
        setIsReviewing(false);
        fetchTask();
      } else {
        const data = await res.json();
        toast.error(typeof data.error === "string" ? data.error : (data.error?.message || "Failed to submit review"));
      }
    } catch (e) {
      toast.error("Failed to submit review");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-16 px-4 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-600">{t("task.loading") || "Loading task details..."}</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">{t("common.noResults") || "Task Not Found"}</h2>
        <p className="text-sm text-slate-500">The requested booking does not exist or may have been removed.</p>
        <Button onClick={() => navigate("/tasks")} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" /> {t("task_detail.back_to_tasks")}
        </Button>
      </div>
    );
  }

  // Lifecycle Tracker Data
  const lifecycleSteps = [
    {
      key: "OPEN",
      label: isHelper ? "Application" : t("task_detail.step_posted"),
      desc: t("task_detail.step_posted_desc"),
      isCompleted: task.status !== "OPEN" && task.status !== "CANCELLED",
      isCurrent: task.status === "OPEN",
      icon: Users
    },
    {
      key: "ACCEPTED",
      label: isHelper ? "Selected" : t("task_detail.step_assigned"),
      desc: t("task_detail.step_assigned_desc"),
      isCompleted: ["IN_PROGRESS", "PROOF_SUBMITTED", "COMPLETED"].includes(task.status),
      isCurrent: task.status === "ACCEPTED",
      icon: User
    },
    {
      key: "IN_PROGRESS",
      label: isHelper ? "Start Task" : t("task_detail.step_progress"),
      desc: t("task_detail.step_progress_desc"),
      isCompleted: ["PROOF_SUBMITTED", "COMPLETED"].includes(task.status),
      isCurrent: task.status === "IN_PROGRESS",
      icon: Clock
    },
    {
      key: "PROOF_SUBMITTED",
      label: isHelper ? "Submit Proof" : t("task_detail.step_proof"),
      desc: t("task_detail.step_proof_desc"),
      isCompleted: task.status === "COMPLETED",
      isCurrent: task.status === "PROOF_SUBMITTED",
      icon: Camera
    },
    {
      key: "COMPLETED",
      label: isHelper ? "Payment / Completed" : t("task_detail.step_completed"),
      desc: t("task_detail.step_completed_desc"),
      isCompleted: task.status === "COMPLETED",
      isCurrent: task.status === "COMPLETED",
      icon: CheckCircle2
    }
  ];

  // Dynamic Next-Action Guidance Message
  const getNextActionMessage = () => {
    if (task.status === "DISPUTED") {
      return {
        text: t("task_detail.action_disputed_info"),
        variant: "dispute"
      };
    }
    if (task.status === "CANCELLED") {
      return {
        text: t("task_detail.action_cancelled_info"),
        variant: "cancelled"
      };
    }
    if (isOwner) {
      switch (task.status) {
        case "OPEN":
          return { text: t("task_detail.action_customer_open"), variant: "action" };
        case "ACCEPTED":
          return { text: t("task_detail.action_customer_accepted"), variant: "info" };
        case "IN_PROGRESS":
          return { text: t("task_detail.action_customer_in_progress"), variant: "info" };
        case "PROOF_SUBMITTED":
          return { text: t("task_detail.action_customer_proof"), variant: "urgent" };
        case "COMPLETED":
          return { text: t("task_detail.action_customer_completed"), variant: "success" };
        default:
          return { text: "", variant: "default" };
      }
    }
    if (isHelper) {
      switch (task.status) {
        case "ACCEPTED":
          return { text: t("task_detail.action_worker_accepted"), variant: "urgent" };
        case "IN_PROGRESS":
          return { text: t("task_detail.action_worker_in_progress"), variant: "action" };
        case "PROOF_SUBMITTED":
          return { text: t("task_detail.action_worker_proof"), variant: "info" };
        case "COMPLETED":
          return { text: t("task_detail.action_worker_completed"), variant: "success" };
        default:
          return { text: "", variant: "default" };
      }
    }
    if (isWorkerRole && task.status === "OPEN") {
      return hasApplied
        ? { text: t("task_detail.action_worker_open_applied"), variant: "info" }
        : { text: t("task_detail.action_worker_open_can_apply"), variant: "action" };
    }
    return { text: t("task_detail.action_visitor_open"), variant: "info" };
  };

  const nextAction = getNextActionMessage();

  return (
    <MapProvider>
      <div className="min-h-screen bg-slate-50/50 pb-28 md:pb-16 pt-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">

          {/* Navigation Breadcrumb & Quick Actions Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Link
                to={isOwner ? "/my-tasks" : "/tasks"}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors bg-white px-3 py-1.5 rounded-lg border shadow-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{isOwner ? t("task_detail.back_to_my_tasks") : t("task_detail.back_to_tasks")}</span>
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                #{task.id.slice(0, 8)}
              </span>
            </div>

            {/* Top Right Action Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="border-slate-300"
                >
                  {isEditing ? t("task_detail.cancel_edit_btn") : t("task_detail.edit_task_btn")}
                </Button>
              )}

              {canCancel && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setConfirmModal({
                      isOpen: true,
                      title: t("task_detail.cancel_confirm_title"),
                      description: t("task_detail.cancel_confirm_desc"),
                      confirmText: t("task_detail.cancel_task_btn"),
                      variant: "destructive",
                      onConfirm: executeCancelTask,
                    })
                  }
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                  {t("task_detail.cancel_task_btn")}
                </Button>
              )}

              {task.taskerId && (isOwner || isHelper) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/chat")}
                  className="border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-50"
                >
                  <MessageSquare className="w-4 h-4 mr-1.5" />
                  {isOwner ? t("task_detail.chat_btn") : t("task_detail.chat_customer_btn")}
                </Button>
              )}

              {(task.status === "COMPLETED" || task.status === "CLOSED") && (isOwner || isHelper) && (
                <Link to={`/tasks/${task.id}/invoice`}>
                  <Button variant="outline" size="sm" className="border-emerald-200 text-emerald-800 bg-emerald-50/50 hover:bg-emerald-50">
                    <FileText className="w-4 h-4 mr-1.5" />
                    {t("task_detail.view_invoice_btn")}
                  </Button>
                </Link>
              )}

              {(isOwner || isHelper) &&
                ["ACCEPTED", "IN_PROGRESS", "PROOF_SUBMITTED"].includes(task.status) &&
                !task.dispute &&
                !isDisputing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsDisputing(true)}
                    className="text-slate-500 hover:text-red-600 text-xs"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                    {t("task_detail.dispute_btn")}
                  </Button>
                )}
            </div>
          </div>

          {/* Emergency Priority Alert Banner */}
          {task.isEmergency && (
            <div className="bg-red-500 text-white p-3.5 rounded-xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-sm tracking-wide">{t("task_detail.emergency_priority")}</h4>
                  <p className="text-xs text-red-100 opacity-90">
                    {t("booking.emergency_toggle_desc")}
                  </p>
                </div>
              </div>
              <Badge className="bg-white text-red-700 hover:bg-white text-xs font-bold shrink-0">
                HIGH PRIORITY
              </Badge>
            </div>
          )}

          {/* Main Title, Badges & Price Header Card */}
          <Card className="bg-white border-slate-200/80 shadow-xs">
            <CardContent className="p-5 sm:p-7">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <StatusBadge status={task.status} size="default" />
                    {task.category && (
                      <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-200">
                        {task.category}
                      </Badge>
                    )}
                    {service && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        <Sparkles className="w-3 h-3" />
                        {service.name}
                      </span>
                    )}
                    <span className="text-xs text-slate-500">
                      {t("ui.posted")} {new Date(task.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-tight">
                    {task.title}
                  </h1>

                  <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-600 flex-wrap">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                      {new Date(task.scheduledFor).toLocaleString()}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1 text-slate-700">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                      {task.address ? `${task.address}${task.city ? `, ${task.city}` : ""}` : `${task.locationLat}, ${task.locationLng}`}
                      {task.landmark && (
                        <span className="text-slate-400">({t("ui.near")} {task.landmark})</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Price Display Card */}
                <div className="lg:border-l lg:border-slate-100 lg:pl-8 flex flex-row lg:flex-col items-center lg:items-end justify-between gap-2 shrink-0 bg-slate-50/70 p-4 rounded-xl lg:bg-transparent lg:p-0">
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                    {t("task_detail.booking_price")}
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-1">
                    <span className="text-slate-400 font-light text-xl">₹</span>
                    {Number(task.price).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {task.status === "COMPLETED" ? (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none text-[11px]">
                        {t("status.released")}
                      </Badge>
                    ) : task.status === "CANCELLED" ? (
                      <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200 border-none text-[11px]">
                        {t("status.refunded")}
                      </Badge>
                    ) : task.status === "OPEN" ? (
                      <Badge variant="outline" className="text-amber-700 bg-amber-50/60 border-amber-200 text-[11px]">
                        {t("status.pending")}
                      </Badge>
                    ) : (
                      <EscrowProtectedBadge size="sm" />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lifecycle Visual Progression Tracker */}
          {task.status !== "CANCELLED" && (
            <Card className="bg-white border-slate-200/80 shadow-xs overflow-hidden">
              <CardHeader className="py-4 px-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-blue-600" />
                    <CardTitle className="text-sm font-semibold text-slate-800">
                      {t("task_detail.timeline_title")}
                    </CardTitle>
                  </div>
                  {task.status === "DISPUTED" && (
                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200 text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {t("task_detail.step_disputed")}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-5 sm:p-6">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 relative">
                  {lifecycleSteps.map((step, idx) => {
                    const StepIcon = step.icon;
                    return (
                      <div
                        key={step.key}
                        className={`flex flex-col p-3 rounded-xl border transition-all ${
                          step.isCurrent
                            ? "bg-blue-50/60 border-blue-300 ring-2 ring-blue-500/20 shadow-xs"
                            : step.isCompleted
                            ? "bg-emerald-50/30 border-emerald-200/80"
                            : "bg-slate-50/40 border-slate-200/60 opacity-60"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                              step.isCurrent
                                ? "bg-blue-600 text-white shadow-xs"
                                : step.isCompleted
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-200 text-slate-500"
                            }`}
                          >
                            {step.isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                          </div>
                          {step.isCurrent && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                          )}
                        </div>
                        <span
                          className={`text-xs font-bold leading-tight ${
                            step.isCurrent
                              ? "text-blue-900"
                              : step.isCompleted
                              ? "text-emerald-950"
                              : "text-slate-600"
                          }`}
                        >
                          {step.label}
                        </span>
                        <span className="text-[11px] text-slate-500 mt-1 leading-snug hidden sm:block">
                          {step.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dynamic Next Action Guidance Box */}
          {nextAction.text && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3.5 transition-all ${
                nextAction.variant === "urgent"
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : nextAction.variant === "dispute"
                  ? "bg-red-50 border-red-200 text-red-900"
                  : nextAction.variant === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-blue-50/60 border-blue-200 text-blue-900"
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  nextAction.variant === "urgent"
                    ? "bg-amber-200/70 text-amber-900"
                    : nextAction.variant === "dispute"
                    ? "bg-red-200/70 text-red-900"
                    : nextAction.variant === "success"
                    ? "bg-emerald-200/70 text-emerald-900"
                    : "bg-blue-200/70 text-blue-900"
                }`}
              >
                {nextAction.variant === "urgent" ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : nextAction.variant === "dispute" ? (
                  <ShieldAlert className="w-4 h-4" />
                ) : nextAction.variant === "success" ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Info className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 text-xs sm:text-sm">
                <div className="font-semibold mb-0.5">{t("task_detail.next_action_title")}</div>
                <p className="opacity-90 leading-relaxed">{nextAction.text}</p>
              </div>
            </div>
          )}

          {/* 2-Column Responsive Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Main Workflow Column (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">

              {/* Task Edit Form (when isEditing is active) */}
              {isEditing ? (
                <Card className="border-blue-200 shadow-sm">
                  <CardHeader className="bg-blue-50/50 border-b border-blue-100">
                    <CardTitle className="text-base text-blue-950 flex items-center justify-between">
                      <span>{t("task_detail.edit_task_btn")}</span>
                      <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <form onSubmit={handleUpdateTask} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                          {t("ui.title")}
                        </label>
                        <Input
                          value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          required
                          minLength={5}
                          className="bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                          {t("ui.description")}
                        </label>
                        <textarea
                          rows={4}
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          required
                          minLength={10}
                          className="w-full border rounded-lg p-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                            {t("ui.scheduled")}
                          </label>
                          <Input
                            type="datetime-local"
                            value={editForm.scheduledFor}
                            onChange={(e) => setEditForm({ ...editForm, scheduledFor: e.target.value })}
                            required
                            className="bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                            {t("ui.category")}
                          </label>
                          <select
                            value={editForm.category}
                            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                            className="w-full border rounded-lg p-2.5 text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
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
                      </div>

                      <div className="pt-2">
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
                          {t("ui.location")}
                        </label>
                        <LocationPicker
                          initialLocation={{
                            address: editForm.address,
                            landmark: editForm.landmark,
                            city: editForm.city,
                            state: editForm.state,
                            locationLat: editForm.locationLat,
                            locationLng: editForm.locationLng,
                          }}
                          onLocationSelect={(loc) => {
                            setEditForm((prev) => ({ ...prev, ...loc }));
                          }}
                        />
                      </div>

                      <div className="flex gap-2 justify-end pt-3">
                        <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                          {t("ui.cancel")}
                        </Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                          {t("ui.save_changes")}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              ) : (
                /* Task Requirements & Description Card */
                <Card className="border-slate-200/80 shadow-xs">
                  <CardHeader className="py-4 px-5 border-b border-slate-100">
                    <CardTitle className="text-base font-semibold text-slate-900">
                      {t("task_detail.service_requirements")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 sm:p-6 space-y-4">
                    <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {task.description}
                    </div>

                    {/* Structured Service Specs if linked */}
                    {service ? (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                            {t("task_detail.structured_service_badge")}
                          </span>
                          <span className="text-xs text-blue-600 font-medium">
                            {service.category?.name || task.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{service.description}</p>

                        {/* Required skills tags */}
                        {service.skills && service.skills.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-xs font-semibold text-slate-700 block">
                              {t("task_detail.required_skills")}
                            </span>
                            <div className="flex gap-2 flex-wrap">
                              {service.skills.map((skill: any) => {
                                const hasSkill = workerProfile?.skills?.some((ws: any) => ws.id === skill.id);
                                return (
                                  <Badge
                                    key={skill.id}
                                    variant={hasSkill ? "default" : "outline"}
                                    className={`text-xs ${
                                      hasSkill
                                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none font-medium"
                                        : "bg-slate-50 text-slate-600 border-slate-200"
                                    }`}
                                  >
                                    {skill.name}
                                    {hasSkill && " ✓"}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <Badge variant="outline" className="text-xs text-slate-500 bg-slate-50">
                          {t("task_detail.legacy_service_badge")}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Worker Action: Start Task Action Callout (when ACCEPTED) */}
              {isHelper && task.status === "ACCEPTED" && (
                <Card className="border-blue-300 bg-gradient-to-br from-blue-50/80 to-indigo-50/40 shadow-xs">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h3 className="font-bold text-base text-blue-950">
                          {t("task_detail.start_task_btn")}
                        </h3>
                        <p className="text-xs text-blue-800">
                          {t("task_detail.action_worker_accepted")}
                        </p>
                      </div>
                      <Button
                        size="lg"
                        onClick={() =>
                          setConfirmModal({
                            isOpen: true,
                            title: t("task_detail.start_confirm_title"),
                            description: t("task_detail.start_confirm_desc"),
                            confirmText: t("task_detail.start_task_btn"),
                            variant: "default",
                            onConfirm: executeStartTask,
                          })
                        }
                        disabled={isStarting}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold shrink-0 w-full sm:w-auto"
                      >
                        {isStarting ? t("task.loading") : t("task_detail.start_task_btn")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Worker Action: Upload Proof of Work (when IN_PROGRESS) */}
              {isHelper && task.status === "IN_PROGRESS" && (
                <Card className="border-blue-200 shadow-sm bg-white">
                  <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-4 px-5">
                    <div className="flex items-center gap-2">
                      <Camera className="w-5 h-5 text-blue-600" />
                      <div>
                        <CardTitle className="text-base font-semibold text-slate-900">
                          {t("task_detail.upload_proof_title")}
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                          {t("task_detail.upload_proof_desc")}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 transition-colors rounded-xl p-6 text-center space-y-3 bg-slate-50/50">
                      {proofPreviewUrl ? (
                        <div className="space-y-3">
                          <img
                            src={proofPreviewUrl}
                            alt="Proof Preview"
                            className="max-h-56 mx-auto rounded-lg border shadow-xs object-cover"
                          />
                          <div className="flex items-center justify-center gap-3">
                            <span className="text-xs text-slate-600 font-medium">
                              {proofFile?.name}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setProofFile(null);
                                setProofPreviewUrl(null);
                              }}
                              className="text-red-600 hover:bg-red-50 text-xs h-7"
                            >
                              <X className="w-3.5 h-3.5 mr-1" /> Remove
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <label className="cursor-pointer block space-y-2">
                          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                            <Upload className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-blue-600 hover:underline">
                              {t("task_detail.select_photo")}
                            </span>
                            <p className="text-xs text-slate-500 mt-0.5">
                              JPG, PNG, or WebP up to 5MB
                            </p>
                          </div>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={handleProofFileChange}
                          />
                        </label>
                      )}
                    </div>

                    {proofFile && (
                      <div className="flex justify-end">
                        <Button
                          onClick={handleUploadProof}
                          disabled={isUploadingProof}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                        >
                          {isUploadingProof ? t("task_detail.uploading") : t("task_detail.submit_proof_btn")}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Customer Action: Approve Completion (when PROOF_SUBMITTED) */}
              {isOwner && task.status === "PROOF_SUBMITTED" && (
                <Card className="border-emerald-300 bg-gradient-to-br from-emerald-50/90 to-teal-50/50 shadow-xs">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h3 className="font-bold text-base text-emerald-950 flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          {t("task_detail.approve_completion_btn")}
                        </h3>
                        <p className="text-xs text-emerald-800 leading-relaxed">
                          {t("task_detail.action_customer_proof")}
                        </p>
                      </div>
                      <Button
                        size="lg"
                        onClick={() =>
                          setConfirmModal({
                            isOpen: true,
                            title: t("task_detail.approve_confirm_title"),
                            description: t("task_detail.approve_confirm_desc"),
                            confirmText: t("task_detail.approve_completion_btn"),
                            variant: "success",
                            onConfirm: executeApproveCompletion,
                          })
                        }
                        disabled={isApproving}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shrink-0 w-full sm:w-auto shadow-xs"
                      >
                        {isApproving ? t("task.loading") : t("task_detail.approve_completion_btn")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Proof of Work Gallery Card (if media attachments exist) */}
              {task.media && task.media.length > 0 && (
                <Card className="border-slate-200/80 shadow-xs">
                  <CardHeader className="py-4 px-5 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-semibold text-slate-900">
                          {t("task_detail.proof_gallery_title")}
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                          {t("task_detail.proof_gallery_desc")}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600">
                        {task.media.length} {t("task_detail.evidence_attached")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 sm:p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {task.media.map((m: any) => (
                        <div
                          key={m.id}
                          onClick={() => setSelectedMediaPreview(m.url)}
                          className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-slate-100 aspect-square shadow-xs"
                        >
                          <img
                            src={m.url}
                            alt="Job Evidence"
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Eye className="w-6 h-6" />
                          </div>
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-[10px] text-white">
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Applicant Management (for Customer when task is OPEN) */}
              {isOwner && task.status === "OPEN" && (
                <Card className="border-slate-200/80 shadow-xs">
                  <CardHeader className="py-4 px-5 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-semibold text-slate-900">
                          {t("task_detail.applicants_title")} ({applications.length})
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                          {t("task_detail.applicants_desc")}
                        </CardDescription>
                      </div>
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        Live Bids
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 sm:p-6 space-y-4">
                    {applications.length > 0 ? (
                      <div className="space-y-3">
                        {applications.map((app) => {
                          const tasker = app.tasker;
                          const profile = tasker?.profile;
                          const score = Number(profile?.trustScore) || 0;
                          return (
                            <div
                              key={app.id}
                              className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-blue-200 hover:shadow-xs transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                            >
                              <div className="flex items-start gap-3.5 flex-1">
                                <Avatar className="h-12 w-12 border border-slate-200 shrink-0">
                                  {profile?.avatarUrl ? (
                                    <AvatarImage src={profile.avatarUrl} alt={profile.fullName} />
                                  ) : null}
                                  <AvatarFallback className="bg-blue-50 text-blue-700 font-bold">
                                    {profile?.fullName?.[0] || tasker.email[0].toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>

                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Link
                                      to={`/user/${tasker.id}`}
                                      className="font-bold text-slate-900 hover:text-blue-600 text-sm"
                                    >
                                      {profile?.fullName || t("task_detail.anonymous_user")}
                                    </Link>
                                    <VerifiedWorkerBadge size="sm" />
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <TrustScoreBadge score={score} />
                                    <span className="text-xs text-slate-400">
                                      Applied {new Date(app.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>

                                  {app.message && (
                                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-1 italic">
                                      "{app.message}"
                                    </p>
                                  )}
                                </div>
                              </div>

                              {rejectedApplications.includes(tasker.id) ? (
                                <div className="flex items-center gap-2 text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md text-xs font-semibold shrink-0">
                                  <X className="w-4 h-4" />
                                  Rejected
                                </div>
                              ) : (
                                <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
                                  <Button
                                    variant="outline"
                                    onClick={() => handleRejectHelper(tasker.id)}
                                    disabled={isRejectingHelper === tasker.id || isSelectingHelper === tasker.id}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold text-xs shrink-0 w-full sm:w-auto"
                                  >
                                    {isRejectingHelper === tasker.id ? "Rejecting..." : "Reject"}
                                  </Button>
                                  <Button
                                    onClick={() =>
                                      setConfirmModal({
                                        isOpen: true,
                                        title: "Select Worker & Lock Escrow?",
                                        description: `Confirm assigning this task to ${profile?.fullName || "this worker"}. Booking funds will be safely locked in HelpGram cooperative escrow.`,
                                        confirmText: t("task_detail.select_worker_btn"),
                                        variant: "default",
                                        onConfirm: () => handleSelectHelper(tasker.id),
                                      })
                                    }
                                    disabled={isSelectingHelper === tasker.id || isRejectingHelper === tasker.id}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shrink-0 w-full sm:w-auto"
                                  >
                                    {isSelectingHelper === tasker.id
                                      ? t("task_detail.selecting")
                                      : t("task_detail.select_worker_btn")}
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center space-y-2 bg-slate-50/50">
                        <Users className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="text-sm font-medium text-slate-700">
                          {t("task_detail.no_applicants_yet")}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Worker Application Box (for eligible workers when task is OPEN) */}
              {!isOwner && isWorkerRole && task.status === "OPEN" && (
                <Card className="border-blue-200/80 shadow-xs bg-white">
                  <CardHeader className="py-4 px-5 border-b border-slate-100 bg-blue-50/30">
                    <CardTitle className="text-base font-semibold text-slate-900">
                      {t("task_detail.apply_title")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 sm:p-6">
                    {hasApplied ? (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-900 text-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                          <p className="font-bold">{t("task_detail.already_applied_badge")}</p>
                          <p className="text-xs text-emerald-700 mt-0.5">
                            {t("task_detail.action_worker_open_applied")}
                          </p>
                        </div>
                      </div>
                    ) : isApplying ? (
                      <div className="space-y-4">
                        <textarea
                          placeholder={t("task_detail.apply_placeholder")}
                          className="w-full border rounded-xl p-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                          rows={3}
                          value={applyMessage}
                          onChange={(e) => setApplyMessage(e.target.value)}
                        />

                        {applyError && (
                          <div className="p-3.5 bg-red-50 text-red-800 rounded-xl text-xs border border-red-200 space-y-1">
                            <p className="font-bold">
                              {typeof applyError.error === "string" ? applyError.error : "Eligibility Notice"}
                            </p>
                            {applyError.error === "ACCOUNT_RESTRICTED" && (
                              <p>{applyError.message}</p>
                            )}
                            {applyError.reason === "MISSING_SKILLS" && applyError.missingSkills && (
                              <p>
                                {t("ui.missing_required_skills")}: {applyError.missingSkills.join(", ")}
                              </p>
                            )}
                            {applyError.reason === "CROSS_FEDERATION" && (
                              <p>{t("ui.you_must_belong")}</p>
                            )}
                            {applyError.reason === "NO_ACTIVE_SOCIETY_MEMBERSHIP" && (
                              <p>{t("ui.you_must_have")}</p>
                            )}
                            {applyError.reason === "SERVICE_INACTIVE" && (
                              <p>{t("ui.the_structured_service")}</p>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsApplying(false);
                              setApplyError(null);
                            }}
                          >
                            {t("ui.cancel")}
                          </Button>
                          <Button
                            onClick={handleApply}
                            disabled={isSubmittingApply}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                          >
                            {isSubmittingApply ? t("task.loading") : t("task_detail.submit_application_btn")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="lg"
                        onClick={() => setIsApplying(true)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm"
                      >
                        {t("task.apply")}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Active Dispute Information Banner (if task is in dispute) */}
              {task.dispute && (() => {
                const isResolved = ["RESOLVED_REFUNDED", "RESOLVED_RELEASED", "REJECTED"].includes(task.dispute.status);
                return (
                  <Card className={`shadow-xs ${isResolved ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50"}`}>
                    <CardHeader className={`py-4 px-5 border-b ${isResolved ? "border-emerald-100 bg-emerald-100/40" : "border-red-100 bg-red-100/40"}`}>
                      <CardTitle className={`text-base flex items-center gap-2 font-bold ${isResolved ? "text-emerald-950" : "text-red-950"}`}>
                        {isResolved ? <CheckCircle2 className="w-5 h-5 text-emerald-700" /> : <ShieldAlert className="w-5 h-5 text-red-700" />}
                        {isResolved ? t("task_detail.dispute_banner_title_resolved") : t("task_detail.dispute_banner_title")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 sm:p-6 space-y-3 text-xs sm:text-sm">
                      <div className={`flex justify-between items-center py-1 border-b ${isResolved ? "border-emerald-100" : "border-red-100"}`}>
                        <span className={`font-semibold ${isResolved ? "text-emerald-900" : "text-red-900"}`}>
                          {t("task_detail.dispute_status_label")}
                        </span>
                        <Badge variant={isResolved ? "default" : "destructive"} className={isResolved ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-red-600"}>
                          {task.dispute.status}
                        </Badge>
                      </div>
                      <div>
                        <span className={`font-semibold block mb-1 ${isResolved ? "text-emerald-900" : "text-red-900"}`}>
                          {t("task_detail.dispute_reason_label")}:
                        </span>
                        <p className={`p-3 rounded-lg border leading-relaxed bg-white ${isResolved ? "text-emerald-800 border-emerald-200/80" : "text-red-800 border-red-200/80"}`}>
                          {task.dispute.reason}
                        </p>
                      </div>
                      {task.dispute.resolution && (
                        <div className="pt-2">
                          <span className={`font-semibold block mb-1 ${isResolved ? "text-emerald-900" : "text-red-900"}`}>
                            {t("task_detail.dispute_resolution_label")}:
                          </span>
                          <p className={`font-medium p-3 rounded-lg border bg-white ${isResolved ? "text-emerald-900 border-emerald-200" : "text-red-900 border-red-200"}`}>
                            {task.dispute.resolution}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Open Dispute Form Modal/Section */}
              {isDisputing && !task.dispute && (
                <Card className="border-red-200 shadow-sm bg-white">
                  <CardHeader className="bg-red-50/70 border-b border-red-100 py-4 px-5">
                    <CardTitle className="text-base font-bold text-red-950 flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-red-600" />
                      {t("task_detail.file_dispute_title")}
                    </CardTitle>
                    <CardDescription className="text-xs text-red-800">
                      {t("task_detail.file_dispute_desc")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 sm:p-6 space-y-4">
                    <textarea
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      placeholder={t("task_detail.dispute_reason_placeholder")}
                      className="w-full border rounded-xl p-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-red-500 bg-white"
                      rows={4}
                      required
                      minLength={10}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setIsDisputing(false)}>
                        {t("ui.cancel")}
                      </Button>
                      <Button
                        onClick={handleDispute}
                        disabled={isSubmittingDispute || disputeReason.trim().length < 10}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold"
                      >
                        {isSubmittingDispute ? t("task.loading") : t("task_detail.submit_dispute_btn")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Leave a Review Section (when task is COMPLETED) */}
              {(isOwner || isHelper) && task.status === "COMPLETED" && (
                <Card className="border-purple-200 bg-white shadow-xs">
                  <CardHeader className="py-4 px-5 border-b border-purple-100 bg-purple-50/40">
                    <CardTitle className="text-base font-semibold text-purple-950 flex items-center gap-2">
                      <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                      {t("task_detail.review_title")}
                    </CardTitle>
                    <CardDescription className="text-xs text-purple-800">
                      {t("task_detail.review_desc")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 sm:p-6 space-y-4">
                    {isReviewing ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-700 mr-2">Rating:</span>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                              className="text-2xl transition-transform hover:scale-110 focus:outline-hidden"
                            >
                              <Star
                                className={`w-7 h-7 ${
                                  star <= reviewForm.rating
                                    ? "text-amber-500 fill-amber-400"
                                    : "text-slate-300"
                                }`}
                              />
                            </button>
                          ))}
                        </div>

                        <textarea
                          value={reviewForm.comment}
                          onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                          placeholder={t("task_detail.review_comment_placeholder")}
                          className="w-full border rounded-xl p-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500 bg-white"
                          rows={3}
                        />

                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" onClick={() => setIsReviewing(false)}>
                            {t("ui.cancel")}
                          </Button>
                          <Button
                            onClick={handleReview}
                            disabled={isSubmittingReview}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                          >
                            {isSubmittingReview ? t("task.loading") : t("task_detail.submit_review_btn")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={() => setIsReviewing(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                      >
                        <Star className="w-4 h-4 mr-2" />
                        {t("task_detail.leave_review_btn")}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

            </div>

            {/* Right Sidebar Column (Trust, Escrow & Participants) (1/3 width) */}
            <div className="space-y-6">

              {/* Financial & Escrow Summary Card */}
              <Card className="border-slate-200/80 shadow-xs overflow-hidden">
                <CardHeader className="py-4 px-5 border-b border-slate-100 bg-slate-50/60">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
                    <span>{t("task_detail.financial_title")}</span>
                    <CooperativeShield className="scale-75" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-2.5 text-xs sm:text-sm">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>{t("task_detail.booking_price")}</span>
                      <span className="font-bold text-slate-900">
                        ₹{Number(task.price).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500">
                      <span>{t("task_detail.coop_fee")}</span>
                      <span className="font-medium text-amber-700">
                        -₹{(Number(task.price) * 0.1).toFixed(2)}
                      </span>
                    </div>
                    <div className="h-px bg-slate-100" />
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">
                        {t("task_detail.worker_payout")}
                      </span>
                      <span className="font-extrabold text-emerald-600 text-base">
                        ₹{(Number(task.price) * 0.9).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Escrow Status Banner */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                      {t("task_detail.escrow_protection")}
                    </span>

                    {task.status === "OPEN" && (
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-slate-500" />
                          <span>Pending Assignment</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {t("task_detail.escrow_open_hint")}
                        </p>
                      </div>
                    )}

                    {["ACCEPTED", "IN_PROGRESS", "PROOF_SUBMITTED"].includes(task.status) && (
                      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-950 space-y-1">
                        <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Escrow Locked & Protected</span>
                        </div>
                        <p className="text-[11px] text-emerald-800">
                          {t("task_detail.escrow_locked_hint")}
                        </p>
                      </div>
                    )}

                    {task.status === "COMPLETED" && (
                      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-950 space-y-1">
                        <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Escrow Released</span>
                        </div>
                        <p className="text-[11px] text-emerald-800">
                          {t("task_detail.escrow_released_hint")}
                        </p>
                      </div>
                    )}

                    {task.status === "CANCELLED" && (
                      <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1">
                        <div className="font-bold text-slate-800">Escrow Refunded</div>
                        <p className="text-[11px] text-slate-600">
                          {t("task_detail.escrow_refunded_hint")}
                        </p>
                      </div>
                    )}

                    {task.status === "DISPUTED" && (
                      <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-xs text-red-950 space-y-1">
                        <div className="font-bold text-red-900 flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-red-700" />
                          <span>Escrow Frozen</span>
                        </div>
                        <p className="text-[11px] text-red-800">
                          {t("task_detail.escrow_disputed_hint")}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Customer / Requester Profile Card */}
              <Card className="border-slate-200/80 shadow-xs">
                <CardHeader className="py-3.5 px-5 border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {t("task_detail.customer_card_title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 flex items-start gap-3.5">
                  <Avatar className="h-12 w-12 border border-slate-200 shrink-0">
                    {task.requester?.profile?.avatarUrl ? (
                      <AvatarImage src={task.requester.profile.avatarUrl} alt="Requester" />
                    ) : null}
                    <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                      {task.requester?.profile?.fullName?.[0] || task.requester?.email?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1 flex-1">
                    <Link
                      to={`/user/${task.requester?.id}`}
                      className="font-bold text-sm text-slate-900 hover:text-blue-600 block"
                    >
                      {task.requester?.profile?.fullName || t("task_detail.anonymous_user")}
                    </Link>
                    <p className="text-xs text-slate-500">{task.requester?.email}</p>
                    {task.requester?.profile?.trustScore !== undefined && (
                      <div className="pt-1">
                        <TrustScoreBadge score={Number(task.requester.profile.trustScore)} />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Assigned Worker Profile Card (if taskerId is assigned) */}
              {task.tasker && (
                <Card className="border-blue-200/90 shadow-xs bg-white">
                  <CardHeader className="py-3.5 px-5 border-b border-blue-50 bg-blue-50/40">
                    <CardTitle className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center justify-between">
                      <span>{t("task_detail.worker_card_title")}</span>
                      <VerifiedWorkerBadge size="sm" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start gap-3.5">
                      <Avatar className="h-12 w-12 border border-blue-200 shrink-0">
                        {task.tasker.profile?.avatarUrl ? (
                          <AvatarImage src={task.tasker.profile.avatarUrl} alt="Tasker" />
                        ) : null}
                        <AvatarFallback className="bg-purple-100 text-purple-700 font-bold">
                          {task.tasker.profile?.fullName?.[0] || task.tasker.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1 flex-1">
                        <Link
                          to={`/user/${task.tasker.id}`}
                          className="font-bold text-sm text-slate-900 hover:text-blue-600 block"
                        >
                          {task.tasker.profile?.fullName || t("task_detail.anonymous_user")}
                        </Link>
                        <p className="text-xs text-slate-500">{task.tasker.email}</p>
                        {task.tasker.profile?.trustScore !== undefined && (
                          <div className="pt-1">
                            <TrustScoreBadge score={Number(task.tasker.profile.trustScore)} />
                          </div>
                        )}
                      </div>
                    </div>

                    {(isOwner || isHelper) && (
                      <Button
                        variant="outline"
                        onClick={() => navigate("/chat")}
                        className="w-full border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold text-xs"
                      >
                        <MessageSquare className="w-4 h-4 mr-1.5" />
                        {isOwner ? t("task_detail.chat_btn") : t("task_detail.chat_customer_btn")}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Location & Schedule Card */}
              <Card className="border-slate-200/80 shadow-xs">
                <CardHeader className="py-3.5 px-5 border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {t("task_detail.location_card_title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-2.5 text-xs text-slate-700">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-slate-900">
                          {task.address || "Location Coordinates"}
                        </p>
                        {task.city && <p className="text-slate-500">{task.city}{task.state ? `, ${task.state}` : ""}</p>}
                        {task.landmark && (
                          <p className="text-slate-500 mt-0.5">
                            {t("ui.near")}: <span className="font-medium">{task.landmark}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-2 pt-1 border-t border-slate-100">
                      <Calendar className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-slate-900">
                          {new Date(task.scheduledFor).toLocaleDateString()}
                        </p>
                        <p className="text-slate-500">
                          {new Date(task.scheduledFor).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Embedded Google Map Preview */}
                  {task.locationLat && task.locationLng && (
                    <div className="w-full h-44 rounded-xl overflow-hidden border border-slate-200 relative shadow-inner">
                      <Map
                        defaultCenter={{ lat: Number(task.locationLat), lng: Number(task.locationLng) }}
                        defaultZoom={14}
                        gestureHandling="cooperative"
                        disableDefaultUI={true}
                        className="w-full h-full"
                      >
                        <Marker position={{ lat: Number(task.locationLat), lng: Number(task.locationLng) }} />
                      </Map>
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>

          </div>

        </div>

        {/* Mobile Sticky Primary Action Footer */}
        <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3.5 z-40 shadow-lg">
          <div className="flex items-center gap-2">
            {/* Owner: Approve Proof */}
            {isOwner && task.status === "PROOF_SUBMITTED" && (
              <Button
                onClick={() =>
                  setConfirmModal({
                    isOpen: true,
                    title: t("task_detail.approve_confirm_title"),
                    description: t("task_detail.approve_confirm_desc"),
                    confirmText: t("task_detail.approve_completion_btn"),
                    variant: "success",
                    onConfirm: executeApproveCompletion,
                  })
                }
                disabled={isApproving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {t("task_detail.approve_completion_btn")}
              </Button>
            )}

            {/* Worker: Start Task */}
            {isHelper && task.status === "ACCEPTED" && (
              <Button
                onClick={() =>
                  setConfirmModal({
                    isOpen: true,
                    title: t("task_detail.start_confirm_title"),
                    description: t("task_detail.start_confirm_desc"),
                    confirmText: t("task_detail.start_task_btn"),
                    variant: "default",
                    onConfirm: executeStartTask,
                  })
                }
                disabled={isStarting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-11"
              >
                {t("task_detail.start_task_btn")}
              </Button>
            )}

            {/* Worker: In Progress Proof Scroll */}
            {isHelper && task.status === "IN_PROGRESS" && (
              <Button
                onClick={() => window.scrollTo({ top: 400, behavior: "smooth" })}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-11"
              >
                <Camera className="w-4 h-4 mr-2" />
                {t("task_detail.upload_proof_title")}
              </Button>
            )}

            {/* Worker: Apply when OPEN */}
            {!isOwner && isWorkerRole && task.status === "OPEN" && !hasApplied && (
              <Button
                onClick={() => setIsApplying(true)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-11"
              >
                {t("task.apply")}
              </Button>
            )}

            {/* Chat Quick Action */}
            {task.taskerId && (isOwner || isHelper) && (
              <Button
                variant="outline"
                onClick={() => navigate("/chat")}
                className="h-11 px-4 border-slate-300"
              >
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </Button>
            )}
          </div>
        </div>

        {/* Modal: Media / Photo Zoom Lightbox */}
        {selectedMediaPreview && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedMediaPreview(null)}
          >
            <div className="relative max-w-3xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
              <button
                onClick={() => setSelectedMediaPreview(null)}
                className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={selectedMediaPreview}
                alt="Enlarged Proof"
                className="max-w-full max-h-[85vh] object-contain mx-auto"
              />
            </div>
          </div>
        )}

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
    </MapProvider>
  );
}
