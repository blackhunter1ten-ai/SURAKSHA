"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  FileText,
  Home,
  LogOut,
  MapPin,
  Menu,
  Route,
  Siren,
  User,
  Users,
  X,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: React.ElementType };

const USER_NAV: NavItem[] = [
  { href: "/dashboard/user", label: "Overview", icon: Home },
  { href: "/dashboard/user?tab=firs", label: "My FIRs", icon: FileText },
  { href: "/dashboard/user?tab=emergencies", label: "Emergency History", icon: Siren },
  { href: "/dashboard/user/safe-route", label: "Safe Route", icon: Route },
  { href: "/emergency", label: "Emergency SOS", icon: AlertTriangle },
  { href: "/geo", label: "Geo Tracking", icon: MapPin },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/dashboard/admin", label: "Overview", icon: Home },
  { href: "/dashboard/admin?tab=alerts", label: "Active Alerts", icon: AlertTriangle },
  { href: "/dashboard/admin?tab=firs", label: "FIR Reports", icon: FileText },
  { href: "/dashboard/admin?tab=analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/admin?tab=tourists", label: "Tourist Registry", icon: Users },
];

export function DashboardSidebar({
  role,
  userName,
  userEmail,
  userImage,
}: {
  role: "TOURIST" | "ADMIN";
  userName: string;
  userEmail: string;
  userImage?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: string;
    title: string;
    body: string;
    data: string | null;
    read: boolean;
    createdAt: string;
  }>>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const items = role === "ADMIN" ? ADMIN_NAV : USER_NAV;

  const activeBg = "bg-white dark:bg-[#131B2B]";
  const activeBorder = "border-slate-300 dark:border-[#2A303C]";
  const activeText = "text-emerald-600 dark:text-emerald-400 font-bold";

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const isActive = (href: string) => {
    const base = href.split("?")[0];
    if (base === pathname) {
      if (href.includes("?tab=")) {
        return typeof window !== "undefined" && window.location.search.includes(href.split("?")[1]);
      }
      return !href.includes("?tab=");
    }
    return false;
  };

  // Poll for notifications every 10 seconds
  useEffect(() => {
    let mounted = true;
    async function fetchNotifs() {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) {
          setUnreadCount(data.unreadCount ?? 0);
          setNotifications(data.notifications ?? []);
        }
      } catch {
        // silently fail
      }
    }
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  // Close notif panel on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0B0F19] border-r border-slate-200 dark:border-[#2A303C]">
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-6 border-b border-slate-200 dark:border-[#2A303C]">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-[16px] font-bold text-white shadow-sm`}>
            S
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-bold text-slate-900 dark:text-white tracking-widest leading-none">SURAKSHA</p>
            <p className={`text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider`}>
              {role === "ADMIN" ? "Admin Panel" : "User Workspace"}
            </p>
          </div>
        </div>
      </div>

      {/* Notification Bell */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-[#2A303C]" ref={notifRef}>
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen(!notifOpen)}
            className="flex items-center gap-3 w-full rounded-xl px-4 py-3 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-[#131B2B] hover:text-emerald-600 dark:hover:text-emerald-400 transition border border-transparent hover:border-slate-200 dark:hover:border-[#2A303C] hover:shadow-sm"
          >
            <div className="relative">
              <Bell className={`h-4 w-4 ${unreadCount > 0 ? 'text-red-500' : ''}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white animate-notification-bounce">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="ml-auto rounded-md bg-red-500/10 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-500">
                {unreadCount} new
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {notifOpen && (
            <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border border-slate-200 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-[#2A303C]">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider hover:text-emerald-400 transition"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell className="h-6 w-6 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 dark:text-slate-500">No notifications yet</p>
                  </div>
                ) : (
                  notifications.slice(0, 10).map((n) => {
                    let parsedData: Record<string, unknown> = {};
                    try { if (n.data) parsedData = JSON.parse(n.data); } catch { /* ignore */ }
                    const mapsLink = parsedData.mapsLink as string | undefined;
                    return (
                      <div
                        key={n.id}
                        className={`px-4 py-3 border-b border-slate-200 dark:border-[#2A303C] last:border-0 transition hover:bg-slate-50 dark:hover:bg-[#0B0F19] ${
                          !n.read ? 'bg-red-50/50 dark:bg-red-900/10' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${n.type === 'SOS_ALERT' ? 'bg-red-500/10 border border-red-500/20' : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-[#2A303C]'}`}>
                            {n.type === 'SOS_ALERT' ? (
                              <Siren className="h-4 w-4 text-red-500" />
                            ) : (
                              <Bell className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{n.title}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                {new Date(n.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                              {mapsLink && (
                                <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500 hover:text-red-400">
                                  <ExternalLink className="h-3 w-3" /> Map
                                </a>
                              )}
                              {!n.read && (
                                <span className="ml-auto h-2 w-2 rounded-full bg-red-500 animate-breathe" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-3 custom-scrollbar">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`group flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition duration-200 ${
                active
                  ? `${activeBg} ${activeText} border ${activeBorder} shadow-sm cursor-default`
                  : "text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-[#131B2B] hover:text-emerald-600 dark:hover:text-emerald-400 hover:shadow-sm hover:border-slate-200 dark:hover:border-[#2A303C] border border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform ${active ? `scale-110 ${activeText}` : "group-hover:scale-110 text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400"}`} />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom user card extracted to top-right of layout */}
    </div>
  );

  return (
    <>
      {/* Mobile topbar */}
      <div className="sticky top-0 z-50 flex items-center justify-between bg-slate-50 dark:bg-slate-50/90 dark:bg-[#0B0F19]/90 backdrop-blur-xl px-4 py-4 lg:hidden border-b border-slate-200 dark:border-[#2A303C] shadow-sm">
        <div className="flex items-center gap-3">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-xs font-bold text-white shadow-sm`}>
            S
          </span>
          <span className="text-xs font-bold text-slate-900 dark:text-white tracking-widest">SURAKSHA</span>
        </div>
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={`rounded-lg border border-slate-200 dark:border-[#2A303C] p-2 text-slate-400 hover:text-white hover:bg-white dark:bg-[#131B2B] transition`}
            >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 flex flex-col shadow-2xl animate-in slide-in-from-left duration-300">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col z-40">
        {sidebarContent}
      </aside>
    </>
  );
}
