import { Outlet, Link, useLocation } from "react-router-dom";
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
  Search
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
        setNotifications(data.notifications);
        
        if (data.unreadCount > prevUnreadCountRef.current) {
           // We have new notifications! Let's pop a toast for the newest one
           const newUnread = data.notifications.filter((n: any) => !n.isRead);
           if (newUnread.length > 0) {
             const newest = newUnread[0];
             toast(newest.type, {
               description: newest.content,
             });
           }
        }
        setUnreadCount(data.unreadCount);
        prevUnreadCountRef.current = data.unreadCount;
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
      <PopoverTrigger render={<Button variant="ghost" size="icon" className="relative" />}>
        <Bell className="h-5 w-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-red-500" />
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold text-sm">{t("navigation.notifications")}</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-blue-600 hover:text-blue-800 hover:bg-transparent" onClick={markAllAsRead}>
              {t("ui.mark_all_as")}</Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">{t("navigation.noNotifications")}</div>
          ) : (
            notifications.map((n) => (
              <div 
                key={n.id} 
                className={`flex flex-col p-4 border-b last:border-0 hover:bg-slate-50 cursor-pointer ${!n.isRead ? "bg-blue-50/50" : ""}`}
                onClick={() => !n.isRead && markAsRead(n.id)}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-medium text-slate-500">{n.type}</span>
                  <span className="text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleDateString()}</span>
                </div>
                <p className={`text-sm ${!n.isRead ? "font-medium text-slate-900" : "text-slate-600"}`}>
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


function LanguageSwitcher() {
  const { t, language, setLanguage } = useTranslation();
  return (
    <div className="flex items-center gap-2 mr-4">
      <button 
        onClick={() => setLanguage('en')}
        className={`text-xs px-2 py-1 rounded ${language === 'en' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-500 hover:bg-slate-100'}`}
      >
        {t("ui.english")}</button>
      <span className="text-slate-300">|</span>
      <button 
        onClick={() => setLanguage('hi')}
        className={`text-xs px-2 py-1 rounded ${language === 'hi' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-500 hover:bg-slate-100'}`}
      >
        हिन्दी
      </button>
    </div>
  );
}

export default function MainLayout() {
  const location = useLocation();
  const { logout, user } = useAuth();
  const { t } = useTranslation();

  const navigation = [
    { name: t("navigation.dashboard"), href: "/", icon: Home },
    { name: t("navigation.myTasks"), href: "/my-tasks", icon: ListTodo },
    { name: t("navigation.catalog"), href: "/catalog", icon: ListTodo },
    { name: t("navigation.marketplace"), href: "/tasks", icon: Search },
    { name: t("navigation.wallet"), href: "/wallet", icon: Wallet },
    { name: t("navigation.messages"), href: "/chat", icon: MessageSquare },
    { name: t("navigation.profile"), href: "/profile", icon: User },
  ];
  
  navigation.push({ name: t("navigation.cooperatives"), href: "/cooperatives", icon: ShieldCheck });
  
  if (user?.role === "SOCIETY_ADMIN" || user?.role === "ADMIN" || user?.role === "PLATFORM_ADMIN" || user?.role === "FEDERATION_ADMIN") {
    navigation.push({ name: t("navigation.societyDash"), href: "/society/dashboard", icon: ShieldCheck });
  }
  

  if (user?.role === "FEDERATION_ADMIN" || user?.role === "ADMIN" || user?.role === "PLATFORM_ADMIN") {
    navigation.push({ name: t("navigation.federationDash"), href: "/federation/dashboard", icon: ShieldCheck });
  }

  if (user?.role === "WORKER") {
    navigation.push({ name: t("navigation.welfare"), href: "/welfare", icon: ShieldCheck });
  }
  if (user?.role === "SOCIETY_ADMIN" || user?.role === "FEDERATION_ADMIN" || user?.role === "ADMIN" || user?.role === "PLATFORM_ADMIN") {
    navigation.push({ name: t("navigation.welfareMgmt"), href: "/welfare/admin", icon: ShieldCheck });
  }


  if (user?.role === "ADMIN" || user?.role === "PLATFORM_ADMIN" || user?.role === "FEDERATION_ADMIN") {
    navigation.push({ name: t("navigation.catalogAdmin"), href: "/catalog-admin", icon: ShieldCheck });
  }
  if (user?.role === "ADMIN" || user?.role === "PLATFORM_ADMIN") {
    navigation.push({ name: t("navigation.admin"), href: "/admin", icon: ShieldCheck });
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50 md:flex-row">
      {/* Mobile Header Nav */}
      <header className="sticky top-0 z-30 flex h-16 items-center flex-shrink-0 border-b bg-white px-4 md:hidden justify-between">
        <div className="flex items-center">
          <Sheet>
            <SheetTrigger className="mr-4 inline-flex items-center justify-center rounded-md border border-slate-200 bg-white h-10 w-10 text-slate-800 hover:bg-slate-100">
              <Menu className="h-5 w-5" />
              <span className="sr-only">{t("ui.toggle_navigation_menu")}</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 flex flex-col">
              <SheetHeader>
                <SheetTitle className="text-left font-bold text-xl mb-4 text-blue-600">{t("navigation.helpgram")}</SheetTitle>
              </SheetHeader>
              <nav className="grid gap-2 text-lg font-medium flex-1">
                {navigation.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                      location.pathname === item.href
                        ? "bg-slate-100 text-blue-600"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto border-t pt-4">
                <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" onClick={logout}>
                  <LogOut className="h-5 w-5 mr-3" />
                  {t("ui.logout")}</Button>
              </div>
            </SheetContent>
          </Sheet>
          <div className="text-lg font-bold text-blue-600">{t("navigation.helpgram")}</div>
        </div>
        <LanguageSwitcher /><NotificationBell />
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden border-r bg-white md:flex w-64 flex-col flex-shrink-0">
        <div className="flex h-16 items-center justify-between border-b px-6">
          <span className="text-xl font-bold text-blue-600 tracking-tight">{t("navigation.helpgram")}</span>
          <NotificationBell />
        </div>
        <nav className="flex-1 space-y-1.5 px-4 py-6 text-sm font-medium">
          {navigation.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 transition-all ${
                location.pathname === item.href
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" onClick={logout}>
            <LogOut className="h-5 w-5 mr-3" />
            {t("ui.logout")}</Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 md:pt-6 overflow-y-auto w-full">
        <div className="max-w-6xl mx-auto w-full">
          <Outlet />
        </div>
      </main>
      <Toaster />
    </div>
  );
}
