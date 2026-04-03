"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Loader2,
  MapPin,
  Plus,
  Radar,
  Search,
  Shield,
  Trash2,
  Users,
  X,
  LogOut,
  Circle,
  Hexagon,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import type { GeoFenceMapFence } from "@/components/maps/GeoFenceMap";

const GeoFenceMap = dynamic(() => import("@/components/maps/GeoFenceMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[400px] bg-slate-50 dark:bg-[#0B0F19] rounded-xl border border-slate-200 dark:border-[#2A303C]">
      <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
    </div>
  ),
});

/* ─── Types ─── */
type Overview = {
  totalTourists: number;
  activeAlerts: number;
  recentEmergencies: number;
  safetyScore: number;
  avgResolutionMin: number;
  activities: { id: string; message: string; kind: string; detail: string | null }[];
};

type Tourist = {
  id: string;
  name: string;
  email: string;
  address: string | null;
  status: string;
  phone: string | null;
  nationality: string | null;
  gender: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
};

type EmergencyEvent = {
  id: string;
  createdAt: string;
  resolved: boolean;
  lat: number | null;
  lng: number | null;
  user: { name: string; email: string };
};

type AdminFIR = {
  id: string;
  firNumber: string;
  complainantName: string;
  complainantContact: string | null;
  incidentType: string;
  incidentDateTime: string;
  location: string;
  description: string;
  accusedDetails: string | null;
  evidenceUrls: string | null;
  evidenceNotes: string | null;
  severity: string;
  status: string;
  adminNotes: string | null;
  rejectionReason: string | null;
  createdAt: string;
  verifiedAt: string | null;
  user: { id: string; name: string; email: string; phone: string | null };
};

type Analytics = {
  totalTourists: number;
  totalAdmins: number;
  statusBreakdown: Record<string, number>;
  incidentBreakdown: Record<string, number>;
  firsTotal: number;
  firsResolved: number;
  firsPending: number;
  emergenciesTotal: number;
  emergenciesResolved: number;
  emergenciesPending: number;
  recentRegistrations: number;
  safetyScore: number;
};

type AdminThreat = {
  id: string;
  lat: number;
  lng: number;
  location: string;
  score: number;
  zone: string;
  summary: string;
  status: string;
  createdAt: string;
  newsSource: string | null;
  reportedBy: { name: string; email: string; phone: string | null } | null;
};

type AdminGeoFence = {
  id: string;
  name: string;
  type: string;
  centerLat: number | null;
  centerLng: number | null;
  radius: number | null;
  vertices: string | null;
  zone: string;
  active: boolean;
  description: string | null;
  createdAt: string;
};

type Tab = "overview" | "alerts" | "threats" | "firs" | "analytics" | "tourists" | "geofences" | "intelligence";

export default function AdminDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as Tab | null;
  const [tab, setTab] = useState<Tab>(
    tabParam && ["overview", "alerts", "threats", "firs", "analytics", "tourists", "geofences", "intelligence"].includes(tabParam)
      ? tabParam
      : "overview",
  );
  const [overview, setOverview] = useState<Overview | null>(null);
  const [tourists, setTourists] = useState<Tourist[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyEvent[]>([]);
  const [adminFirs, setAdminFirs] = useState<AdminFIR[]>([]);
  const [adminThreats, setAdminThreats] = useState<AdminThreat[]>([]);
  const [adminGeoFences, setAdminGeoFences] = useState<AdminGeoFence[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tabParam && ["overview", "alerts", "threats", "firs", "analytics", "tourists", "geofences", "intelligence"].includes(tabParam)) {
      setTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/overview").then((r) => r.json()),
      fetch("/api/tourists").then((r) => r.json()),
      fetch("/api/emergency").then((r) => r.json()),
    ])
      .then(([o, t, e]) => {
        if (!o.error) setOverview(o);
        setTourists(t.tourists ?? []);
        setEmergencies(e.emergencies ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  // Lazy load
  useEffect(() => {
    if (tab === "firs" && adminFirs.length === 0) {
      fetch("/api/admin/firs")
        .then((r) => r.json())
        .then((d) => setAdminFirs(d.firs ?? []));
    }
    if (tab === "threats" && adminThreats.length === 0) {
      fetch("/api/admin/threats")
        .then((r) => r.json())
        .then((d) => setAdminThreats(d.threats ?? []));
    }
    if (tab === "analytics" && !analytics) {
      fetch("/api/admin/analytics")
        .then((r) => r.json())
        .then((d) => { if (!d.error) setAnalytics(d); });
    }
    if (tab === "geofences" && adminGeoFences.length === 0) {
      fetch("/api/admin/geofences")
        .then((r) => r.json())
        .then((d) => setAdminGeoFences(d.fences ?? []));
    }
  }, [tab]);

  function changeTab(t: Tab) {
    setTab(t);
    const url = t === "overview" ? "/dashboard/admin" : `/dashboard/admin?tab=${t}`;
    window.history.replaceState(null, "", url);
  }

  const logout = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500  rounded-full" />
      </div>
    );
  }

  return (
    <div className="px-4 py-8 lg:px-8 max-w-7xl mx-auto relative">
      {/* Subtle Bluish Glow for Admin Space */}
      <div className="pointer-events-none fixed inset-0 -z-0 flex justify-center">
        <div className="h-[600px] w-full max-w-5xl bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/30 via-[#0B0F19]/0 to-transparent opacity-80" />
      </div>

      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            System Overview <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 ">Terminal</span>
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 uppercase tracking-widest font-medium">
            Authority Central Command Console
          </p>
        </div>
        
        {/* Top Right Controls */}
        <div className="flex items-start gap-4">
          <ThemeToggle className="mt-1" />
          
          {/* Admin Logout Block */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 dark:border-[#2A303C] bg-slate-50 dark:bg-[#0B0F19] p-4 min-w-[200px] shadow-lg">
            <div className="flex items-center gap-3">
               <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-[#131B2B] text-lg font-bold text-blue-400 ring-2 ring-slate-200 dark:ring-[#2A303C]">
                 A
               </div>
               <div className="min-w-0 flex-1">
                 <p className="truncate text-sm font-bold text-slate-900 dark:text-white tracking-wide">Administrator</p>
                 <p className="truncate text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">Control Panel</p>
               </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 transition-all hover:bg-slate-800 hover:text-slate-900 dark:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span>Secure Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200 border-zinc-800 mb-8 pb-1">
        {([
          ["overview", "Command Center", Shield],
          ["alerts", "Active Beacons", AlertTriangle],
          ["threats", "Threat Radar", MapPin],
          ["geofences", "Geo-Fences", Radar],
          ["firs", "Incident Reports", FileText],
          ["analytics", "Deep Analytics", BarChart3],
          ["tourists", "Registry Matrix", Users],
          ["intelligence", "Intelligence", Brain],
        ] as const).map(([k, label, Icon]) => (
          <button
            key={k}
            type="button"
            onClick={() => changeTab(k)}
            className={`inline-flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-widest transition-all relative group rounded-t-lg ${
              tab === k
                ? "text-cyan-700 dark:text-cyan-500 bg-white dark:bg-[#131B2B] shadow-sm border-t border-l border-r border-slate-300 dark:border-[#2A303C]"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#131B2B] border border-transparent"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {tab === k && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-cyan-400  " />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-in fade-in duration-500 pb-20">
        {tab === "overview" && <OverviewAdminTab overview={overview} tourists={tourists} emergencies={emergencies} />}
        {tab === "alerts" && <AlertsTab emergencies={emergencies} onResolve={(id) => {
          fetch(`/api/admin/emergency/${id}`, { method: "PATCH" })
            .then((r) => r.json())
            .then(() => {
              setEmergencies((prev) => prev.map((e) => (e.id === id ? { ...e, resolved: true } : e)));
            });
        }} />}
        {tab === "threats" && <ThreatsAdminTab threats={adminThreats} onStatusChange={(id, status) => {
          fetch("/api/admin/threats", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status }),
          })
            .then((r) => r.json())
            .then((d) => {
              if (d.success) setAdminThreats((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
            });
        }} onRemove={(id) => {
          fetch("/api/admin/threats", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          })
            .then((r) => r.json())
            .then((d) => {
              if (d.success) setAdminThreats((prev) => prev.filter((t) => t.id !== id));
            });
        }} />}
        {tab === "firs" && <FIRsAdminTab firs={adminFirs} onStatusChange={(firId, status, adminNotes, rejectionReason) => {
          fetch("/api/admin/firs", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ firId, status, adminNotes, rejectionReason }),
          })
            .then((r) => r.json())
            .then((d) => {
              if (d.fir) {
                setAdminFirs((prev) =>
                  prev.map((f) => (f.id === firId ? { ...f, status, adminNotes: adminNotes || f.adminNotes, rejectionReason: rejectionReason || f.rejectionReason } : f)),
                );
              }
            });
        }} />}
        {tab === "analytics" && <AnalyticsTab data={analytics} />}
        {tab === "tourists" && <TouristRegistryTab tourists={tourists} />}
        {tab === "geofences" && <GeoFencesAdminTab fences={adminGeoFences} onUpdate={() => {
          fetch("/api/admin/geofences")
            .then((r) => r.json())
            .then((d) => setAdminGeoFences(d.fences ?? []));
        }} />}
        {tab === "intelligence" && <IntelligenceTab />}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  OVERVIEW TAB                                            */
/* ──────────────────────────────────────────────────────── */
function OverviewAdminTab({
  overview,
  tourists,
  emergencies,
}: {
  overview: Overview | null;
  tourists: Tourist[];
  emergencies: EmergencyEvent[];
}) {
  const safe = tourists.filter((x) => x.status === "SAFE").length;
  const warn = tourists.filter((x) => x.status === "WARNING").length;
  const emerg = tourists.filter((x) => x.status === "EMERGENCY").length;
  const pendingEmergencies = emergencies.filter((e) => !e.resolved).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} title="Network Population" value={String(overview?.totalTourists ?? tourists.length)} color="blue" />
        <StatCard icon={AlertTriangle} title="Critical Beacons" value={String(pendingEmergencies)} color="red" />
        <StatCard icon={Shield} title="Global Safety Index" value={`${overview?.safetyScore ?? Math.round((safe / Math.max(tourists.length, 1)) * 100)}%`} color="emerald" />
        <StatCard icon={Clock} title="Mean Response Time" value={`< ${overview?.avgResolutionMin ?? 5} min`} color="amber" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status breakdown */}
        <div className="rounded-2xl border border-slate-200 border-zinc-800  bg-white dark:bg-[#131B2B] p-6  rounded-2xl border border-slate-200 dark:border-[#2A303C] relative overflow-hidden">
          <div className="absolute top-[-50%] left-[-20%] w-[150%] h-[150%] bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.05),transparent_70%)] pointer-events-none" />
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-widest text-cyan-500 mb-6 border-b border-slate-100 border-zinc-800/50 pb-3">
            <Activity className="h-4 w-4 " />
            LIVE FLEET STATUS
          </h3>
          <div className="space-y-5 relative z-10">
            <ProgressBar label="SECURE" value={safe} total={tourists.length} color="bg-emerald-400  " />
            <ProgressBar label="ELEVATED" value={warn} total={tourists.length} color="bg-amber-400  " />
            <ProgressBar label="CRITICAL" value={emerg} total={tourists.length} color="bg-red-500  " />
          </div>
          <div className="mt-6 flex flex-wrap gap-4 text-xs font-mono font-bold tracking-widest relative z-10">
            <span className="text-emerald-500">{safe} SEC</span>
            <span className="text-amber-500">{warn} WRN</span>
            <span className="text-red-500">{emerg} CRT</span>
            <span className="text-cyan-500">{tourists.length} TOT</span>
          </div>
        </div>

        {/* Activity feed */}
        <div className="rounded-2xl border border-slate-200 border-zinc-800  bg-white dark:bg-[#131B2B] p-6  rounded-2xl border border-slate-200 dark:border-[#2A303C]">
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-widest text-slate-900 dark:text-white mb-6 border-b border-slate-100 border-zinc-800/50 pb-3">
            <Activity className="h-4 w-4 text-indigo-400 " />
            EVENT STREAM
          </h3>
          <ul className="space-y-4 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
            {overview?.activities?.map((a) => (
              <li key={a.id} className="flex gap-4 p-3 rounded-lg border border-slate-100 border-zinc-800/50 bg-slate-950/40 hover:bg-slate-50 dark:bg-[#0B0F19] bg-slate-800/50 transition">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full  ${
                    a.kind === "success"
                      ? "bg-emerald-400 text-emerald-500"
                      : a.kind === "warning"
                        ? "bg-amber-400 text-amber-500"
                        : "bg-cyan-400 text-cyan-500"
                  }`}
                />
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{a.message}</p>
                  {a.detail && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 border-l border-slate-200 border-zinc-800 pl-2">{a.detail}</p>
                  )}
                </div>
              </li>
            ))}
            {(!overview?.activities || overview.activities.length === 0) && (
              <li className="text-sm font-mono text-slate-500 dark:text-slate-400 text-center py-8 border border-dashed border-slate-200 border-zinc-800 rounded-xl">NO EVENTS IN LAST CYCLE.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  ALERTS TAB                                              */
/* ──────────────────────────────────────────────────────── */
function AlertsTab({
  emergencies,
  onResolve,
}: {
  emergencies: EmergencyEvent[];
  onResolve: (id: string) => void;
}) {
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("all");
  const filtered = emergencies.filter((e) => {
    if (filter === "pending") return !e.resolved;
    if (filter === "resolved") return e.resolved;
    return true;
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-[#131B2B] p-3 rounded-xl border border-slate-200 border-zinc-800">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-widest ml-2">ACTIVE S.O.S. QUEUE</h2>
        <div className="flex gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-100 border-zinc-800/50">
          {(["all", "pending", "resolved"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-md px-4 py-1.5 text-[10px] uppercase tracking-widest font-bold transition ${
                filter === f
                  ? "bg-cyan-500/20 text-cyan-500  border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-300 hover:bg-slate-800"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={AlertTriangle} message="Signal Clear" hint={filter === "all" ? "No emergency broadcasts received." : `Zero ${filter} alerts detected.`} color="cyan" />
      ) : (
        <div className="space-y-4">
          {filtered.map((ev) => (
            <div
              key={ev.id}
              className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border  bg-white dark:bg-[#131B2B]/60 backdrop-blur p-5 transition ${
                ev.resolved ? "border-slate-200 border-zinc-800" : "border-red-500/50  relative overflow-hidden"
              }`}
            >
              {!ev.resolved && <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-[80px] pointer-events-none" />}
              
              <div className="flex items-center gap-4 relative z-10">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${ev.resolved ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" : "bg-red-500/20 text-red-500 border-red-500/50"}`}>
                  <AlertTriangle className={`h-6 w-6 ${ev.resolved ? "" : "animate-pulse"}`} />
                </div>
                <div>
                  <p className="text-base font-bold text-slate-900 dark:text-white tracking-wide">{ev.user.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    {ev.user.email} <span className="mx-2">|</span> {new Date(ev.createdAt).toLocaleString()}
                  </p>
                  {ev.lat != null && ev.lng != null && (
                    <p className="text-xs text-cyan-500 font-bold tracking-widest mt-1.5 flex items-center gap-2 border border-cyan-500/30 bg-cyan-500/10 rounded px-2 py-0.5 w-max ">
                      <MapPin className="h-3 w-3" /> [ {ev.lat.toFixed(5)}, {ev.lng.toFixed(5)} ]
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 relative z-10 w-full sm:w-auto mt-2 sm:mt-0 justify-end border-t border-slate-100 border-zinc-800/50 sm:border-0 pt-3 sm:pt-0">
                <span className={`rounded-md px-3 py-1 text-[10px] font-bold uppercase tracking-widest border ${ev.resolved ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" : "bg-red-500/20 text-red-500 border-red-500/50"}`}>
                  {ev.resolved ? "SECURED" : "CRITICAL"}
                </span>
                {!ev.resolved && (
                  <button
                    type="button"
                    onClick={() => onResolve(ev.id)}
                    className="group flex flex-col items-center justify-center rounded-xl bg-red-600 border border-red-400 px-6 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-red-500 hover: transition  "
                  >
                    DEPLOY RESOLUTION
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  INCIDENT REPORTS TAB                                    */
/* ──────────────────────────────────────────────────────── */
function FIRsAdminTab({
  firs,
  onStatusChange,
}: {
  firs: AdminFIR[];
  onStatusChange: (firId: string, status: string, adminNotes?: string, rejectionReason?: string) => void;
}) {
  const [filter, setFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNotesMap, setAdminNotesMap] = useState<Record<string, string>>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const filtered = firs.filter((f) => filter === "ALL" || f.status === filter);

  const SEVERITY_COLORS: Record<string, string> = {
    CRITICAL: "bg-red-500/10 text-red-500 border-red-500/30",
    HIGH: "bg-orange-500/10 text-orange-500 border-orange-500/30",
    MEDIUM: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    LOW: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  };

  function parseEvidence(urls: string | null): string[] {
    if (!urls) return [];
    try { return JSON.parse(urls); } catch { return []; }
  }

  function isImage(url: string) {
    return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-[#131B2B] p-3 rounded-xl border border-slate-200 dark:border-[#2A303C]">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-widest ml-2">INCIDENT REPORT DIRECTORY (VOL. {firs.length})</h2>
        <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-slate-950/80 p-1 rounded-lg border border-slate-200 dark:border-[#2A303C]">
          {["ALL", "PENDING", "APPROVED", "REJECTED", "INVESTIGATING", "RESOLVED", "CLOSED"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`rounded-md px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold transition ${
                filter === s
                  ? "bg-cyan-500/20 text-cyan-500 border border-cyan-500/30"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-white dark:bg-[#131B2B] overflow-hidden">
            <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-4">
              <h3 className="text-sm font-bold tracking-widest uppercase text-red-500 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Reject / Request More Info
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1 block">Reason for Rejection *</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why this report is being rejected or what additional info is needed..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 dark:border-[#2A303C] bg-slate-50 dark:bg-[#0B0F19] px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/50 resize-none"
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">The reporter will be notified with this reason.</p>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setRejectingId(null); setRejectReason(""); }}
                  className="flex-1 rounded-xl border border-slate-300 dark:border-[#2A303C] px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#0B0F19] transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onStatusChange(rejectingId, "REJECTED", adminNotesMap[rejectingId] || undefined, rejectReason);
                    setRejectingId(null);
                    setRejectReason("");
                  }}
                  disabled={!rejectReason.trim()}
                  className="flex-1 rounded-xl bg-red-500 border border-red-400 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-red-600 disabled:opacity-50 transition"
                >
                  Reject & Notify User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} message="Repository Empty" hint="Authorized incident reports will sync here." color="amber" />
      ) : (
        <div className="space-y-4">
          {filtered.map((fir) => {
            const evidenceList = parseEvidence(fir.evidenceUrls);
            const isExpanded = expandedId === fir.id;
            const isHighSeverity = fir.severity === "CRITICAL" || fir.severity === "HIGH";

            return (
              <div
                key={fir.id}
                className={`rounded-2xl border bg-white dark:bg-[#131B2B]/50 backdrop-blur p-6 transition shadow-lg group relative overflow-hidden ${
                  isHighSeverity && fir.status === "PENDING" ? "border-red-500/50" : "border-slate-200 dark:border-[#2A303C]"
                } hover:border-amber-500/30`}
              >
                {/* High severity banner */}
                {isHighSeverity && fir.status === "PENDING" && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-pulse" />
                )}
                <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-transparent via-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 relative z-10">
                  <div className="flex-1">
                    {/* Header badges */}
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <p className="font-mono text-sm font-bold text-amber-500">FILE #{fir.firNumber}</p>
                      <StatusBadge status={fir.status} />
                      <span className="rounded bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#2A303C]">
                        CLASS: {fir.incidentType.replace("_", " ")}
                      </span>
                      <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${SEVERITY_COLORS[fir.severity] || SEVERITY_COLORS.MEDIUM}`}>
                        {fir.severity}
                      </span>
                      {evidenceList.length > 0 && (
                        <span className="rounded bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold text-blue-500">
                          📎 {evidenceList.length} Evidence
                        </span>
                      )}
                    </div>

                    {/* Reporter info */}
                    <p className="text-lg font-bold text-slate-900 dark:text-white tracking-wide">{fir.complainantName}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-mono items-center">
                      <span>{fir.user.email}</span>
                      {fir.complainantContact && (
                        <><span className="text-slate-300 dark:text-slate-700">|</span><span>📞 {fir.complainantContact}</span></>
                      )}
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-cyan-500" /> {fir.location}</span>
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-cyan-500" /> {new Date(fir.incidentDateTime).toLocaleString()}</span>
                    </div>

                    {/* Description */}
                    <div className="mt-4 p-4 rounded-xl border border-slate-200 dark:border-[#2A303C] bg-slate-50 dark:bg-[#0B0F19]/60 shadow-inner">
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic border-l-2 border-amber-500/50 pl-3">"{fir.description}"</p>
                    </div>

                    {/* Evidence Preview (collapsed / expanded) */}
                    {evidenceList.length > 0 && (
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : fir.id)}
                          className="text-xs font-bold uppercase tracking-widest text-blue-500 hover:text-blue-400 flex items-center gap-1.5 transition"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {isExpanded ? "Hide Evidence" : `View ${evidenceList.length} Evidence File${evidenceList.length > 1 ? "s" : ""}`}
                        </button>
                        {isExpanded && (
                          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in slide-in-from-top-2 duration-300">
                            {evidenceList.map((url, i) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="block rounded-xl border border-slate-200 dark:border-[#2A303C] overflow-hidden hover:border-blue-500/50 transition group/ev"
                              >
                                {isImage(url) ? (
                                  <img src={url} alt={`Evidence ${i + 1}`} className="h-24 w-full object-cover" />
                                ) : (
                                  <div className="h-24 w-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800">
                                    <FileText className="h-6 w-6 text-slate-500 dark:text-slate-400" />
                                    <p className="mt-1 text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400">{url.split(".").pop()}</p>
                                  </div>
                                )}
                                <div className="px-2 py-1.5 text-[9px] font-mono text-slate-500 dark:text-slate-400 truncate group-hover/ev:text-blue-500 transition">
                                  File {i + 1}
                                </div>
                              </a>
                            ))}
                          </div>
                        )}
                        {fir.evidenceNotes && (
                          <div className="mt-2 p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs text-slate-600 dark:text-slate-300">
                            <span className="font-bold text-blue-500 mr-1">📝 Witness Notes:</span> {fir.evidenceNotes}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Previous admin notes / rejection reason */}
                    {fir.adminNotes && (
                      <div className="mt-3 p-2.5 rounded-lg bg-cyan-500/5 border border-cyan-500/20 text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-bold text-cyan-500 mr-1">Admin Notes:</span> {fir.adminNotes}
                      </div>
                    )}
                    {fir.rejectionReason && (
                      <div className="mt-2 p-2.5 rounded-lg bg-red-500/5 border border-red-500/20 text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-bold text-red-500 mr-1">Rejection Reason:</span> {fir.rejectionReason}
                      </div>
                    )}
                  </div>
                  
                  {/* Authority Control Panel */}
                  <div className="lg:min-w-72 bg-slate-50 dark:bg-[#0B0F19]/80 border border-slate-200 dark:border-[#2A303C] rounded-xl p-4 flex flex-col gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-[#2A303C] pb-2">Authority Control</span>
                    
                    {/* Admin Notes Input */}
                    <div>
                      <label className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 block font-bold uppercase tracking-wider">Admin Notes:</label>
                      <textarea
                        value={adminNotesMap[fir.id] || ""}
                        onChange={(e) => setAdminNotesMap(prev => ({ ...prev, [fir.id]: e.target.value }))}
                        placeholder="Add review comments..."
                        rows={2}
                        className="w-full rounded-lg border border-slate-300 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] px-3 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-cyan-400 resize-none"
                      />
                    </div>

                    {fir.status === "PENDING" ? (
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => onStatusChange(fir.id, "APPROVED", adminNotesMap[fir.id])}
                          className="w-full rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2.5 text-xs font-bold uppercase text-emerald-500 hover:bg-emerald-500 hover:text-white transition"
                        >
                          ✅ Approve Report
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectingId(fir.id)}
                          className="w-full rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2.5 text-xs font-bold uppercase text-red-400 hover:bg-red-500 hover:text-white transition"
                        >
                          ❌ Reject / Need More Info
                        </button>
                        <button
                          type="button"
                          onClick={() => onStatusChange(fir.id, "INVESTIGATING", adminNotesMap[fir.id])}
                          className="w-full rounded-lg bg-blue-500/10 border border-blue-500/30 px-3 py-2.5 text-xs font-bold uppercase text-blue-400 hover:bg-blue-500 hover:text-white transition"
                        >
                          🔍 Open Investigation
                        </button>
                        {isHighSeverity && (
                          <div className="mt-1 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 animate-pulse">⚠️ HIGH SEVERITY — Consider Escalation</p>
                            <p className="text-[9px] text-red-400 mt-1">This incident may require law enforcement involvement</p>
                          </div>
                        )}
                      </div>
                    ) : fir.status === "APPROVED" ? (
                      <div className="flex flex-col gap-2">
                        <div className="text-xs font-bold text-center bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 py-2 rounded-lg">✅ REPORT VERIFIED</div>
                        <button
                          type="button"
                          onClick={() => onStatusChange(fir.id, "INVESTIGATING", adminNotesMap[fir.id])}
                          className="w-full rounded-lg bg-blue-500/10 border border-blue-500/30 px-3 py-2 text-xs font-bold uppercase text-blue-400 hover:bg-blue-500 hover:text-white transition"
                        >
                          🔍 Open Investigation
                        </button>
                        <button
                          type="button"
                          onClick={() => onStatusChange(fir.id, "RESOLVED", adminNotesMap[fir.id])}
                          className="w-full rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-xs font-bold uppercase text-emerald-500 hover:bg-emerald-500 hover:text-white transition"
                        >
                          ✅ Mark Resolved
                        </button>
                      </div>
                    ) : fir.status === "REJECTED" ? (
                      <div className="flex flex-col gap-2">
                        <div className="text-xs font-bold text-center bg-red-500/10 text-red-400 border border-red-500/30 py-2 rounded-lg">❌ REJECTED — AWAITING RESUBMISSION</div>
                        <button
                          type="button"
                          onClick={() => onStatusChange(fir.id, "PENDING", adminNotesMap[fir.id])}
                          className="w-full rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs font-bold uppercase text-amber-400 hover:bg-amber-500 hover:text-white transition"
                        >
                          ↩️ Reopen for Review
                        </button>
                      </div>
                    ) : fir.status === "INVESTIGATING" ? (
                      <div className="flex flex-col gap-2">
                        <div className="text-xs font-bold text-center bg-blue-500/10 text-blue-400 border border-blue-500/30 py-2 rounded-lg">🔍 UNDER INVESTIGATION</div>
                        <button
                          type="button"
                          onClick={() => onStatusChange(fir.id, "RESOLVED", adminNotesMap[fir.id])}
                          className="w-full rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-xs font-bold uppercase text-emerald-500 hover:bg-emerald-500 hover:text-white transition"
                        >
                          ✅ Mark Resolved
                        </button>
                        <button
                          type="button"
                          onClick={() => onStatusChange(fir.id, "CLOSED", adminNotesMap[fir.id])}
                          className="w-full rounded-lg bg-slate-700/30 border border-slate-600 px-3 py-2 text-xs font-bold uppercase text-slate-400 hover:bg-slate-700 hover:text-white transition"
                        >
                          📁 Archive Case
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="text-xs font-bold text-center bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 py-2 rounded-lg">CASE {fir.status}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  ANALYTICS TAB                                           */
/* ──────────────────────────────────────────────────────── */
function AnalyticsTab({ data }: { data: Analytics | null }) {
  if (!data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500  rounded-full" />
      </div>
    );
  }

  const incidentTypes = Object.entries(data.incidentBreakdown);
  const maxIncident = Math.max(...incidentTypes.map(([, v]) => v), 1);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} title="Global Nodes" value={String(data.totalTourists)} color="blue" />
        <StatCard icon={Shield} title="Security Rating" value={`${data.safetyScore}%`} color="emerald" />
        <StatCard icon={FileText} title="Documented FIRs" value={String(data.firsTotal)} color="amber" />
        <StatCard icon={AlertTriangle} title="Historical S.O.S." value={String(data.emergenciesTotal)} color="red" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status distribution */}
        <div className="rounded-2xl border border-slate-200 border-zinc-800  bg-white dark:bg-[#131B2B] p-6  rounded-2xl border border-slate-200 dark:border-[#2A303C] relative overflow-hidden">
          <div className="absolute top-[-50%] right-[-20%] w-[100%] h-[150%] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.05),transparent_70%)] pointer-events-none" />
          <h3 className="text-sm font-bold tracking-widest uppercase text-slate-900 dark:text-white mb-6 border-b border-slate-100 border-zinc-800/50 pb-3 relative z-10">Entity State Telemetry</h3>
          <div className="space-y-5 relative z-10">
            {Object.entries(data.statusBreakdown).map(([status, count]) => (
              <ProgressBar
                key={status}
                label={status}
                value={count}
                total={data.totalTourists}
                color={
                  status === "SAFE"
                    ? "bg-emerald-400  "
                    : status === "WARNING"
                      ? "bg-amber-400  "
                      : "bg-red-500  "
                }
              />
            ))}
          </div>
        </div>

        {/* Incident type chart */}
        <div className="rounded-2xl border border-slate-200 border-zinc-800  bg-white dark:bg-[#131B2B] p-6  rounded-2xl border border-slate-200 dark:border-[#2A303C] relative">
          <div className="absolute bottom-[-50%] left-[-20%] w-[100%] h-[150%] bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.05),transparent_70%)] pointer-events-none" />
          <h3 className="text-sm font-bold tracking-widest uppercase text-slate-900 dark:text-white mb-6 border-b border-slate-100 border-zinc-800/50 pb-3 relative z-10">Crime Typology Distribution</h3>
          {incidentTypes.length === 0 ? (
            <p className="text-sm font-mono text-slate-500 dark:text-slate-400 relative z-10">NO DATA FOUND.</p>
          ) : (
            <div className="space-y-4 relative z-10">
              {incidentTypes.map(([type, count]) => (
                <div key={type} className="flex items-center gap-4">
                  <span className="w-28 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 shrink-0">{type}</span>
                  <div className="flex-1 h-3 rounded-full bg-slate-800 border border-slate-100 border-zinc-800/50 overflow-hidden shadow-inner">
                    <div
                      className="h-full rounded-full bg-violet-500  transition-all duration-1000 ease-out"
                      style={{ width: `${(count / maxIncident) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-bold text-violet-400 w-8 text-right ">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Resolution stats */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 border-zinc-800  bg-white dark:bg-[#131B2B] p-6  rounded-2xl border border-slate-200 dark:border-[#2A303C] flex items-center gap-8">
          <DonutChart resolved={data.firsResolved} pending={data.firsPending} color="#fbbf24" glowColor="rgba(251,191,36,0.8)" />
          <div className="flex-1">
            <h3 className="text-sm font-bold tracking-widest uppercase text-amber-500 border-b border-slate-100 border-zinc-800/50 pb-2 mb-3">FIR Triage Ratio</h3>
            <div className="space-y-2 text-sm font-mono">
              <p className="flex justify-between text-slate-900 dark:text-white"><span className="flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded  bg-emerald-500" />RESOLVED</span> <span className="font-bold">{data.firsResolved}</span></p>
              <p className="flex justify-between text-slate-500 dark:text-slate-400"><span className="flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded  bg-amber-400" />PENDING</span> <span className="font-bold text-slate-900 dark:text-white">{data.firsPending}</span></p>
            </div>
          </div>
        </div>
        
        <div className="rounded-2xl border border-slate-200 border-zinc-800  bg-white dark:bg-[#131B2B] p-6  rounded-2xl border border-slate-200 dark:border-[#2A303C] flex items-center gap-8">
          <DonutChart resolved={data.emergenciesResolved} pending={data.emergenciesPending} color="#ef4444" glowColor="rgba(239,68,68,0.8)" />
          <div className="flex-1">
            <h3 className="text-sm font-bold tracking-widest uppercase text-red-500 border-b border-slate-100 border-zinc-800/50 pb-2 mb-3 ">S.O.S. Triage Ratio</h3>
            <div className="space-y-2 text-sm font-mono">
              <p className="flex justify-between text-slate-900 dark:text-white"><span className="flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded  bg-emerald-500" />RESOLVED</span> <span className="font-bold">{data.emergenciesResolved}</span></p>
              <p className="flex justify-between text-slate-500 dark:text-slate-400"><span className="flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded  bg-red-500 animate-pulse" />PENDING</span> <span className="font-bold text-slate-900 dark:text-white">{data.emergenciesPending}</span></p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-5 text-center text-sm mb-4">
        <p className="font-mono text-cyan-500 uppercase tracking-widest text-xs">Node Influx (Past 168 Hours): <span className="font-bold text-slate-900 dark:text-white text-lg ml-2">{data.recentRegistrations} REGISTRATIONS</span></p>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  TOURIST REGISTRY TAB                                    */
/* ──────────────────────────────────────────────────────── */
function TouristRegistryTab({ tourists }: { tourists: Tourist[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = tourists.filter((t) => {
    const matchesSearch =
      search === "" ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selected = selectedId ? tourists.find((t) => t.id === selectedId) : null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-4 bg-white dark:bg-[#131B2B] p-4 rounded-xl border border-slate-200 border-zinc-800">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan-500/50" />
          <input
            type="text"
            placeholder="Query Registry By Alias or Network ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-cyan-900/50 bg-slate-950/80 py-3 pl-11 pr-4 text-sm font-mono text-cyan-100 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 placeholder:text-slate-600 transition"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-cyan-900/50 bg-slate-950/80 px-4 py-3 text-sm font-bold uppercase tracking-widest text-cyan-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 appearance-none"
        >
          <option value="ALL">ANY STATE</option>
          <option value="SAFE">SECURE</option>
          <option value="WARNING">WARNING</option>
          <option value="EMERGENCY">CRITICAL</option>
        </select>
      </div>

      <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">[{filtered.length}] ENTITIES MATCH QUERY</p>

      <div className="space-y-3">
        {filtered.map((t) => (
          <div
            key={t.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 border-zinc-800/50 bg-white dark:bg-[#131B2B] px-5 py-4 shadow-lg hover:border-cyan-500/30 hover:bg-slate-800/60 transition group cursor-pointer"
            onClick={() => setSelectedId(t.id)}
          >
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-slate-900 dark:text-white tracking-wide group-hover:text-cyan-100 transition">{t.name}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs font-mono text-slate-500 dark:text-slate-400">
                <span>{t.email}</span>
                {t.phone && (
                  <>
                    <span className="text-slate-700">|</span>
                    <span>{t.phone}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <StatusBadge status={t.status} />
              <div className="rounded-lg border border-slate-200 border-zinc-800 bg-slate-950 p-2 text-slate-500 dark:text-slate-400 group-hover:text-cyan-500 group-hover:border-cyan-500/50 transition">
                <Eye className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail modal wrapper matching neon aesthetic */}
      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-cyan-500/30 bg-white dark:bg-[#131B2B]  overflow-hidden scale-100 animate-in zoom-in-95">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-600" />
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 border-zinc-800 bg-slate-50 dark:bg-[#0B0F19] bg-slate-800/50">
              <h3 className="text-xs font-bold tracking-widest uppercase text-cyan-500 flex items-center gap-2">
                <Users className="h-4 w-4" /> Node Telemetry Profile
              </h3>
              <button onClick={() => setSelectedId(null)} className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-700 hover:text-slate-900 dark:text-white transition cursor-pointer z-10">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-sm max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-4 mb-6">
                 <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-2xl font-bold text-cyan-500  ">
                    {selected.name.charAt(0).toUpperCase()}
                 </div>
                 <div>
                   <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selected.name}</h2>
                   <div className="mt-2"><StatusBadge status={selected.status} /></div>
                 </div>
              </div>
            
              <div className="space-y-1">
                <InfoRow label="Network ID" value={selected.email} />
                <InfoRow label="Primary Comms" value={selected.phone} />
                <InfoRow label="Phenotype" value={selected.gender} />
                <InfoRow label="Jurisdiction" value={selected.nationality} />
                <InfoRow label="Base Coordinates" value={selected.address} />
              </div>
              
              <div className="mt-6 pt-4 border-t border-slate-100 border-zinc-800/50 space-y-1 bg-red-500/5 p-4 rounded-xl border-red-500/20">
                <h4 className="text-[10px] font-bold tracking-widest uppercase text-red-500 mb-3 flex items-center gap-1"><Shield className="h-3 w-3"/> Failsafe Protocol</h4>
                <InfoRow label="Alias" value={selected.emergencyContactName} />
                <InfoRow label="Frequency" value={selected.emergencyContactPhone} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  THREATS RADAR TAB                                       */
/* ──────────────────────────────────────────────────────── */
function ThreatsAdminTab({
  threats,
  onStatusChange,
  onRemove,
}: {
  threats: AdminThreat[];
  onStatusChange: (id: string, status: string) => void;
  onRemove: (id: string) => void;
}) {
  const [filter, setFilter] = useState("PENDING");
  const filtered = threats.filter((t) => filter === "ALL" || t.status === filter);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-[#131B2B] p-3 rounded-xl border border-slate-200 border-zinc-800">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-widest ml-2">THREAT RADAR QUEUE (VOL. {threats.length})</h2>
        <div className="flex flex-wrap gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-100 border-zinc-800/50">
          {["ALL", "PENDING", "VERIFIED", "REJECTED"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`rounded-md px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold transition ${
                filter === s
                  ? "bg-cyan-500/20 text-cyan-500  border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-300 hover:bg-slate-800"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={MapPin} message="Radar Clear" hint="No threat zones match current filter." color="amber" />
      ) : (
        <div className="space-y-4">
          {filtered.map((t) => (
            <div
              key={t.id}
              className={`rounded-2xl border bg-white dark:bg-[#131B2B]/50 backdrop-blur p-6 hover:border-amber-500/30 transition shadow-lg group relative overflow-hidden ${
                t.status === "PENDING" ? "border-amber-500/30" : "border-slate-100 border-zinc-800/50"
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 relative z-10">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap mb-3">
                    <p className="font-mono text-sm font-bold uppercase text-amber-500 ">AI RISK SCORE: {t.score}</p>
                    <StatusBadge status={t.status} />
                    <span className={`rounded bg-slate-800/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest border border-slate-200 border-zinc-800 ${t.zone === "RED" ? "text-red-500" : "text-amber-500"}`}>
                      ZONE: {t.zone}
                    </span>
                  </div>
                  {t.reportedBy ? (
                    <div>
                      <p className="text-lg font-bold text-slate-900 dark:text-white tracking-wide">{t.reportedBy.name}</p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-mono items-center">
                        <span>{t.reportedBy.email}</span>
                        {t.reportedBy.phone && (
                          <><span className="text-slate-700">|</span><span>{t.reportedBy.phone}</span></>
                        )}
                      </div>
                    </div>
                  ) : (
                   <p className="text-sm font-bold text-slate-500 tracking-wide">Anonymous Reporter</p> 
                  )}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 font-mono items-center">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-cyan-500" /> {t.location} [{t.lat.toFixed(5)}, {t.lng.toFixed(5)}]</span>
                    <span className="text-slate-700">|</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-cyan-500" /> Reported {new Date(t.createdAt).toLocaleString()}</span>
                  </div>
                  {/* News headline */}
                  {t.newsSource && (
                    <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                      <span className="text-amber-500 text-sm mt-0.5">📰</span>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-1">News Source</p>
                        <p className="text-xs text-slate-300 leading-relaxed">{t.newsSource}</p>
                      </div>
                    </div>
                  )}
                  <div className="mt-4 p-4 rounded-xl border border-slate-100 border-zinc-800/50 bg-slate-950/60 shadow-inner">
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic border-l-2 border-amber-500/50 pl-3">"{t.summary}"</p>
                  </div>
                </div>
                
                <div className="lg:min-w-64 bg-slate-950/80 border border-slate-200 border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-100 border-zinc-800/50 pb-2">Authority Control</span>
                  {t.status === "PENDING" ? (
                    <div className="flex flex-col gap-2 mt-2">
                      <button
                        onClick={() => onStatusChange(t.id, "VERIFIED")}
                        className="w-full rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-xs font-bold uppercase text-emerald-500 hover:bg-emerald-500 hover:text-white transition"
                      >
                        ✅ Verify Threat
                      </button>
                      <button
                        onClick={() => onStatusChange(t.id, "REJECTED")}
                        className="w-full rounded-lg bg-slate-800/50 border border-slate-700 px-3 py-2 text-xs font-bold uppercase text-slate-400 hover:bg-slate-800 hover:text-white transition"
                      >
                        ❌ Reject (False Alarm)
                      </button>
                    </div>
                  ) : t.status === "VERIFIED" ? (
                    <div className="flex flex-col gap-2 mt-2">
                      <div className="text-xs font-bold text-center bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 py-2 rounded-lg">
                        🟢 THREAT ACTIVE ON MAP
                      </div>
                      <button
                        onClick={() => {
                          if (confirm("Are you sure? This will REMOVE the threat from the user map immediately.")) {
                            onRemove(t.id);
                          }
                        }}
                        className="w-full rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs font-bold uppercase text-red-400 hover:bg-red-500 hover:text-white transition"
                      >
                        🗑️ Threat Over — Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 mt-2">
                      <div className="text-xs font-bold text-center bg-slate-800/80 text-slate-400 border border-slate-700 py-2 rounded-lg">
                        THREAT REJECTED
                      </div>
                      <button
                        onClick={() => {
                          if (confirm("Permanently delete this rejected threat from the database?")) {
                            onRemove(t.id);
                          }
                        }}
                        className="w-full rounded-lg bg-slate-700/30 border border-slate-700 px-3 py-2 text-xs font-bold uppercase text-slate-500 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition"
                      >
                        🗑️ Delete Record
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  GEO-FENCES ADMIN TAB                                    */
/* ──────────────────────────────────────────────────────── */
function GeoFencesAdminTab({
  fences,
  onUpdate,
}: {
  fences: AdminGeoFence[];
  onUpdate: () => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form state
  const [fenceType, setFenceType] = useState<"circle" | "polygon">("circle");
  const [fenceName, setFenceName] = useState("");
  const [fenceZone, setFenceZone] = useState("RED");
  const [fenceDesc, setFenceDesc] = useState("");
  const [centerLat, setCenterLat] = useState("");
  const [centerLng, setCenterLng] = useState("");
  const [radius, setRadius] = useState("500");
  const [polyVertices, setPolyVertices] = useState<{ lat: string; lng: string }[]>([
    { lat: "", lng: "" },
    { lat: "", lng: "" },
    { lat: "", lng: "" },
  ]);

  const activeFences = fences.filter((f) => f.active).length;
  const redFences = fences.filter((f) => f.zone === "RED").length;
  const orangeFences = fences.filter((f) => f.zone === "ORANGE").length;
  const yellowFences = fences.filter((f) => f.zone === "YELLOW").length;

  const resetForm = () => {
    setFenceName("");
    setFenceZone("RED");
    setFenceDesc("");
    setCenterLat("");
    setCenterLng("");
    setRadius("500");
    setPolyVertices([
      { lat: "", lng: "" },
      { lat: "", lng: "" },
      { lat: "", lng: "" },
    ]);
    setFenceType("circle");
  };

  const handleCreate = async () => {
    if (!fenceName.trim()) return;
    setCreating(true);

    const body: Record<string, unknown> = {
      name: fenceName.trim(),
      type: fenceType,
      zone: fenceZone,
      description: fenceDesc.trim() || null,
    };

    if (fenceType === "circle") {
      body.centerLat = parseFloat(centerLat);
      body.centerLng = parseFloat(centerLng);
      body.radius = parseFloat(radius);
    } else {
      const verts = polyVertices
        .filter((v) => v.lat && v.lng)
        .map((v) => ({ lat: parseFloat(v.lat), lng: parseFloat(v.lng) }));
      body.vertices = JSON.stringify(verts);
    }

    try {
      const res = await fetch("/api/admin/geofences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        resetForm();
        setShowCreate(false);
        onUpdate();
      }
    } finally {
      setCreating(false);
    }
  };

  const toggleFence = async (id: string, active: boolean) => {
    await fetch("/api/admin/geofences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: !active }),
    });
    onUpdate();
  };

  const deleteFence = async (id: string) => {
    if (!confirm("Permanently delete this geo-fence?")) return;
    await fetch("/api/admin/geofences", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    onUpdate();
  };

  const handleMapClick = (latLng: { lat: number; lng: number }) => {
    if (showCreate && fenceType === "circle") {
      setCenterLat(latLng.lat.toFixed(6));
      setCenterLng(latLng.lng.toFixed(6));
    }
  };

  // Convert fences to map-displayable format
  const mapFences: GeoFenceMapFence[] = fences.map((f) => ({
    id: f.id,
    type: f.type as "circle" | "polygon",
    centerLat: f.centerLat,
    centerLng: f.centerLng,
    radius: f.radius,
    vertices: f.vertices,
    zone: f.zone,
    name: f.name,
    active: f.active,
  }));

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Radar} title="Total Geo-Fences" value={String(fences.length)} color="blue" />
        <StatCard icon={Shield} title="Active Fences" value={String(activeFences)} color="emerald" />
        <StatCard icon={AlertTriangle} title="Red Zones" value={String(redFences)} color="red" />
        <StatCard icon={MapPin} title="Monitored Areas" value={String(orangeFences + yellowFences)} color="amber" />
      </div>

      {/* Map Preview */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] p-6 relative overflow-hidden">
        <div className="absolute top-[-50%] left-[-20%] w-[150%] h-[150%] bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.05),transparent_70%)] pointer-events-none" />
        <div className="flex items-center justify-between mb-4 relative z-10">
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-widest text-cyan-500">
            <Radar className="h-4 w-4" />
            GEO-FENCE MAP OVERVIEW
          </h3>
          {showCreate && fenceType === "circle" && (
            <span className="text-xs text-amber-400 font-mono animate-pulse">
              ← Click map to set fence center
            </span>
          )}
        </div>
        <div className="relative z-10">
          <GeoFenceMap fences={mapFences} height="380px" onMapClick={handleMapClick} />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-[#131B2B] p-3 rounded-xl border border-slate-200 dark:border-[#2A303C]">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-widest ml-2">
          GEO-FENCE DIRECTORY (VOL. {fences.length})
        </h2>
        <button
          type="button"
          onClick={() => { setShowCreate(!showCreate); if (showCreate) resetForm(); }}
          className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition border ${
            showCreate
              ? "bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-800"
              : "bg-cyan-500/10 text-cyan-500 border-cyan-500/30 hover:bg-cyan-500 hover:text-white"
          }`}
        >
          {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showCreate ? "Cancel" : "Create Geo-Fence"}
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="rounded-2xl border border-cyan-500/30 bg-white dark:bg-[#131B2B] p-6 relative overflow-hidden animate-in slide-in-from-top-2 duration-300">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-600" />
          <h3 className="text-sm font-bold tracking-widest uppercase text-cyan-500 mb-6 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            CREATE NEW GEO-FENCE
          </h3>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left column: basic info */}
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-1 block">Fence Name</label>
                <input
                  type="text"
                  value={fenceName}
                  onChange={(e) => setFenceName(e.target.value)}
                  placeholder="e.g. India Gate Restricted Area"
                  className="w-full rounded-xl border border-slate-300 dark:border-[#2A303C] bg-slate-50 dark:bg-[#0B0F19] px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-1 block">Type</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFenceType("circle")}
                      className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-widest border transition ${
                        fenceType === "circle"
                          ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/30"
                          : "bg-slate-50 dark:bg-[#0B0F19] text-slate-500 dark:text-slate-400 border-slate-300 dark:border-[#2A303C] hover:border-cyan-500/30"
                      }`}
                    >
                      <Circle className="h-3.5 w-3.5" />
                      Circle
                    </button>
                    <button
                      type="button"
                      onClick={() => setFenceType("polygon")}
                      className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-widest border transition ${
                        fenceType === "polygon"
                          ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/30"
                          : "bg-slate-50 dark:bg-[#0B0F19] text-slate-500 dark:text-slate-400 border-slate-300 dark:border-[#2A303C] hover:border-cyan-500/30"
                      }`}
                    >
                      <Hexagon className="h-3.5 w-3.5" />
                      Polygon
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-1 block">Zone</label>
                  <select
                    value={fenceZone}
                    onChange={(e) => setFenceZone(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-[#2A303C] bg-slate-50 dark:bg-[#0B0F19] px-3 py-2.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 appearance-none"
                  >
                    <option value="RED">🔴 RED — High Risk</option>
                    <option value="ORANGE">🟠 ORANGE — Elevated</option>
                    <option value="YELLOW">🟡 YELLOW — Caution</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-1 block">Description (Optional)</label>
                <textarea
                  value={fenceDesc}
                  onChange={(e) => setFenceDesc(e.target.value)}
                  placeholder="Describe the restriction or danger..."
                  rows={2}
                  className="w-full rounded-xl border border-slate-300 dark:border-[#2A303C] bg-slate-50 dark:bg-[#0B0F19] px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 font-mono resize-none"
                />
              </div>
            </div>

            {/* Right column: coordinates */}
            <div className="space-y-4">
              {fenceType === "circle" ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-1 block">Center Latitude</label>
                      <input
                        type="number"
                        step="any"
                        value={centerLat}
                        onChange={(e) => setCenterLat(e.target.value)}
                        placeholder="28.612870"
                        className="w-full rounded-xl border border-slate-300 dark:border-[#2A303C] bg-slate-50 dark:bg-[#0B0F19] px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-1 block">Center Longitude</label>
                      <input
                        type="number"
                        step="any"
                        value={centerLng}
                        onChange={(e) => setCenterLng(e.target.value)}
                        placeholder="77.229530"
                        className="w-full rounded-xl border border-slate-300 dark:border-[#2A303C] bg-slate-50 dark:bg-[#0B0F19] px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-1 block">Radius (meters)</label>
                    <input
                      type="number"
                      value={radius}
                      onChange={(e) => setRadius(e.target.value)}
                      placeholder="500"
                      min="1"
                      max="50000"
                      className="w-full rounded-xl border border-slate-300 dark:border-[#2A303C] bg-slate-50 dark:bg-[#0B0F19] px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 font-mono"
                    />
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3">
                    <p className="font-bold text-cyan-500 mb-1">💡 TIP</p>
                    <p>Click on the map above to auto-fill the center coordinates. Then adjust the radius.</p>
                  </div>
                </>
              ) : (
                <>
                  <label className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-1 block">
                    Polygon Vertices ({polyVertices.length} points)
                  </label>
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {polyVertices.map((v, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 w-5 shrink-0">{i + 1}</span>
                        <input
                          type="number"
                          step="any"
                          placeholder="Latitude"
                          value={v.lat}
                          onChange={(e) => {
                            const updated = [...polyVertices];
                            updated[i] = { ...v, lat: e.target.value };
                            setPolyVertices(updated);
                          }}
                          className="flex-1 rounded-lg border border-slate-300 dark:border-[#2A303C] bg-slate-50 dark:bg-[#0B0F19] px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-cyan-400 font-mono"
                        />
                        <input
                          type="number"
                          step="any"
                          placeholder="Longitude"
                          value={v.lng}
                          onChange={(e) => {
                            const updated = [...polyVertices];
                            updated[i] = { ...v, lng: e.target.value };
                            setPolyVertices(updated);
                          }}
                          className="flex-1 rounded-lg border border-slate-300 dark:border-[#2A303C] bg-slate-50 dark:bg-[#0B0F19] px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-cyan-400 font-mono"
                        />
                        {polyVertices.length > 3 && (
                          <button
                            type="button"
                            onClick={() => setPolyVertices(polyVertices.filter((_, j) => j !== i))}
                            className="text-red-400 hover:text-red-500 p-1"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPolyVertices([...polyVertices, { lat: "", lng: "" }])}
                    className="text-xs font-bold text-cyan-500 hover:text-cyan-400 transition flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Vertex
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 dark:border-[#2A303C] pt-4">
            <button
              type="button"
              onClick={() => { setShowCreate(false); resetForm(); }}
              className="rounded-xl border border-slate-300 dark:border-[#2A303C] px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#0B0F19] transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || !fenceName.trim()}
              className="rounded-xl bg-cyan-500 border border-cyan-400 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-cyan-400 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Deploy Geo-Fence
            </button>
          </div>
        </div>
      )}

      {/* Fence List */}
      {fences.length === 0 ? (
        <EmptyState icon={Radar} message="No Geo-Fences Deployed" hint="Create your first geo-fence to start monitoring restricted areas." color="cyan" />
      ) : (
        <div className="space-y-4">
          {fences.map((f) => (
            <div
              key={f.id}
              className={`rounded-2xl border bg-white dark:bg-[#131B2B]/50 backdrop-blur p-5 transition shadow-lg group relative overflow-hidden ${
                !f.active
                  ? "border-slate-300 dark:border-[#2A303C] opacity-60"
                  : f.zone === "RED"
                    ? "border-red-500/30"
                    : f.zone === "ORANGE"
                      ? "border-orange-500/30"
                      : "border-yellow-500/30"
              }`}
            >
              {f.active && (
                <div
                  className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] pointer-events-none ${
                    f.zone === "RED" ? "bg-red-500/10" : f.zone === "ORANGE" ? "bg-orange-500/10" : "bg-yellow-500/10"
                  }`}
                />
              )}

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl border shrink-0 ${
                      f.zone === "RED"
                        ? "bg-red-500/10 text-red-500 border-red-500/30"
                        : f.zone === "ORANGE"
                          ? "bg-orange-500/10 text-orange-500 border-orange-500/30"
                          : "bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
                    }`}
                  >
                    {f.type === "circle" ? <Circle className="h-5 w-5" /> : <Hexagon className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="text-base font-bold text-slate-900 dark:text-white tracking-wide truncate">{f.name}</p>
                      <StatusBadge status={f.active ? f.zone : "INACTIVE"} />
                      <span className="rounded bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#2A303C]">
                        {f.type === "circle" ? `⊙ ${f.radius}m` : `⬡ ${(() => { try { return JSON.parse(f.vertices || "[]").length; } catch { return 0; } })()} pts`}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {f.type === "circle" && f.centerLat && f.centerLng && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-cyan-500" />
                          [{f.centerLat.toFixed(5)}, {f.centerLng.toFixed(5)}]
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-cyan-500" />
                        {new Date(f.createdAt).toLocaleDateString()}
                      </span>
                      {f.description && (
                        <span className="text-slate-400 italic truncate max-w-xs">
                          {f.description}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleFence(f.id, f.active)}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest border transition ${
                      f.active
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500 hover:text-white"
                        : "bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-[#2A303C] hover:bg-cyan-500/10 hover:text-cyan-500 hover:border-cyan-500/30"
                    }`}
                  >
                    {f.active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                    {f.active ? "Active" : "Disabled"}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteFence(f.id)}
                    className="rounded-xl bg-red-500/10 border border-red-500/30 p-2 text-red-400 hover:bg-red-500 hover:text-white transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  SHARED COMPONENTS                                       */
/* ──────────────────────────────────────────────────────── */

function StatCard({
  icon: Icon,
  title,
  value,
  color,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
  color: string;
}) {
  const colorMap: Record<string, { bg: string, text: string, shadow: string, border: string }> = {
    blue: { bg: "bg-blue-500/10", text: "text-blue-500", shadow: "", border: "border-blue-500/30" },
    red: { bg: "bg-red-500/10", text: "text-red-500", shadow: "", border: "border-red-500/30" },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500", shadow: "", border: "border-emerald-500/30" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-500", shadow: "", border: "border-amber-500/30" },
  };
  const theme = colorMap[color] ?? colorMap.blue;

  return (
    <div className={`group rounded-2xl border bg-white dark:bg-[#131B2B]/60 backdrop-blur p-5 transition-all duration-300 hover:bg-slate-50 dark:hover:bg-[#131B2B]/80 hover:-translate-y-1 hover:shadow-lg shadow-sm border-slate-300 dark:border-[#2A303C] ${theme.border}`}>
      <div className={`inline-flex rounded-xl p-2.5 transition-all duration-300 ${theme.bg}`}>
        <Icon className={`h-5 w-5 ${theme.text} group-hover:drop-shadow-[0_0_8px_currentColor]`} />
      </div>
      <p className={`mt-4 text-3xl font-bold font-mono tracking-tight transition-all duration-300 ${theme.text} group-hover:drop-shadow-[0_0_12px_currentColor]`}>{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">{title}</p>
    </div>
  );
}

function ProgressBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-[11px] font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400 mb-2">
        <span>{label}</span>
        <span className="font-mono text-slate-900 dark:text-white">{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-zinc-800/50 shadow-inner overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-1000 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function DonutChart({ resolved, pending, color = "#10b981", glowColor = "rgba(16,185,129,0.8)" }: { resolved: number; pending: number; color?: string; glowColor?: string }) {
  const total = resolved + pending;
  const pct = total > 0 ? Math.round((resolved / total) * 100) : 0;
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg className="h-28 w-28 -rotate-90 " style={{ color: glowColor }} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="12" />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold font-mono text-slate-900 dark:text-white tracking-tight leading-none" style={{ textShadow: `0 0 10px ${glowColor}` }}>
          {pct}%
        </span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    SAFE: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 ",
    WARNING: "bg-amber-500/10 text-amber-500 border-amber-500/30 ",
    EMERGENCY: "bg-red-500/10 text-red-500 border-red-500/30 animate-pulse",
    PENDING: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    INVESTIGATING: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    RESOLVED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
    CLOSED: "bg-slate-800/80 text-slate-400 border-slate-700",
    ACTIVE: "bg-red-500/10 text-red-500 border-red-500/30 animate-pulse",
    VERIFIED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
    APPROVED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
    RED: "bg-red-500/10 text-red-500 border-red-500/30",
    ORANGE: "bg-orange-500/10 text-orange-500 border-orange-500/30",
    YELLOW: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
    REJECTED: "bg-red-500/10 text-red-400 border-red-500/30",
    INACTIVE: "bg-slate-800/80 text-slate-400 border-slate-700",
  };

  return (
    <span className={`rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${map[status] ?? "bg-slate-800 text-slate-400 border-slate-700"}`}>
      {status}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-1.5 border-b border-slate-100 border-zinc-800/50 last:border-0">
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-900 dark:text-slate-200 mt-0.5 sm:mt-0 max-w-[60%] truncate text-right">
        {value || <span className="text-slate-500 dark:text-slate-600 font-mono text-xs">N/A</span>}
      </span>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  message,
  hint,
  color="cyan"
}: {
  icon: React.ElementType;
  message: string;
  hint: string;
  color?: string;
}) {
  const colorClass = color === "red" ? "text-red-500 " :
                     color === "amber" ? "text-amber-500 " :
                     "text-cyan-500 ";
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 border-zinc-800 bg-white dark:bg-[#131B2B]/30 py-20 text-center">
      <div className="rounded-2xl border border-slate-100 border-zinc-800/50 bg-slate-50 dark:bg-[#0B0F19] bg-slate-800/50 p-5 mb-4 shadow-lg flex items-center justify-center">
        <Icon className={`h-8 w-8 ${colorClass}`} />
      </div>
      <p className="text-sm font-bold tracking-widest uppercase text-slate-900 dark:text-white">{message}</p>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-mono tracking-tight">{hint}</p>
    </div>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  INTELLIGENCE TAB — AI Risk Research Agent                */
/* ──────────────────────────────────────────────────────── */

type AgentIncidentOutput = {
  incident_id: string;
  title: string;
  category: string;
  risk_type: string;
  severity: string;
  risk_level: string;
  summary: string;
  location: {
    place: string;
    district: string;
    state: string;
    country: string;
    coordinates: { lat: number | null; lng: number | null };
  };
  published_at: string;
  source: {
    name: string;
    type: string;
    url: string;
    trust_score: number;
  };
  supporting_sources: { name: string; url: string; published_at: string }[];
  confidence_score: number;
  zone_recommendation: {
    recommended: boolean;
    zone_name: string;
    reason: string;
    suggested_risk_level: string;
    admin_action: string;
  };
};

type AgentZoneRec = {
  zone_name: string;
  location: string;
  district: string;
  state: string;
  primary_threat: string;
  supporting_incident_ids: string[];
  confidence_score: number;
  suggested_risk_level: string;
  reason: string;
  admin_action: string;
};

type AgentResult = {
  query_region: string;
  generated_at: string;
  status: string;
  summary: {
    total_sources_checked: number;
    total_trusted_sources_used: number;
    total_incidents_found: number;
    high_priority_incidents: number;
  };
  incidents: AgentIncidentOutput[];
  recommended_zones: AgentZoneRec[];
  notes: string[];
};

function IntelligenceTab() {
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState("");

  const runAgent = async () => {
    if (!city.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSaveMsg(null);
    setSelectedIds(new Set());
    setProgress("Searching trusted sources...");

    try {
      const res = await fetch("/api/admin/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: city.trim(), state: state.trim() }),
      });

      setProgress("Analyzing results...");

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Agent failed");

      setResult(data);
      setProgress("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setProgress("");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveSelected = async () => {
    if (!result || selectedIds.size === 0) return;
    setSaving(true);
    setSaveMsg(null);

    const incidents = result.incidents.filter((i) => selectedIds.has(i.incident_id));

    try {
      const res = await fetch("/api/admin/research/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidents }),
      });
      const data = await res.json();
      setSaveMsg(data.message || `${data.created} saved`);
    } catch {
      setSaveMsg("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const SEVERITY_COLORS: Record<string, string> = {
    critical: "bg-red-500/20 text-red-400 border-red-500/40",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/40",
    medium: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  };

  const RISK_COLORS: Record<string, string> = {
    CRITICAL: "bg-red-600/20 text-red-400 border-red-500/50",
    "HIGH RISK": "bg-red-500/20 text-red-400 border-red-500/40",
    WARNING: "bg-orange-500/20 text-orange-400 border-orange-500/40",
    CAUTION: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    SAFE: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  };

  const ACTION_COLORS: Record<string, string> = {
    urgent_review: "bg-red-600 text-white hover:bg-red-500",
    create_zone: "bg-orange-500 text-white hover:bg-orange-400",
    review: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30",
    monitor: "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700",
  };

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-5 border-b border-slate-100 dark:border-[#2A303C] pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/30">
              <Brain className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-widest uppercase text-slate-900 dark:text-white">AI Risk Intelligence Agent</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">Search · Scrape · Analyze · Recommend</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1 block">City *</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runAgent()}
                placeholder="Dehradun"
                className="w-full rounded-xl border border-slate-300 dark:border-[#2A303C] bg-slate-50 dark:bg-[#0B0F19] px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/50 transition"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1 block">State</label>
              <input
                value={state}
                onChange={(e) => setState(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runAgent()}
                placeholder="Uttarakhand"
                className="w-full rounded-xl border border-slate-300 dark:border-[#2A303C] bg-slate-50 dark:bg-[#0B0F19] px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/50 transition"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={runAgent}
                disabled={loading || !city.trim()}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-500 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:from-purple-500 hover:to-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-lg"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {loading ? "Running..." : "Run Agent"}
              </button>
            </div>
          </div>

          {loading && progress && (
            <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
              <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
              <p className="text-xs text-purple-400 font-mono">{progress}</p>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {result && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] p-4 text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{result.summary.total_sources_checked}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-1">Sources Checked</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] p-4 text-center">
            <p className="text-2xl font-bold text-cyan-500">{result.summary.total_trusted_sources_used}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-1">Trusted Sources</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] p-4 text-center">
            <p className="text-2xl font-bold text-amber-500">{result.summary.total_incidents_found}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-1">Incidents Found</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{result.summary.high_priority_incidents}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-1">High Priority</p>
          </div>
        </div>
      )}

      {/* Zone Recommendations */}
      {result && result.recommended_zones.length > 0 && (
        <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 dark:bg-purple-950/20 p-6">
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-widest uppercase text-purple-400 mb-4">
            <Radar className="h-4 w-4" />
            Zone Recommendations ({result.recommended_zones.length})
          </h3>
          <div className="space-y-3">
            {result.recommended_zones.map((zone, i) => (
              <div key={i} className="rounded-xl border border-slate-200 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{zone.zone_name}</p>
                    <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${RISK_COLORS[zone.suggested_risk_level] ?? RISK_COLORS.CAUTION}`}>
                      {zone.suggested_risk_level}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Confidence: {zone.confidence_score}%</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{zone.reason}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-1">
                    {zone.location && `${zone.location}, `}{zone.district}, {zone.state} · {zone.supporting_incident_ids.length} incident(s)
                  </p>
                </div>
                <div>
                  <span className={`inline-block rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-widest cursor-default ${ACTION_COLORS[zone.admin_action] ?? ACTION_COLORS.monitor}`}>
                    {zone.admin_action.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Incidents */}
      {result && result.incidents.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h3 className="text-sm font-bold tracking-widest uppercase text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Detected Incidents ({result.incidents.length})
            </h3>
            <div className="flex items-center gap-3">
              {selectedIds.size > 0 && (
                <button
                  onClick={saveSelected}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-cyan-400 disabled:opacity-50 transition"
                >
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  Save {selectedIds.size} to Threats
                </button>
              )}
              {saveMsg && (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> {saveMsg}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {result.incidents.map((inc) => (
              <div
                key={inc.incident_id}
                className={`rounded-xl border bg-white dark:bg-[#131B2B]/60 backdrop-blur p-5 transition hover:border-purple-500/30 ${
                  selectedIds.has(inc.incident_id)
                    ? "border-cyan-500/50 ring-1 ring-cyan-500/20"
                    : "border-slate-200 dark:border-[#2A303C]"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <div className="mt-1">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(inc.incident_id)}
                      onChange={() => toggleSelect(inc.incident_id)}
                      className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 accent-cyan-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{inc.title}</p>
                      <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${SEVERITY_COLORS[inc.severity] ?? SEVERITY_COLORS.medium}`}>
                        {inc.severity}
                      </span>
                      <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${RISK_COLORS[inc.risk_level] ?? RISK_COLORS.CAUTION}`}>
                        {inc.risk_level}
                      </span>
                      <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {inc.category.replace(/_/g, " ")}
                      </span>
                    </div>

                    {/* Summary */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-2">{inc.summary}</p>

                    {/* Meta */}
                    <div className="flex flex-wrap gap-3 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-cyan-500" /> {inc.location.place}{inc.location.district ? `, ${inc.location.district}` : ""}, {inc.location.state}</span>
                      {inc.published_at && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(inc.published_at).toLocaleDateString()}</span>}
                      <span>Trust: {inc.source.trust_score}/100</span>
                      <span>Confidence: {inc.confidence_score}/100</span>
                    </div>

                    {/* Source */}
                    <div className="mt-2 p-2 rounded-lg border border-slate-100 dark:border-[#2A303C] bg-slate-50 dark:bg-[#0B0F19]/50 flex items-center gap-2 text-[10px]">
                      <span className="font-bold text-slate-500 dark:text-slate-400">Source:</span>
                      <a href={inc.source.url} target="_blank" rel="noreferrer" className="text-cyan-500 hover:underline truncate">{inc.source.name}</a>
                      <span className="text-slate-400">({inc.source.type})</span>
                      {inc.supporting_sources.length > 1 && (
                        <span className="ml-auto font-bold text-purple-400">+{inc.supporting_sources.length - 1} more source{inc.supporting_sources.length > 2 ? "s" : ""}</span>
                      )}
                    </div>

                    {/* Confidence bar */}
                    <div className="mt-3 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          inc.confidence_score >= 70
                            ? "bg-red-500"
                            : inc.confidence_score >= 50
                              ? "bg-orange-500"
                              : inc.confidence_score >= 30
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                        }`}
                        style={{ width: `${inc.confidence_score}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent Notes */}
      {result && result.notes.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] p-4">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Agent Log</h4>
          <div className="space-y-1">
            {result.notes.map((note, i) => (
              <p key={i} className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-start gap-2">
                <span className="text-cyan-500 mt-px">›</span> {note}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Raw JSON toggle */}
      {result && (
        <div className="rounded-xl border border-slate-200 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowJson(!showJson)}
            className="w-full flex items-center justify-between px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#0B0F19] transition"
          >
            <span className="flex items-center gap-2"><Eye className="h-3 w-3" /> Raw JSON Output</span>
            <span>{showJson ? "▼" : "▶"}</span>
          </button>
          {showJson && (
            <div className="border-t border-slate-200 dark:border-[#2A303C] p-4 max-h-96 overflow-auto">
              <pre className="text-[10px] text-slate-500 dark:text-slate-400 font-mono whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && (
        <EmptyState
          icon={Brain}
          message="Intelligence Agent Ready"
          hint="Enter a city name and click Run Agent to scan trusted sources for safety incidents."
          color="cyan"
        />
      )}
    </div>
  );
}

