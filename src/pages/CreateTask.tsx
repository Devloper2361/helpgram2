import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "../i18n";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Bot, 
  Sparkles, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  ShieldCheck, 
  Info, 
  Check, 
  ArrowRight, 
  RefreshCw, 
  Briefcase, 
  Search,
  Zap,
  Lock,
  Layers,
  FileText,
  Eye,
  SlidersHorizontal
} from "lucide-react";
import { MapProvider } from "@/components/MapProvider";
import { LocationPicker, LocationData } from "@/components/LocationPicker";
import { 
  EscrowProtectedBadge, 
  CooperativeShield, 
  VerifiedWorkerBadge,
  SocietyMemberBadge
} from "../components/TrustIndicators";
import { cn } from "@/lib/utils";

export default function CreateTaskPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialServiceId = searchParams.get("serviceId") || "";

  // Wizard state
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [serviceSearch, setServiceSearch] = useState<string>("");

  const [form, setForm] = useState({
    serviceId: initialServiceId,
    title: "",
    description: "",
    scheduledFor: "",
    locationLat: 0,
    locationLng: 0,
    address: "",
    landmark: "",
    city: "",
    state: "",
    isEmergency: false,
  });

  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [locationSelected, setLocationSelected] = useState<boolean>(false);

  // AI Assistant States
  const [aiOpen, setAiOpen] = useState<boolean>(false);
  const [aiProblem, setAiProblem] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>("");
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string>("");

  // Load services and categories
  useEffect(() => {
    setLoadingServices(true);
    Promise.all([
      fetch("/api/services").then(r => r.json()).catch(() => ({ services: [] })),
      fetch("/api/categories").then(r => r.json()).catch(() => ({ categories: [] }))
    ])
      .then(([servData, catData]) => {
        if (servData.services) setServices(servData.services);
        if (catData.categories) setCategories(catData.categories);
        
        // If initialServiceId is provided, pre-select it
        if (initialServiceId && servData.services) {
          const match = servData.services.find((s: any) => s.id === initialServiceId);
          if (match) {
            setForm(prev => ({
              ...prev,
              serviceId: match.id,
              title: prev.title || match.name
            }));
            if (match.categoryId) {
              setSelectedCategory(match.categoryId);
            }
          }
        }
      })
      .catch(err => {
        console.error("Failed to load catalog data", err);
      })
      .finally(() => {
        setLoadingServices(false);
      });
  }, [initialServiceId]);

  // Find currently selected service object
  const selectedService = useMemo(() => {
    return services.find(s => s.id === form.serviceId) || null;
  }, [services, form.serviceId]);

  // Filter services by category and search
  const filteredServices = useMemo(() => {
    return services.filter(s => {
      const matchCat = !selectedCategory || s.categoryId === selectedCategory;
      const matchSearch = !serviceSearch || 
        s.name.toLowerCase().includes(serviceSearch.toLowerCase()) || 
        (s.description && s.description.toLowerCase().includes(serviceSearch.toLowerCase())) ||
        (s.category?.name && s.category.name.toLowerCase().includes(serviceSearch.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [services, selectedCategory, serviceSearch]);

  // AI Assistant Generator
  const handleAIGenerate = async () => {
    if (aiProblem.trim().length < 10) {
      setAiError(t("booking.validation_desc") || "Please provide more detail (min 10 chars).");
      return;
    }
    setAiLoading(true);
    setAiError("");
    setAiSuccessMsg("");

    try {
      const res = await fetch("/api/ai/suggest-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem: aiProblem.trim() })
      });

      if (res.ok) {
        const data = await res.json();
        setForm(prev => ({
          ...prev,
          serviceId: data.serviceId,
          title: data.title,
          description: data.description
        }));
        if (data.categoryId) {
          setSelectedCategory(data.categoryId);
        }
        setAiSuccessMsg(`${data.serviceName}: ${data.shortReason}`);
        // Advance to step 2 automatically on good recommendation
        setTimeout(() => {
          setCurrentStep(2);
        }, 1200);
      } else {
        const err = await res.json();
        setAiError(typeof err.error === "string" ? err.error : (err.error?.formErrors?.[0] || JSON.stringify(err.error) || "Failed to generate AI suggestion."));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to connect to AI assistant.";
      setAiError(message);
    } finally {
      setAiLoading(false);
    }
  };

  // Quick schedule helpers
  const handleSetQuickSchedule = (type: "today_2h" | "tomorrow_morning" | "tomorrow_afternoon" | "weekend") => {
    const now = new Date();
    let target = new Date();

    if (type === "today_2h") {
      target = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    } else if (type === "tomorrow_morning") {
      target.setDate(now.getDate() + 1);
      target.setHours(9, 0, 0, 0);
    } else if (type === "tomorrow_afternoon") {
      target.setDate(now.getDate() + 1);
      target.setHours(14, 0, 0, 0);
    } else if (type === "weekend") {
      const daysUntilSat = (6 - now.getDay() + 7) % 7 || 7;
      target.setDate(now.getDate() + daysUntilSat);
      target.setHours(10, 0, 0, 0);
    }

    // Format to YYYY-MM-DDTHH:mm for datetime-local
    const year = target.getFullYear();
    const month = String(target.getMonth() + 1).padStart(2, '0');
    const day = String(target.getDate()).padStart(2, '0');
    const hours = String(target.getHours()).padStart(2, '0');
    const minutes = String(target.getMinutes()).padStart(2, '0');
    const localStr = `${year}-${month}-${day}T${hours}:${minutes}`;

    setForm(prev => ({ ...prev, scheduledFor: localStr }));
  };

  // Step Validation
  const validateStep = (step: number): boolean => {
    setError("");
    if (step === 1) {
      if (!form.serviceId) {
        setError(t("booking.validation_service"));
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (!form.title || form.title.trim().length < 5) {
        setError(t("booking.validation_title"));
        return false;
      }
      if (!form.description || form.description.trim().length < 10) {
        setError(t("booking.validation_desc"));
        return false;
      }
      return true;
    }
    if (step === 3) {
      if (!locationSelected || typeof form.locationLat !== "number" || typeof form.locationLng !== "number" || (form.locationLat === 0 && form.locationLng === 0)) {
        setError(t("booking.validation_location"));
        return false;
      }
      return true;
    }
    if (step === 4) {
      if (!form.isEmergency && !form.scheduledFor) {
        setError(t("booking.validation_schedule"));
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(5, prev + 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevStep = () => {
    setError("");
    setCurrentStep(prev => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Final Form Submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Validate all steps
    if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const scheduledDate = form.isEmergency 
        ? new Date().toISOString() 
        : (form.scheduledFor ? new Date(form.scheduledFor).toISOString() : new Date().toISOString());

      // STRICT API COMPLIANCE: No price in request body. Server computes price.
      const payload: Record<string, any> = {
        serviceId: form.serviceId,
        title: form.title.trim(),
        description: form.description.trim(),
        scheduledFor: scheduledDate,
        locationLat: Number(form.locationLat),
        locationLng: Number(form.locationLng),
        isEmergency: Boolean(form.isEmergency),
      };

      if (form.address?.trim()) payload.address = form.address.trim();
      if (form.landmark?.trim()) payload.landmark = form.landmark.trim();
      if (form.city?.trim()) payload.city = form.city.trim();
      if (form.state?.trim()) payload.state = form.state.trim();
      if (selectedService?.category?.name) payload.category = selectedService.category.name;

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        navigate(`/tasks/${data.task.id}`);
      } else {
        const err = await res.json();
        if (err.error === "ACCOUNT_RESTRICTED") {
          setError(err.message || "Your account is temporarily restricted from creating bookings.");
        } else if (typeof err.error === "string") {
          setError(err.error);
        } else if (err.error?.formErrors && err.error.formErrors.length > 0) {
          setError(err.error.formErrors.join(", "));
        } else if (err.message) {
          setError(err.message);
        } else {
          setError(t("booking.error_creating"));
        }
      }
    } catch (err: any) {
      setError(err?.message || t("booking.error_creating"));
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, label: t("booking.step1_title"), icon: Briefcase },
    { id: 2, label: t("booking.step2_title"), icon: FileText },
    { id: 3, label: t("booking.step3_title"), icon: MapPin },
    { id: 4, label: t("booking.step4_title"), icon: Clock },
    { id: 5, label: t("booking.step5_title"), icon: ShieldCheck },
  ];

  return (
    <MapProvider>
      <div className="max-w-4xl mx-auto py-6 sm:py-8 px-4 sm:px-6">
        
        {/* Header & Trust Context */}
        <div className="mb-6 sm:mb-8 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                {t("booking.title")}
              </h1>
              <p className="text-sm sm:text-base text-slate-600 mt-1">
                {t("booking.subtitle")}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <CooperativeShield />
            </div>
          </div>
        </div>

        {/* Multi-Step Visual Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-slate-200 w-full z-0" />
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 transition-all duration-300 z-0"
              style={{ width: `${((currentStep - 1) / 4) * 100}%` }}
            />
            {steps.map((s) => {
              const isCompleted = s.id < currentStep;
              const isCurrent = s.id === currentStep;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    if (s.id < currentStep || validateStep(currentStep)) {
                      setCurrentStep(s.id);
                    }
                  }}
                  className={cn(
                    "relative z-10 flex flex-col items-center group focus:outline-none",
                    s.id > currentStep && "cursor-not-allowed"
                  )}
                  disabled={s.id > currentStep}
                >
                  <div 
                    className={cn(
                      "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm transition-all duration-200 shadow-sm",
                      isCompleted && "bg-emerald-600 text-white ring-4 ring-emerald-100",
                      isCurrent && "bg-blue-600 text-white ring-4 ring-blue-100 scale-105",
                      !isCompleted && !isCurrent && "bg-white border-2 border-slate-300 text-slate-500"
                    )}
                  >
                    {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : s.id}
                  </div>
                  <span className={cn(
                    "text-[11px] sm:text-xs font-medium mt-1.5 hidden md:block max-w-[100px] text-center line-clamp-1",
                    isCurrent ? "text-blue-900 font-bold" : isCompleted ? "text-emerald-800" : "text-slate-500"
                  )}>
                    {s.label.split(". ")[1] || s.label}
                  </span>
                </button>
              );
            })}
          </div>
          
          {/* Mobile step label */}
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 md:hidden px-1">
            <span className="font-semibold text-blue-700">
              {steps[currentStep - 1].label}
            </span>
            <span>
              {t("booking.step_indicator")} {currentStep} {t("booking.of_steps")}
            </span>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 text-sm animate-in fade-in">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Main Step Cards Container */}
        <div className="space-y-6">

          {/* ============================================================ */}
          {/* STEP 1: SERVICE SELECTION */}
          {/* ============================================================ */}
          {currentStep === 1 && (
            <Card className="border-slate-200/90 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900">
                      {t("booking.step1_title")}
                    </CardTitle>
                    <CardDescription className="text-sm text-slate-500 mt-0.5">
                      {t("booking.step1_subtitle")}
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAiOpen(!aiOpen)}
                    className="border-blue-200 text-blue-700 hover:bg-blue-50/70 self-start sm:self-auto gap-1.5 text-xs font-semibold"
                  >
                    <Bot className="h-4 w-4" />
                    <span>{aiOpen ? "Hide AI Helper" : t("booking.ai_assistant_title")}</span>
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                
                {/* AI Assistant Section (Collapsible) */}
                {aiOpen && (
                  <div className="p-4 sm:p-5 border border-blue-200 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 rounded-xl space-y-3.5 animate-in fade-in">
                    <div className="flex items-center gap-2 text-blue-900">
                      <Sparkles className="h-5 w-5 text-blue-600" />
                      <h4 className="font-semibold text-sm sm:text-base">{t("booking.ai_assistant_title")}</h4>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {t("booking.ai_assistant_desc")}
                    </p>

                    <div className="space-y-2">
                      <textarea
                        value={aiProblem}
                        onChange={(e) => setAiProblem(e.target.value)}
                        placeholder={t("booking.ai_placeholder")}
                        className="w-full text-sm p-3.5 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white min-h-[90px] resize-none"
                        maxLength={1000}
                      />
                      {aiError && (
                        <p className="text-xs text-red-600 font-medium">{aiError}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-500">
                        {aiProblem.length}/1000 characters
                      </div>
                      <Button
                        type="button"
                        onClick={handleAIGenerate}
                        disabled={aiLoading || aiProblem.trim().length < 10}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 px-4 font-semibold"
                      >
                        {aiLoading ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                            {t("booking.ai_thinking")}
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                            {t("booking.ai_suggest_btn")}
                          </>
                        )}
                      </Button>
                    </div>

                    {aiSuccessMsg && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs sm:text-sm text-emerald-900 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>{aiSuccessMsg}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Search & Category Filter Controls */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Search services (e.g. Electrical, Plumbing, Cleaning)..."
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      className="pl-10 h-10 text-sm bg-slate-50/50 border-slate-200"
                    />
                  </div>

                  {/* Category Chips */}
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(null)}
                      className={cn(
                        "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all",
                        selectedCategory === null
                          ? "bg-slate-900 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      {t("booking.all_categories")}
                    </button>
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCategory(c.id)}
                        className={cn(
                          "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all",
                          selectedCategory === c.id
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Services Grid */}
                {loadingServices ? (
                  <div className="py-12 text-center text-slate-500 space-y-3">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                    <p className="text-sm font-medium">Loading verified cooperative services...</p>
                  </div>
                ) : filteredServices.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
                    <Briefcase className="h-8 w-8 text-slate-400 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700">No matching services found</p>
                    <p className="text-xs text-slate-500">Try adjusting your search keyword or selected category.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[420px] overflow-y-auto pr-1">
                    {filteredServices.map((srv) => {
                      const isSelected = form.serviceId === srv.id;
                      return (
                        <div
                          key={srv.id}
                          onClick={() => {
                            setForm(prev => ({
                              ...prev,
                              serviceId: srv.id,
                              title: prev.title || srv.name
                            }));
                            setError("");
                          }}
                          className={cn(
                            "p-4 rounded-xl border text-left cursor-pointer transition-all duration-150 relative flex flex-col justify-between group",
                            isSelected
                              ? "bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 shadow-sm"
                              : "bg-white border-slate-200/90 hover:border-blue-300 hover:shadow-sm"
                          )}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded">
                                {srv.category?.name || "General"}
                              </span>
                              <div className="text-right">
                                <span className="text-base font-bold text-slate-900">
                                  ₹{Number(srv.basePrice).toFixed(2)}
                                </span>
                                <span className="block text-[10px] text-slate-500 font-normal">
                                  {t("booking.server_rate")}
                                </span>
                              </div>
                            </div>

                            <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                              {srv.name}
                            </h3>

                            {srv.description && (
                              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                                {srv.description}
                              </p>
                            )}
                          </div>

                          {/* Skill requirements tags if any */}
                          {srv.skills && srv.skills.length > 0 && (
                            <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1">
                              {srv.skills.slice(0, 2).map((sk: any) => (
                                <span key={sk.id} className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                  {sk.name}
                                </span>
                              ))}
                              {srv.skills.length > 2 && (
                                <span className="text-[10px] text-slate-400 self-center">
                                  +{srv.skills.length - 2} more
                                </span>
                              )}
                            </div>
                          )}

                          {/* Checkmark overlay if selected */}
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow">
                              <Check className="h-3 w-3 stroke-[3]" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Selected Service Feedback Banner */}
                {selectedService && (
                  <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3 text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-blue-700 shrink-0" />
                      <div>
                        <span className="font-bold text-blue-900">{selectedService.name}</span>
                        <span className="text-slate-600 ml-1.5">
                          (₹{Number(selectedService.basePrice).toFixed(2)} official cooperative rate)
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                      {t("booking.service_selected")}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ============================================================ */}
          {/* STEP 2: REQUIREMENT DESCRIPTION */}
          {/* ============================================================ */}
          {currentStep === 2 && (
            <Card className="border-slate-200/90 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-slate-900">
                  {t("booking.step2_title")}
                </CardTitle>
                <CardDescription className="text-sm text-slate-500 mt-0.5">
                  {t("booking.step2_subtitle")}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                
                {/* Context badge showing chosen service */}
                {selectedService && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-blue-600" />
                      <span className="font-semibold text-slate-800">
                        {t("booking.summary_service")}: {selectedService.name}
                      </span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setCurrentStep(1)} 
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      Change Service
                    </button>
                  </div>
                )}

                {/* Task Title */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs sm:text-sm font-semibold text-slate-900">
                      {t("booking.task_title_label")} <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {form.title.length}/100
                    </span>
                  </div>
                  <Input
                    type="text"
                    required
                    minLength={5}
                    maxLength={100}
                    value={form.title}
                    onChange={(e) => {
                      setForm({ ...form, title: e.target.value });
                      if (error) setError("");
                    }}
                    placeholder={t("booking.task_title_placeholder")}
                    className="h-10 text-sm"
                  />
                  <p className="text-[11px] text-slate-500">
                    {t("booking.task_title_hint")}
                  </p>
                </div>

                {/* Detailed Requirements */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs sm:text-sm font-semibold text-slate-900">
                      {t("booking.task_desc_label")} <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {form.description.length}/2000
                    </span>
                  </div>
                  <textarea
                    required
                    minLength={10}
                    maxLength={2000}
                    rows={5}
                    value={form.description}
                    onChange={(e) => {
                      setForm({ ...form, description: e.target.value });
                      if (error) setError("");
                    }}
                    placeholder={t("booking.task_desc_placeholder")}
                    className="w-full text-sm p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed resize-y"
                  />
                  <p className="text-[11px] text-slate-500">
                    {t("booking.task_desc_hint")}
                  </p>
                </div>

                {/* Helpful tips card */}
                <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 space-y-1.5">
                  <div className="font-semibold flex items-center gap-1.5 text-amber-950">
                    <Info className="h-4 w-4 text-amber-700 shrink-0" />
                    <span>Tips for faster worker matching:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-900/90 pl-1">
                    <li>Mention if you have spare parts or if the worker should supply them.</li>
                    <li>Specify exact floor, apartment number, or access directions in step 3.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ============================================================ */}
          {/* STEP 3: LOCATION SELECTION */}
          {/* ============================================================ */}
          {currentStep === 3 && (
            <Card className="border-slate-200/90 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-slate-900">
                  {t("booking.step3_title")}
                </CardTitle>
                <CardDescription className="text-sm text-slate-500 mt-0.5">
                  {t("booking.step3_subtitle")}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                
                {/* Embedded LocationPicker */}
                <div className="space-y-2">
                  <LocationPicker
                    initialLocation={
                      form.locationLat && form.locationLng
                        ? {
                            address: form.address,
                            landmark: form.landmark,
                            city: form.city,
                            state: form.state,
                            locationLat: form.locationLat,
                            locationLng: form.locationLng,
                          }
                        : null
                    }
                    onLocationSelect={(loc) => {
                      setForm(prev => ({
                        ...prev,
                        address: loc.address || prev.address,
                        landmark: loc.landmark || prev.landmark,
                        city: loc.city || prev.city,
                        state: loc.state || prev.state,
                        locationLat: loc.locationLat,
                        locationLng: loc.locationLng,
                      }));
                      setLocationSelected(
                        Number.isFinite(loc.locationLat) && 
                        Number.isFinite(loc.locationLng) && 
                        loc.locationLat !== 0 && 
                        loc.locationLng !== 0
                      );
                      setError("");
                    }}
                  />
                  <p className="text-[11px] text-slate-500 italic">
                    {t("booking.location_instruction")}
                  </p>
                </div>

                {/* Address & Landmark Inputs (Optional manual refinement) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Street / Flat / House Address
                    </label>
                    <Input
                      type="text"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="e.g. Flat 402, Sunshine Apartments"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      {t("booking.landmark_label")} (Optional)
                    </label>
                    <Input
                      type="text"
                      value={form.landmark}
                      onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                      placeholder="e.g. Near City Hospital Gate 2"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                {/* Location Summary Box */}
                {locationSelected && (
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5 text-xs text-emerald-950">
                    <div className="flex items-center gap-2 font-bold text-emerald-900">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>{t("booking.location_selected_summary")}</span>
                    </div>
                    <p className="font-semibold text-slate-800 text-sm">
                      {form.address || "Pinpointed on map"}
                    </p>
                    {form.landmark && (
                      <p className="text-slate-600">
                        <span className="font-medium">{t("booking.landmark_label")}:</span> {form.landmark}
                      </p>
                    )}
                    <p className="text-slate-500">
                      {form.city ? `${form.city}, ` : ""}{form.state || ""} 
                      <span className="ml-2 font-mono text-[10px] text-slate-400">
                        [{Number(form.locationLat).toFixed(4)}, {Number(form.locationLng).toFixed(4)}]
                      </span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ============================================================ */}
          {/* STEP 4: SCHEDULE & EMERGENCY URGENCY */}
          {/* ============================================================ */}
          {currentStep === 4 && (
            <Card className="border-slate-200/90 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-slate-900">
                  {t("booking.step4_title")}
                </CardTitle>
                <CardDescription className="text-sm text-slate-500 mt-0.5">
                  {t("booking.step4_subtitle")}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">

                {/* Emergency / On-Demand Urgent Toggle Card */}
                <div className={cn(
                  "p-4 sm:p-5 rounded-xl border transition-all duration-200",
                  form.isEmergency 
                    ? "bg-rose-50/80 border-rose-300 ring-2 ring-rose-200" 
                    : "bg-slate-50/70 border-slate-200"
                )}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <div className={cn(
                        "p-2 rounded-lg shrink-0",
                        form.isEmergency ? "bg-rose-600 text-white" : "bg-slate-200 text-slate-600"
                      )}>
                        <Zap className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className={cn(
                          "font-bold text-sm sm:text-base",
                          form.isEmergency ? "text-rose-950" : "text-slate-900"
                        )}>
                          {t("booking.emergency_toggle_title")}
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                          {t("booking.emergency_toggle_desc")}
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={form.isEmergency}
                        onChange={(e) => {
                          setForm({ ...form, isEmergency: e.target.checked });
                          if (error) setError("");
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                    </label>
                  </div>

                  {form.isEmergency && (
                    <div className="mt-3 pt-3 border-t border-rose-200/80 flex items-center gap-2 text-xs font-semibold text-rose-800">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                      <span>{t("booking.emergency_active_badge")}: Task will be scheduled immediately upon booking.</span>
                    </div>
                  )}
                </div>

                {/* Standard Scheduling Options (disabled if emergency is on) */}
                {!form.isEmergency && (
                  <div className="space-y-4 animate-in fade-in">
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-900 mb-2">
                        {t("booking.quick_schedule")}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleSetQuickSchedule("today_2h")}
                          className="p-3 text-left border rounded-lg hover:border-blue-400 hover:bg-blue-50/40 text-xs font-medium text-slate-800 transition-colors flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-blue-600" />
                            {t("booking.sched_today_2h")}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetQuickSchedule("tomorrow_morning")}
                          className="p-3 text-left border rounded-lg hover:border-blue-400 hover:bg-blue-50/40 text-xs font-medium text-slate-800 transition-colors flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-blue-600" />
                            {t("booking.sched_tomorrow_morning")}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetQuickSchedule("tomorrow_afternoon")}
                          className="p-3 text-left border rounded-lg hover:border-blue-400 hover:bg-blue-50/40 text-xs font-medium text-slate-800 transition-colors flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-blue-600" />
                            {t("booking.sched_tomorrow_afternoon")}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetQuickSchedule("weekend")}
                          className="p-3 text-left border rounded-lg hover:border-blue-400 hover:bg-blue-50/40 text-xs font-medium text-slate-800 transition-colors flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-blue-600" />
                            {t("booking.sched_weekend")}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <label className="text-xs sm:text-sm font-semibold text-slate-900 block">
                        {t("booking.custom_datetime")} <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="datetime-local"
                        required={!form.isEmergency}
                        value={form.scheduledFor}
                        onChange={(e) => {
                          setForm({ ...form, scheduledFor: e.target.value });
                          if (error) setError("");
                        }}
                        className="h-10 text-sm max-w-sm"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ============================================================ */}
          {/* STEP 5: REVIEW & ESCROW TRANSPARENCY */}
          {/* ============================================================ */}
          {currentStep === 5 && (
            <Card className="border-slate-200/90 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-slate-900">
                  {t("booking.step5_title")}
                </CardTitle>
                <CardDescription className="text-sm text-slate-500 mt-0.5">
                  {t("booking.step5_subtitle")}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                
                {/* Pricing & Escrow Guarantee Highlight */}
                <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-emerald-50/80 to-teal-50/40 border border-emerald-200/90 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                        {t("booking.summary_price")}
                      </span>
                      <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">
                        ₹{selectedService ? Number(selectedService.basePrice).toFixed(2) : "0.00"}
                      </div>
                    </div>
                    <EscrowProtectedBadge variant="pill" />
                  </div>

                  <p className="text-xs sm:text-sm text-emerald-950 font-medium leading-relaxed">
                    {t("booking.summary_escrow_notice")}
                  </p>
                </div>

                {/* Summary Table / Key-Values */}
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden text-xs sm:text-sm">
                  
                  {/* Service */}
                  <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="font-semibold text-slate-500 sm:w-1/3">
                      {t("booking.summary_service")}
                    </span>
                    <div className="sm:w-2/3 font-bold text-slate-900 flex items-center justify-between">
                      <span>{selectedService?.name || "Service Selected"}</span>
                      <button 
                        type="button" 
                        onClick={() => setCurrentStep(1)} 
                        className="text-xs text-blue-600 hover:underline font-semibold"
                      >
                        Edit
                      </button>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="font-semibold text-slate-500 sm:w-1/3">
                      {t("booking.summary_category")}
                    </span>
                    <span className="sm:w-2/3 text-slate-800">
                      {selectedService?.category?.name || "General Service"}
                    </span>
                  </div>

                  {/* Title & Requirements */}
                  <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="font-semibold text-slate-500 sm:w-1/3">
                      {t("booking.summary_title_desc")}
                    </span>
                    <div className="sm:w-2/3 space-y-1">
                      <div className="font-bold text-slate-900">{form.title}</div>
                      <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                        {form.description}
                      </p>
                      <button 
                        type="button" 
                        onClick={() => setCurrentStep(2)} 
                        className="text-xs text-blue-600 hover:underline font-semibold inline-block pt-1"
                      >
                        Edit
                      </button>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="font-semibold text-slate-500 sm:w-1/3">
                      {t("booking.summary_location")}
                    </span>
                    <div className="sm:w-2/3 space-y-0.5">
                      <div className="font-medium text-slate-900">{form.address || "Confirmed on Map"}</div>
                      {form.landmark && <div className="text-xs text-slate-500">Landmark: {form.landmark}</div>}
                      <div className="text-xs text-slate-500">{form.city}, {form.state}</div>
                      <button 
                        type="button" 
                        onClick={() => setCurrentStep(3)} 
                        className="text-xs text-blue-600 hover:underline font-semibold inline-block pt-1"
                      >
                        Edit
                      </button>
                    </div>
                  </div>

                  {/* Timing */}
                  <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="font-semibold text-slate-500 sm:w-1/3">
                      {t("booking.summary_schedule")}
                    </span>
                    <div className="sm:w-2/3">
                      {form.isEmergency ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          <Zap className="h-3 w-3" /> Emergency / Immediate Dispatch
                        </span>
                      ) : (
                        <span className="font-medium text-slate-900">
                          {form.scheduledFor ? new Date(form.scheduledFor).toLocaleString() : "As requested"}
                        </span>
                      )}
                      <button 
                        type="button" 
                        onClick={() => setCurrentStep(4)} 
                        className="text-xs text-blue-600 hover:underline font-semibold block pt-1"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>

                {/* What Happens Next Section */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {t("booking.how_it_works_title")}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="font-bold text-slate-900">{t("booking.step_broadcast")}</div>
                      <p className="text-slate-600 leading-snug">{t("booking.step_broadcast_desc")}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold text-slate-900">{t("booking.step_accept")}</div>
                      <p className="text-slate-600 leading-snug">{t("booking.step_accept_desc")}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold text-slate-900">{t("booking.step_escrow")}</div>
                      <p className="text-slate-600 leading-snug">{t("booking.step_escrow_desc")}</p>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          )}

        </div>

        {/* Footer Navigation Bar (Sticky on Mobile) */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white/95 sticky bottom-0 py-3 z-20 backdrop-blur-sm">
          <div>
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevStep}
                disabled={loading}
                className="gap-1.5 text-xs sm:text-sm font-semibold"
              >
                <ChevronLeft className="h-4 w-4" />
                {t("booking.btn_back")}
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate(-1)}
                className="text-xs sm:text-sm text-slate-500 hover:text-slate-800"
              >
                {t("task.cancel")}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep < 5 ? (
              <Button
                type="button"
                onClick={handleNextStep}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs sm:text-sm font-semibold px-5"
              >
                <span>{t("booking.btn_next")}</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => handleSubmit()}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs sm:text-sm font-bold px-6 shadow-sm"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>{t("booking.submitting")}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>{t("booking.btn_confirm")}</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

      </div>
    </MapProvider>
  );
}
