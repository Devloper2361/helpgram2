import React, { useState, useEffect, useId } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "../i18n";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { 
  Search, 
  MapPin, 
  Calendar, 
  Clock, 
  DollarSign, 
  Sparkles, 
  AlertCircle, 
  ShieldAlert, 
  Filter, 
  X, 
  PlusCircle, 
  BookOpen, 
  ArrowRight, 
  Layers, 
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Lock
} from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { 
  EscrowProtectedBadge, 
  TrustScoreBadge, 
  VerifiedWorkerBadge, 
  SocietyMemberBadge, 
  CooperativeShield 
} from "../components/TrustIndicators";
import { StatCard } from "../components/StatCard";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { TaskCardSkeleton, StatCardSkeleton } from "../components/LoadingSkeleton";
import { cn } from "@/lib/utils";

interface TaskItem {
  id: string;
  serviceId?: string | null;
  title: string;
  description: string;
  price: number | string;
  status: string;
  scheduledFor: string;
  locationLat: number;
  locationLng: number;
  address?: string | null;
  landmark?: string | null;
  city?: string | null;
  state?: string | null;
  category?: string | null;
  isEmergency?: boolean | null;
  createdAt: string;
  requester?: {
    id: string;
    email: string;
    profile?: {
      fullName?: string | null;
      trustScore?: number | null;
    } | null;
  } | null;
}

const PRESET_CATEGORIES = [
  "Home Services",
  "Delivery",
  "Tech Support",
  "Handyman",
  "Cleaning",
  "Moving",
  "Other"
];

export default function MarketplacePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLocationRequiredError, setIsLocationRequiredError] = useState(false);
  const [total, setTotal] = useState(0);
  const [availableCategories, setAvailableCategories] = useState<string[]>(PRESET_CATEGORIES);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "OPEN";
  const category = searchParams.get("category") || "ALL";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";

  // Local state for search and price inputs for immediate typing feedback
  const [searchInput, setSearchInput] = useState(search);
  const [minPriceInput, setMinPriceInput] = useState(minPrice);
  const [maxPriceInput, setMaxPriceInput] = useState(maxPrice);

  // Sync inputs if URL params change externally
  useEffect(() => {
    setSearchInput(search);
    setMinPriceInput(minPrice);
    setMaxPriceInput(maxPrice);
  }, [search, minPrice, maxPrice]);

  // Optional: load dynamic categories from catalog API to enrich preset categories
  useEffect(() => {
    fetch("/api/categories")
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && Array.isArray(data.categories) && data.categories.length > 0) {
          const names = data.categories.map((c: any) => c.name).filter(Boolean);
          const merged = Array.from(new Set([...PRESET_CATEGORIES, ...names]));
          setAvailableCategories(merged);
        }
      })
      .catch(() => {
        // Fallback to PRESET_CATEGORIES safely
      });
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [page, search, status, category, minPrice, maxPrice]);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    setIsLocationRequiredError(false);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(search && { search }),
        ...(status !== "ALL" && { status }),
        ...(category !== "ALL" && { category }),
        ...(minPrice && { minPrice }),
        ...(maxPrice && { maxPrice })
      });

      const res = await fetch(`/api/tasks?${params.toString()}`);

      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
        setTotal(Number(data.total) || 0);
        setError(null);
      } else {
        const err = await res.json();
        if (err.error === "LOCATION_REQUIRED") {
          setIsLocationRequiredError(true);
          setError(err.message || t("marketplace.location_required_desc"));
        } else {
          setError(err.message || err.error || "Failed to fetch tasks.");
        }
      }
    } catch (e: any) {
      setError(e?.message || "Failed to communicate with task service.");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchParams(prev => {
      if (searchInput.trim()) {
        prev.set("search", searchInput.trim());
      } else {
        prev.delete("search");
      }

      if (minPriceInput.trim()) {
        prev.set("minPrice", minPriceInput.trim());
      } else {
        prev.delete("minPrice");
      }

      if (maxPriceInput.trim()) {
        prev.set("maxPrice", maxPriceInput.trim());
      } else {
        prev.delete("maxPrice");
      }

      prev.set("page", "1");
      return prev;
    });
    setShowMobileFilters(false);
  };

  const handleCategorySelect = (selectedCategory: string) => {
    setSearchParams(prev => {
      if (selectedCategory === "ALL") {
        prev.delete("category");
      } else {
        prev.set("category", selectedCategory);
      }
      prev.set("page", "1");
      return prev;
    });
  };

  const handleStatusSelect = (selectedStatus: string) => {
    setSearchParams(prev => {
      if (selectedStatus === "ALL") {
        prev.set("status", "ALL");
      } else {
        prev.set("status", selectedStatus);
      }
      prev.set("page", "1");
      return prev;
    });
  };

  const handleClearAllFilters = () => {
    setSearchInput("");
    setMinPriceInput("");
    setMaxPriceInput("");
    setSearchParams({
      page: "1",
      status: "OPEN"
    });
  };

  const hasActiveFilters = Boolean(
    search || 
    (status && status !== "OPEN") || 
    (category && category !== "ALL") || 
    minPrice || 
    maxPrice
  );

  const totalPages = Math.ceil(total / 10);
  const isWorker = user?.role === "WORKER" || user?.role === "TASKER";

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10" id="marketplace-page">
      {/* Marketplace Header & Hero Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CooperativeShield className="h-6 w-6" />
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
              HelpGram Network
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            {t("marketplace.title")}
          </h1>
          <p className="text-xs md:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            {t("marketplace.subtitle")}
          </p>
        </div>

        {/* Quick Top Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Link to="/catalog">
            <Button variant="outline" size="sm" className="text-xs font-semibold h-9 gap-1.5 border-slate-300">
              <BookOpen className="h-4 w-4 text-slate-600" />
              <span className="hidden sm:inline">{t("marketplace.browse_catalog")}</span>
              <span className="sm:hidden">{t("navigation.catalog")}</span>
            </Button>
          </Link>
          <Link to="/tasks/new">
            <Button size="sm" className="bg-blue-900 hover:bg-blue-950 text-white font-semibold text-xs h-9 gap-1.5 shadow-xs">
              <PlusCircle className="h-4 w-4" />
              <span>{t("marketplace.post_new_task")}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Role-Specific Cooperative Value Banner */}
      {isWorker ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-blue-950 flex items-start gap-3.5 shadow-2xs">
          <div className="p-2 rounded-lg bg-blue-100/90 text-blue-900 shrink-0 mt-0.5">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs md:text-sm font-bold text-blue-950">
              {t("marketplace.worker_banner_title")}
            </h4>
            <p className="text-xs text-blue-900/90 leading-relaxed">
              {t("marketplace.worker_banner_desc")}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-900 shrink-0 mt-0.5 sm:mt-0">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs md:text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                <span>{t("marketplace.customer_banner_title")}</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              </h4>
              <p className="text-xs text-emerald-900/90 leading-relaxed mt-0.5">
                {t("marketplace.customer_banner_desc")}
              </p>
            </div>
          </div>
          <Link to="/tasks/new" className="shrink-0 self-start sm:self-center">
            <Button variant="outline" size="sm" className="h-8 text-xs font-semibold bg-white border-emerald-300 text-emerald-900 hover:bg-emerald-100">
              {t("ui.post_a_task")}
            </Button>
          </Link>
        </div>
      )}

      {/* High-Level Marketplace Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <StatCard 
          title={t("marketplace.stat_total_tasks")}
          value={loading ? "..." : total}
          subtitle={t("marketplace.stat_total_desc")}
          icon={Layers}
          variant="primary"
        />
        <StatCard 
          title={t("marketplace.stat_escrow_guarantee")}
          value="100%"
          subtitle={t("marketplace.stat_escrow_desc")}
          icon={Lock}
          variant="emerald"
        />
        <StatCard 
          title={t("marketplace.stat_verified_network")}
          value="Govt-Reg"
          subtitle={t("marketplace.stat_verified_desc")}
          icon={Building2}
          variant="default"
        />
      </div>

      {/* Filter and Search Panel */}
      <Card className="rounded-xl border shadow-xs bg-white">
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Main Search Input & Price Controls */}
          <form onSubmit={handleApplyFilters} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-stretch">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="marketplace-search-input"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={t("marketplace.search_placeholder")}
                  className="pl-9 h-11 text-xs sm:text-sm bg-slate-50/60 border-slate-200 focus-visible:bg-white"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      setSearchParams(prev => { prev.delete("search"); prev.set("page", "1"); return prev; });
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                    aria-label="Clear search input"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Desktop Filters: Price & Buttons */}
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
                  <Input
                    type="number"
                    min="0"
                    placeholder={t("marketplace.min_price")}
                    value={minPriceInput}
                    onChange={(e) => setMinPriceInput(e.target.value)}
                    className="w-20 sm:w-24 h-9 text-xs border-0 bg-transparent shadow-none"
                  />
                  <span className="text-slate-300 text-xs">-</span>
                  <Input
                    type="number"
                    min="0"
                    placeholder={t("marketplace.max_price")}
                    value={maxPriceInput}
                    onChange={(e) => setMaxPriceInput(e.target.value)}
                    className="w-20 sm:w-24 h-9 text-xs border-0 bg-transparent shadow-none"
                  />
                </div>

                <Button 
                  type="submit" 
                  size="sm" 
                  className="h-11 px-4 text-xs font-semibold bg-blue-900 hover:bg-blue-950 text-white"
                >
                  {t("ui.search")}
                </Button>
              </div>

              {/* Mobile Filter Toggle Button */}
              <div className="flex sm:hidden items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className="flex-1 h-11 text-xs font-semibold gap-1.5 border-slate-200"
                >
                  <SlidersHorizontal className="h-4 w-4 text-slate-600" />
                  <span>{showMobileFilters ? "Hide Filters" : "Filter & Price"}</span>
                </Button>
                <Button 
                  type="submit" 
                  size="sm" 
                  className="h-11 px-5 text-xs font-semibold bg-blue-900 hover:bg-blue-950 text-white"
                >
                  {t("ui.search")}
                </Button>
              </div>
            </div>

            {/* Mobile Collapsible Price Filters */}
            {showMobileFilters && (
              <div className="sm:hidden p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <div className="text-xs font-semibold text-slate-700">Price Range (₹)</div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    min="0"
                    placeholder={t("marketplace.min_price")}
                    value={minPriceInput}
                    onChange={(e) => setMinPriceInput(e.target.value)}
                    className="h-10 text-xs bg-white"
                  />
                  <Input
                    type="number"
                    min="0"
                    placeholder={t("marketplace.max_price")}
                    value={maxPriceInput}
                    onChange={(e) => setMaxPriceInput(e.target.value)}
                    className="h-10 text-xs bg-white"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 h-9 text-xs"
                    onClick={() => {
                      setMinPriceInput("");
                      setMaxPriceInput("");
                    }}
                  >
                    Reset Prices
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="flex-1 h-9 text-xs bg-blue-900 text-white"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            )}
          </form>

          {/* Category Chips Bar for Instant 1-Touch Selection */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {t("marketplace.filter_category")}
              </span>
              {category !== "ALL" && (
                <button
                  onClick={() => handleCategorySelect("ALL")}
                  className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 underline"
                >
                  {t("marketplace.all_categories")}
                </button>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
              <button
                type="button"
                onClick={() => handleCategorySelect("ALL")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all select-none shrink-0 border",
                  category === "ALL"
                    ? "bg-blue-900 text-white border-blue-900 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                {t("marketplace.all_categories")}
              </button>

              {availableCategories.map((catName) => {
                const isSelected = category === catName;
                return (
                  <button
                    key={catName}
                    type="button"
                    onClick={() => handleCategorySelect(catName)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all select-none shrink-0 border",
                      isSelected
                        ? "bg-blue-900 text-white border-blue-900 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    {catName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Filter & Active Filter Indicators */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-slate-500">
                {t("marketplace.filter_status")}:
              </span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => handleStatusSelect("OPEN")}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-all font-semibold",
                    status === "OPEN" 
                      ? "bg-white text-blue-950 shadow-xs" 
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {t("marketplace.open_only")}
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusSelect("IN_PROGRESS")}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-all font-semibold",
                    status === "IN_PROGRESS" 
                      ? "bg-white text-blue-950 shadow-xs" 
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {t("marketplace.in_progress")}
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusSelect("ALL")}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-all font-semibold",
                    status === "ALL" 
                      ? "bg-white text-blue-950 shadow-xs" 
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {t("marketplace.all_statuses")}
                </button>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAllFilters}
                  className="h-8 px-2 text-xs font-semibold text-rose-700 hover:text-rose-900 hover:bg-rose-50 gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  {t("marketplace.clear_filters")}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Filter Tags Summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">{t("marketplace.active_filters")}</span>
          {search && (
            <Badge variant="secondary" className="gap-1 font-medium bg-slate-100 text-slate-800">
              <span>Keyword: "{search}"</span>
              <X 
                className="h-3 w-3 cursor-pointer hover:text-rose-600" 
                onClick={() => setSearchParams(prev => { prev.delete("search"); prev.set("page", "1"); return prev; })}
              />
            </Badge>
          )}
          {category && category !== "ALL" && (
            <Badge variant="secondary" className="gap-1 font-medium bg-blue-50 text-blue-800 border border-blue-200">
              <span>Category: {category}</span>
              <X 
                className="h-3 w-3 cursor-pointer hover:text-rose-600" 
                onClick={() => setSearchParams(prev => { prev.delete("category"); prev.set("page", "1"); return prev; })}
              />
            </Badge>
          )}
          {status && status !== "OPEN" && (
            <Badge variant="secondary" className="gap-1 font-medium bg-indigo-50 text-indigo-800">
              <span>Status: {status}</span>
              <X 
                className="h-3 w-3 cursor-pointer hover:text-rose-600" 
                onClick={() => setSearchParams(prev => { prev.set("status", "OPEN"); prev.set("page", "1"); return prev; })}
              />
            </Badge>
          )}
          {(minPrice || maxPrice) && (
            <Badge variant="secondary" className="gap-1 font-medium bg-emerald-50 text-emerald-800">
              <span>Price: ₹{minPrice || "0"} - ₹{maxPrice || "∞"}</span>
              <X 
                className="h-3 w-3 cursor-pointer hover:text-rose-600" 
                onClick={() => setSearchParams(prev => { prev.delete("minPrice"); prev.delete("maxPrice"); prev.set("page", "1"); return prev; })}
              />
            </Badge>
          )}
        </div>
      )}

      {/* Error State Handling */}
      {error && !loading && (
        isLocationRequiredError ? (
          <Card className="rounded-xl border-amber-300 bg-amber-50/70 text-amber-950">
            <CardContent className="p-6 space-y-3 text-center sm:text-left flex flex-col sm:flex-row items-center gap-4">
              <div className="p-3 rounded-full bg-amber-100 text-amber-800 shrink-0">
                <MapPin className="h-6 w-6" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="font-bold text-base text-amber-950">
                  {t("marketplace.location_required_title")}
                </h3>
                <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed">
                  {error}
                </p>
              </div>
              <Link to="/profile">
                <Button className="bg-amber-900 hover:bg-amber-950 text-white font-semibold text-xs shrink-0">
                  {t("marketplace.set_location_cta")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <ErrorState
            title="Failed to Load Tasks"
            message={error}
            onRetry={fetchTasks}
          />
        )
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <TaskCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && tasks.length === 0 && (
        <EmptyState
          icon={Layers}
          title={t("marketplace.no_tasks_title")}
          description={t("marketplace.no_tasks_desc")}
          actionLabel={hasActiveFilters ? t("marketplace.clear_filters") : t("marketplace.post_new_task")}
          onAction={hasActiveFilters ? handleClearAllFilters : () => navigate("/tasks/new")}
        />
      )}

      {/* Tasks Listing Grid */}
      {!loading && !error && tasks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
            <span>
              Showing {tasks.length} of {total} {t("marketplace.total_found")}
            </span>
            <span>
              {t("marketplace.showing_page")} {page} {t("marketplace.of")} {totalPages || 1}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tasks.map((task) => {
              const formattedPrice = typeof task.price === "number" 
                ? task.price.toFixed(2) 
                : Number(task.price || 0).toFixed(2);
                
              const requesterName = task.requester?.profile?.fullName || task.requester?.email?.split("@")[0] || "Customer";
              const requesterTrustScore = task.requester?.profile?.trustScore;

              return (
                <Card 
                  key={task.id} 
                  className={cn(
                    "flex flex-col rounded-xl border transition-all duration-150 bg-white hover:shadow-md hover:border-slate-300 overflow-hidden",
                    task.isEmergency && "border-rose-200 ring-1 ring-rose-200/60"
                  )}
                >
                  <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 bg-slate-50/40 space-y-2.5">
                    {/* Top Status & Price Row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <StatusBadge status={task.status} size="sm" />
                        
                        {task.isEmergency && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-600 text-white animate-pulse">
                            <AlertCircle className="h-3 w-3" />
                            {t("marketplace.emergency_tag")}
                          </span>
                        )}

                        {task.category && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                            {task.category}
                          </span>
                        )}

                        {task.serviceId ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-900 border border-blue-200/80">
                            {t("marketplace.structured_service_tag")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600">
                            {t("marketplace.community_task_tag")}
                          </span>
                        )}
                      </div>

                      {/* Authoritative Price Badge */}
                      <div className="text-right shrink-0">
                        <span className="text-lg sm:text-xl font-black text-emerald-800 tracking-tight">
                          ₹{formattedPrice}
                        </span>
                        <div className="text-[10px] text-emerald-700 font-semibold leading-none flex items-center justify-end gap-0.5">
                          <Lock className="h-2.5 w-2.5" />
                          <span>Escrow</span>
                        </div>
                      </div>
                    </div>

                    {/* Task Title */}
                    <CardTitle className="text-base sm:text-lg font-bold text-slate-900 line-clamp-1">
                      <Link to={`/tasks/${task.id}`} className="hover:text-blue-900 transition-colors">
                        {task.title}
                      </Link>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-5 flex-1 space-y-4">
                    {/* Description */}
                    <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {task.description}
                    </p>

                    {/* Meta Info Grid */}
                    <div className="grid grid-cols-1 gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                      {/* Location Context */}
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          {task.address ? (
                            <span className="font-medium text-slate-800 line-clamp-1">
                              {task.address}{task.city ? `, ${task.city}` : ""}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-mono text-[11px]">
                              Geo: {task.locationLat.toFixed(3)}, {task.locationLng.toFixed(3)}
                            </span>
                          )}
                          {task.landmark && (
                            <div className="text-[11px] text-slate-500 line-clamp-1">
                              Near {task.landmark}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Scheduled Date */}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-700">
                          {new Date(task.scheduledFor).toLocaleDateString(undefined, {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>

                      {/* Requester Profile & Trust Score */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                          <span className="font-medium text-slate-700">{t("marketplace.posted_by")}:</span>
                          <span className="text-slate-900 font-semibold truncate">{requesterName}</span>
                        </div>
                        {typeof requesterTrustScore === "number" && (
                          <TrustScoreBadge score={requesterTrustScore} size="sm" className="shrink-0" />
                        )}
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="p-4 sm:p-5 pt-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-semibold truncate">
                      <Lock className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                      <span className="truncate" title={
                        task.status === "OPEN" ? t("task_detail.escrow_open_hint") :
                        task.status === "COMPLETED" ? t("task_detail.escrow_released_hint") :
                        task.status === "CANCELLED" ? t("task_detail.escrow_refunded_hint") :
                        task.dispute ? t("task_detail.escrow_disputed_hint") :
                        t("task_detail.escrow_locked_hint")
                      }>
                        {task.status === "OPEN" ? t("task_detail.escrow_open_hint") :
                         task.status === "COMPLETED" ? t("task_detail.escrow_released_hint") :
                         task.status === "CANCELLED" ? t("task_detail.escrow_refunded_hint") :
                         task.dispute ? t("task_detail.escrow_disputed_hint") :
                         t("task_detail.escrow_locked_hint")}
                      </span>
                    </div>

                    <Link to={`/tasks/${task.id}`} className="shrink-0">
                      <Button 
                        size="sm" 
                        className={cn(
                          "h-8 text-xs font-semibold gap-1 shadow-2xs",
                          isWorker 
                            ? "bg-blue-900 hover:bg-blue-950 text-white"
                            : "bg-slate-900 hover:bg-slate-950 text-white"
                        )}
                      >
                        <span>{isWorker ? t("marketplace.view_details") : t("marketplace.view_task")}</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6 border-t border-slate-200">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => {
              setSearchParams(prev => {
                prev.set("page", String(page - 1));
                return prev;
              });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="h-9 px-3 text-xs font-semibold gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>{t("ui.previous_2")}</span>
          </Button>

          <div className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg">
            {t("marketplace.showing_page")} <span className="font-bold text-slate-950">{page}</span> {t("marketplace.of")} {totalPages}
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => {
              setSearchParams(prev => {
                prev.set("page", String(page + 1));
                return prev;
              });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="h-9 px-3 text-xs font-semibold gap-1"
          >
            <span>{t("ui.next")}</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
