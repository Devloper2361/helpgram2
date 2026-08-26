import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "./i18n";
import { 
  Home, 
  ListTodo, 
  Wallet, 
  MessageSquare, 
  User, 
  ShieldCheck, 
  Menu,
  LogOut,
  Bell,
  Search,
  BookOpen,
  HeartHandshake,
  SlidersHorizontal,
  Building2,
  Scale,
  PlusCircle,
  CheckCircle2,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "./context/AuthContext";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { CooperativeShield } from "./components/TrustIndicators";
import { cn } from "@/lib/utils";

function NotificationBell() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevUnreadCountRef = useRef(0);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000); // 5s poll for real-time feel
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        
        if (data.unreadCount > prevUnreadCountRef.current) {
           const newUnread = (data.notifications || []).filter((n: any) => !n.isRead);
           if (newUnread.length > 0) {
             const newest = newUnread[0];
             toast(newest.type, {
               description: newest.content,
             });
           }
        }
        setUnreadCount(data.unreadCount || 0);
        prevUnreadCountRef.current = data.unreadCount || 0;
      }
    } catch(e) {}
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "PUT" });
      fetchNotifications();
    } catch(e) {}
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`/api/notifications/read-all`, { method: "PUT" });
      fetchNotifications();
    } catch(e) {}
  };

  return (
    <Popover>
      <PopoverTrigger className="relative inline-flex items-center justify-center h-9 w-9 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer">
        <Bell className="h-5 w-5 text-slate-700" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0 shadow-lg border-slate-200" align="end">
        <div className="flex items-center justify-between p-3.5 border-b bg-slate-50/70">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm text-slate-900">{t("navigation.notifications")}</h4>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 text-[11px] font-bold rounded-full bg-red-100 text-red-700">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-auto p-1 text-xs text-blue-700 hover:text-blue-900 font-medium hover:bg-transparent" onClick={markAllAsRead}>
              {t("ui.mark_all_as")}
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">{t("navigation.noNotifications")}</div>
          ) : (
            notifications.map((n) => (
              <div 
                key={n.id} 
                className={cn(
                  "flex flex-col p-3.5 transition-colors cursor-pointer text-left hover:bg-slate-50",
                  !n.isRead && "bg-blue-50/40 border-l-2 border-l-blue-600"
                )}
                onClick={() => !n.isRead && markAsRead(n.id)}
              >
                <div className="flex justify-between items-start mb-1 gap-2">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{n.type}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">{new Date(n.createdAt).toLocaleDateString()}</span>
                </div>
                <p className={cn("text-xs leading-relaxed", !n.isRead ? "font-medium text-slate-900" : "text-slate-600")}>
                  {n.content}
                </p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { t, language, setLanguage } = useTranslation();
  return (
    <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 text-xs font-medium select-none shadow-2xs">
      <button 
        type="button"
        onClick={() => setLanguage('en')}
        className={cn(
          "px-2 py-1 rounded-md transition-all font-semibold",
          language === 'en' 
            ? "bg-white text-blue-900 shadow-xs" 
            : "text-slate-600 hover:text-slate-900"
        )}
      >
        {compact ? "EN" : t("ui.english")}
      </button>
      <button 
        type="button"
        onClick={() => setLanguage('hi')}
        className={cn(
          "px-2 py-1 rounded-md transition-all font-semibold",
          language === 'hi' 
            ? "bg-white text-blue-900 shadow-xs" 
            : "text-slate-600 hover:text-slate-900"
        )}
      >
        {compact ? "हि" : "हिन्दी"}
      </button>
    </div>
  );
}

function getRoleLabel(role?: string, t?: any): string {
  switch (role) {
    case "WORKER":
    case "TASKER":
      return t("navigation.role_worker") || "Cooperative Worker";
    case "CUSTOMER":
    case "USER":
      return t("navigation.role_customer") || "Customer";
    case "SOCIETY_ADMIN":
      return t("navigation.role_society_admin") || "Society Admin";
    case "FEDERATION_ADMIN":
      return t("navigation.role_federation_admin") || "Federation Admin";
    case "PLATFORM_ADMIN":
    case "ADMIN":
      return t("navigation.role_platform_admin") || "Platform Admin";
    default:
      return role || "Member";
  }
}

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Grouped Navigation Structure
  const coreServices = [
    { name: t("navigation.dashboard"), href: "/", icon: Home },
    { name: t("navigation.marketplace"), href: "/tasks", icon: Search },
    { name: t("navigation.catalog"), href: "/catalog", icon: BookOpen },
    { name: t("navigation.myTasks"), href: "/my-tasks", icon: ListTodo },
  ];

  const financialServices = [
    { name: t("navigation.wallet"), href: "/wallet", icon: Wallet },
  ];

  if (user?.role === "WORKER" || user?.role === "TASKER") {
    financialServices.push({ name: t("navigation.welfare"), href: "/welfare", icon: HeartHandshake });
  }

  const communication = [
    { name: t("navigation.messages"), href: "/chat", icon: MessageSquare },
  ];

  const governance: Array<{ name: string; href: string; icon: any }> = [
    { name: t("navigation.cooperatives"), href: "/cooperatives", icon: Building2 },
  ];

  if (user?.role === "SOCIETY_ADMIN" || user?.role === "ADMIN" || user?.role === "PLATFORM_ADMIN" || user?.role === "FEDERATION_ADMIN") {
    governance.push({ name: t("navigation.societyDash"), href: "/society/dashboard", icon: Building2 });
    governance.push({ name: t("navigation.welfareMgmt"), href: "/welfare/admin", icon: HeartHandshake });
  }

  if (user?.role === "FEDERATION_ADMIN" || user?.role === "ADMIN" || user?.role === "PLATFORM_ADMIN") {
    governance.push({ name: t("navigation.federationDash"), href: "/federation/dashboard", icon: ShieldCheck });
    governance.push({ name: t("navigation.catalogAdmin"), href: "/catalog-admin", icon: SlidersHorizontal });
  }

  if (user?.role === "ADMIN" || user?.role === "PLATFORM_ADMIN") {
    governance.push({ name: t("navigation.admin"), href: "/admin", icon: Scale });
  }

  // All navigation items combined for mobile menu
  const allNavItems = [
    ...coreServices,
    ...financialServices,
    ...communication,
    ...governance,
    { name: t("navigation.profile"), href: "/profile", icon: User },
  ];

  // Mobile Bottom Navigation Bar Items (5 Core Quick Access for Workers & Customers)
  const mobileBottomNav = [
    { name: t("navigation.home") || "Home", href: "/", icon: Home },
    { name: t("navigation.tasks") || "Tasks", href: "/my-tasks", icon: ListTodo },
    { name: t("navigation.wallet") || "Wallet", href: "/wallet", icon: Wallet },
    { name: t("navigation.messages") || "Chat", href: "/chat", icon: MessageSquare },
  ];

  const roleLabel = getRoleLabel(user?.role, t);

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50 md:flex-row font-sans text-slate-900">
      {/* Mobile Top Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-2">
          <CooperativeShield className="h-8 w-8" />
          <div>
            <span className="text-base font-bold tracking-tight text-blue-950">HelpGram</span>
            <span className="block text-[10px] text-emerald-800 font-medium leading-none">Cooperative Services</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <LanguageSwitcher compact />
          <NotificationBell />
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col flex-shrink-0 border-r border-slate-200 bg-white min-h-screen shadow-xs">
        {/* Brand Banner */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <div className="flex items-center gap-2.5">
            <CooperativeShield className="h-9 w-9" />
            <div>
              <div className="text-lg font-bold tracking-tight text-blue-950 leading-tight">HelpGram</div>
              <div className="text-[11px] font-medium text-emerald-700 leading-none">Cooperative Gig Platform</div>
            </div>
          </div>
        </div>

        {/* User Identity Box */}
        <div className="p-3 mx-3 mt-3 rounded-lg bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-blue-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : (user?.email || "U").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-slate-900 truncate">
                {user?.name || user?.email?.split("@")[0]}
              </div>
              <div className="text-[10px] font-medium text-emerald-700 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">{roleLabel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Categorized Nav Links */}
        <nav className="flex-1 space-y-5 px-3 py-4 text-xs font-medium overflow-y-auto">
          {/* Core Services */}
          <div>
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
              {t("navigation.coreServices") || "Core Services"}
            </div>
            <div className="space-y-0.5">
              {coreServices.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-950 font-bold border border-blue-200/80"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-blue-900" : "text-slate-500")} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Finance & Welfare */}
          <div>
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
              {t("navigation.finance") || "Financials & Safety"}
            </div>
            <div className="space-y-0.5">
              {financialServices.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-950 font-bold border border-blue-200/80"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-blue-900" : "text-slate-500")} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Messages */}
          <div>
            <div className="space-y-0.5">
              {communication.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-950 font-bold border border-blue-200/80"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-blue-900" : "text-slate-500")} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Governance & Management */}
          {governance.length > 0 && (
            <div>
              <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                {t("navigation.governance") || "Governance & Admin"}
              </div>
              <div className="space-y-0.5">
                {governance.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                        isActive
                          ? "bg-blue-50 text-blue-950 font-bold border border-blue-200/80"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      )}
                    >
                      <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-blue-900" : "text-slate-500")} />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Profile */}
          <div className="pt-2 border-t border-slate-100">
            <Link
              to="/profile"
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                location.pathname === "/profile"
                  ? "bg-blue-50 text-blue-950 font-bold border border-blue-200/80"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <User className="h-4 w-4 text-slate-500 shrink-0" />
              <span>{t("navigation.profile")}</span>
            </Link>
          </div>
        </nav>

        {/* Footer Logout */}
        <div className="p-3 border-t border-slate-200">
          <Button 
            variant="ghost" 
            size="sm"
            className="w-full justify-start text-xs font-semibold text-rose-700 hover:text-rose-900 hover:bg-rose-50" 
            onClick={logout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t("ui.logout")}
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Desktop Top Header Bar */}
        <header className="hidden md:flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-800">
              {t("navigation.tagline") || "Cooperative Gig Services Platform"}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <div className="h-5 w-px bg-slate-200" />
            <NotificationBell />
            <Link to="/tasks/new">
              <Button size="sm" className="bg-blue-900 hover:bg-blue-950 text-white font-semibold text-xs gap-1.5 shadow-xs">
                <PlusCircle className="h-3.5 w-3.5" />
                {t("task.create") || "Post Task"}
              </Button>
            </Link>
          </div>
        </header>

        {/* Page Content View with Mobile Safe-Bottom Padding */}
        <main className="flex-1 p-4 md:p-8 md:pt-6 overflow-y-auto w-full pb-24 md:pb-8">
          <div className="max-w-6xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Fixed 1-Thumb Usage) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-slate-200 bg-white/95 px-2 backdrop-blur-md md:hidden shadow-lg">
        {mobileBottomNav.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-1 text-center select-none transition-colors",
                isActive ? "text-blue-950 font-bold" : "text-slate-500 hover:text-slate-800"
              )}
            >
              <div className={cn("p-1 rounded-lg transition-all", isActive && "bg-blue-50")}>
                <item.icon className={cn("h-5 w-5", isActive ? "text-blue-900" : "text-slate-500")} />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">{item.name}</span>
            </Link>
          );
        })}

        {/* 5th Mobile Item: Menu Drawer */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center text-slate-500 hover:text-slate-800">
            <div className="p-1 rounded-lg">
              <Menu className="h-5 w-5 text-slate-500" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">{t("navigation.menu") || "Menu"}</span>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 flex flex-col p-0">
            <SheetHeader className="p-4 border-b border-slate-100 text-left bg-slate-50">
              <div className="flex items-center gap-2">
                <CooperativeShield className="h-8 w-8" />
                <div>
                  <SheetTitle className="text-base font-bold text-blue-950">HelpGram</SheetTitle>
                  <p className="text-[11px] text-emerald-800 font-medium leading-none">{roleLabel}</p>
                </div>
              </div>
            </SheetHeader>

            <div className="p-3 border-b border-slate-100">
              <div className="text-xs text-slate-600 mb-1.5 font-medium">{user?.email}</div>
              <LanguageSwitcher />
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {allNavItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-900 font-bold"
                        : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={cn("h-4 w-4", isActive ? "text-blue-900" : "text-slate-500")} />
                      <span>{item.name}</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <Button 
                variant="outline" 
                className="w-full justify-center text-xs font-semibold text-rose-700 border-rose-200 hover:bg-rose-50" 
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t("ui.logout")}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <Toaster position="top-right" richColors />
    </div>
  );
}

