"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import {
  AlertTriangle,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Edit3,
  FileText,
  Globe,
  Heart,
  Loader2,
  MapPin,
  Phone,
  Route,
  Save,
  Shield,
  Siren,
  User,
  X,
  LogOut,
} from "lucide-react";

/* ─── Types ─── */
type Profile = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  kycStatus: string;
  locationTrackingStatus: string;
  address: string | null;
  phone: string | null;
  alternativePhone: string | null;
  citizenship: string | null;
  aadhaarNumber: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  bio: string | null;
  profileImage: string | null;
  nationality: string | null;
  bloodGroup: string | null;
  createdAt: string;
};

type Stats = {
  safetyStatus: string;
  kycStatus: string;
  locationTrackingStatus: string;
  lastKnownAddress: string | null;
  totalFIRs: number;
  totalEmergencies: number;
  lastEmergency: { date: string; resolved: boolean } | null;
};

type FIR = {
  id: string;
  firNumber: string;
  complainantName: string;
  incidentType: string;
  incidentDateTime: string;
  location: string;
  description: string;
  status: string;
  createdAt: string;
  verifiedAt: string | null;
};

type Emergency = {
  id: string;
  lat: number | null;
  lng: number | null;
  resolved: boolean;
  createdAt: string;
};

type Tab = "overview" | "firs" | "emergencies" | "profile";

/* ─── Main Component ─── */
export default function UserDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as Tab | null;
  const [tab, setTab] = useState<Tab>(tabParam && ["overview", "firs", "emergencies", "profile"].includes(tabParam) ? tabParam : "overview");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [firs, setFirs] = useState<FIR[]>([]);
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tabParam && ["overview", "firs", "emergencies", "profile"].includes(tabParam)) {
      setTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    Promise.all([
      fetch("/api/user/profile").then((r) => r.json()),
      fetch("/api/user/stats").then((r) => r.json()),
    ])
      .then(([p, s]) => {
        if (p.user) setProfile(p.user);
        if (!s.error) setStats(s);
      })
      .finally(() => setLoading(false));
  }, []);

  // Lazy load tab data
  useEffect(() => {
    if (tab === "firs" && firs.length === 0) {
      fetch("/api/user/firs")
        .then((r) => r.json())
        .then((d) => setFirs(d.firs ?? []));
    }
    if (tab === "emergencies" && emergencies.length === 0) {
      fetch("/api/user/emergencies")
        .then((r) => r.json())
        .then((d) => setEmergencies(d.emergencies ?? []));
    }
  }, [tab]);

  function changeTab(t: Tab) {
    setTab(t);
    const url = t === "overview" ? "/dashboard/user" : `/dashboard/user?tab=${t}`;
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
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500  rounded-full" />
      </div>
    );
  }

  return (
    <div className="px-4 py-8 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 ">{profile?.name?.split(" ")[0] ?? "Tourist"}</span>
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 uppercase tracking-widest font-medium">
            Dashboard Overview
          </p>
        </div>
        
        {/* Top Right Controls */}
        <div className="flex items-start gap-4">
          <ThemeToggle className="mt-1" />
          
          {/* Profile Block */}
          <div 
            onClick={() => changeTab("profile")}
            className="flex flex-col gap-3 rounded-2xl border border-slate-200 dark:border-[#2A303C] bg-slate-50 dark:bg-[#0B0F19] p-4 min-w-[260px] cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors group shadow-lg"
          >
          <div className="flex items-center gap-3">
             {profile?.profileImage ? (
               <div className="relative">
                 <div className="absolute inset-0 bg-emerald-500 rounded-full blur-md opacity-20 group-hover:opacity-40 transition" />
                 <img src={profile.profileImage} alt={profile.name} className="relative h-12 w-12 rounded-full object-cover ring-2 ring-slate-200 dark:ring-[#2A303C] group-hover:ring-emerald-500/50 transition-colors" />
               </div>
             ) : (
               <div className="relative">
                 <div className="absolute inset-0 bg-emerald-500 rounded-full blur-md opacity-20 group-hover:opacity-40 transition" />
                 <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-[#131B2B] text-lg font-bold text-slate-900 dark:text-white ring-2 ring-slate-200 dark:ring-[#2A303C] group-hover:ring-emerald-500/50 transition-colors">
                   {profile?.name?.charAt(0).toUpperCase() || "U"}
                 </div>
               </div>
             )}
             <div className="min-w-0 flex-1">
               <p className="truncate text-sm font-bold text-slate-900 dark:text-white tracking-wide">{profile?.name || "User"}</p>
               <p className="truncate text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{profile?.email || ""}</p>
             </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] px-4 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 transition-all hover:bg-slate-800 hover:text-slate-900 dark:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-[#2A303C] mb-8 pb-1">
        {([
          ["overview", "Overview", Shield],
          ["firs", "My Reports", FileText],
          ["emergencies", "Emergency History", Siren],
        ] as const).map(([k, label, Icon]) => (
          <button
            key={k}
            type="button"
            onClick={() => changeTab(k)}
            className={`inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold transition relative group rounded-t-lg ${
              tab === k
                ? "text-emerald-700 dark:text-emerald-500 bg-white dark:bg-[#131B2B] border-t border-l border-r border-slate-300 dark:border-[#2A303C]"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#131B2B]"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {tab === k && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-emerald-400" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-in fade-in duration-500">
        {tab === "overview" && <OverviewTab profile={profile} stats={stats} />}
        {tab === "firs" && <FIRsTab firs={firs} />}
        {tab === "emergencies" && <EmergenciesTab emergencies={emergencies} />}
        {tab === "profile" && <ProfileTab profile={profile} onUpdate={setProfile} />}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  OVERVIEW TAB                                            */
/* ──────────────────────────────────────────────────────── */
function OverviewTab({ profile, stats }: { profile: Profile | null; stats: Stats | null }) {
  return (
    <div className="space-y-6">
      {/* Status cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Shield}
          title="Safety Status"
          value={stats?.safetyStatus ?? "—"}
          color={
            stats?.safetyStatus === "SAFE"
              ? "emerald"
              : stats?.safetyStatus === "WARNING"
                ? "amber"
                : "red"
          }
        />
        <StatCard icon={FileText} title="FIRs Filed" value={String(stats?.totalFIRs ?? 0)} color="cyan" />
        <StatCard icon={Siren} title="SOS Events" value={String(stats?.totalEmergencies ?? 0)} color="red" />
        <StatCard
          icon={CheckCircle2}
          title="Identity KYC"
          value={stats?.kycStatus ?? "Pending"}
          color={stats?.kycStatus === "Complete" ? "emerald" : "amber"}
        />
      </div>

      {/* Profile summary + Safety info */}
      <div className="grid gap-6 lg:grid-cols-2">
        {profile && (
          <div className="rounded-2xl border border-slate-200 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] p-6">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white tracking-wide">
              <User className="h-4 w-4 text-emerald-500 " />
              Profile Highlights
            </h3>
            <div className="mt-6 flex items-center gap-5">
              {profile.profileImage ? (
                <div className="relative group">
                  <div className="absolute inset-0 bg-emerald-500 rounded-full blur-md opacity-30 group-hover:opacity-60 transition" />
                  <img
                    src={profile.profileImage}
                    alt={profile.name}
                    className="relative h-16 w-16 rounded-full object-cover ring-2 ring-slate-200 dark:ring-[#2A303C]"
                  />
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-500 rounded-full blur-md opacity-30" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 text-xl font-bold text-white ring-2 ring-emerald-400/50  ">
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                </div>
              )}
              <div>
                <p className="font-bold text-slate-900 dark:text-white text-lg">{profile.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">{profile.email}</p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <InfoRow label="Phone" value={profile.phone} />
              <InfoRow label="Gender" value={profile.gender} />
              <InfoRow label="Nationality" value={profile.nationality} />
              <InfoRow label="Blood Group" value={profile.bloodGroup} neonValue />
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] p-6 relative overflow-hidden">
          <div className="absolute pointer-events-none -top-20 -right-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px]" />
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white tracking-wide">
            <MapPin className="h-4 w-4 text-cyan-500 " />
            Live Telemetry
          </h3>
          <div className="mt-6 space-y-4 relative z-10">
            <InfoRow label="Last Known Array" value={stats?.lastKnownAddress || "Awaiting GPS Fix"} />
            <InfoRow label="Telemetry Signal" value={stats?.locationTrackingStatus} />
            {stats?.lastEmergency && (
              <InfoRow
                label="Last SOS Beacon"
                value={`${new Date(stats.lastEmergency.date).toLocaleDateString()} — ${stats.lastEmergency.resolved ? "Secured" : "Active"}`}
              />
            )}
          </div>
          <div className="mt-8 relative z-10">
            <Link
              href="/geo"
              className="group inline-flex items-center gap-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 px-5 py-2.5 text-sm font-semibold text-cyan-500 hover:bg-cyan-500/20 hover:border-cyan-400 transition hover: "
            >
              <MapPin className="h-4 w-4" />
              Link Live Telemetry
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-8 mb-4">Quick Actions</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ActionCard
          href="/emergency"
          icon={Siren}
          title="Emergency SOS"
          description="Trigger panic grid"
          color="red"
        />
        <ActionCard
          href="/dashboard/user/fir"
          icon={FileText}
          title="Incident Report"
          description="Report safety incidents"
          color="amber"
        />
        <ActionCard
          href="/dashboard/user/safe-route"
          icon={Route}
          title="Safe Routing"
          description="Calculate secure path"
          color="violet"
        />
        <ActionCard
          href="/geo"
          icon={Globe}
          title="Geo Tracking"
          description="Global mapping"
          color="emerald"
        />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  FIRs TAB                                                */
/* ──────────────────────────────────────────────────────── */
function FIRsTab({ firs }: { firs: FIR[] }) {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-wide">Incident Report Archives</h2>
        <Link
          href="/dashboard/user/fir"
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-5 py-2.5 text-sm font-semibold text-amber-500 hover:bg-amber-500/20 hover:border-amber-400 transition hover: "
        >
          <FileText className="h-4 w-4" />
          File New Report
        </Link>
      </div>

      {firs.length === 0 ? (
        <EmptyState icon={FileText} message="No Case Files Found" hint="Your official First Information Reports will synchronize here." color="amber" />
      ) : (
        <div className="space-y-4">
          {firs.map((fir) => (
            <div
              key={fir.id}
              className="rounded-2xl border border-slate-200 dark:border-[#2A303C]  bg-white dark:bg-[#131B2B]/50 backdrop-blur p-5 hover:border-amber-500/30 transition group"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-mono text-sm font-bold text-amber-500 uppercase tracking-wider">{fir.firNumber}</p>
                    <StatusBadge status={fir.status} />
                  </div>
                  <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">{fir.incidentType.replace("_", " ")}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <MapPin className="h-3 w-3" />
                    <span>{fir.location}</span>
                    <span>·</span>
                    <Clock className="h-3 w-3" />
                    <span>{new Date(fir.incidentDateTime).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-right text-xs font-mono text-slate-500 dark:text-slate-400">
                  <p>Logged: {new Date(fir.createdAt).toLocaleDateString()}</p>
                  {fir.verifiedAt && (
                    <p className="text-emerald-500 mt-1 flex items-center justify-end gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Verified
                    </p>
                  )}
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed border-t border-slate-200 dark:border-[#2A303C] pt-3">{fir.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  EMERGENCIES TAB                                         */
/* ──────────────────────────────────────────────────────── */
function EmergenciesTab({ emergencies }: { emergencies: Emergency[] }) {
  return (
    <div>
      <h2 className="mb-6 text-xl font-bold text-slate-900 dark:text-white tracking-wide">SOS Beacon History</h2>

      {emergencies.length === 0 ? (
        <EmptyState
          icon={Siren}
          message="No active beacons found"
          hint="System records of your triggered emergency events will deploy here."
          color="red"
        />
      ) : (
        <div className="space-y-4">
          {emergencies.map((e) => (
            <div
              key={e.id}
              className={`flex items-center justify-between rounded-2xl border  bg-white dark:bg-[#131B2B]/60 backdrop-blur p-5 transition ${
                e.resolved ? "border-slate-200 dark:border-[#2A303C] hover:border-emerald-500/30" : "border-red-500/50  "
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl relative ${
                    e.resolved ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-red-500/20 text-red-500 border border-red-500/50 relative overflow-hidden"
                  }`}
                >
                  {!e.resolved && <div className="absolute inset-0 bg-red-500/30  opacity-75" />}
                  <Siren className={`h-6 w-6 relative z-10 ${e.resolved ? "text-emerald-500 " : "text-red-500 "}`} />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-900 dark:text-white tracking-wide">
                    SOS Deployment Signal
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">
                    {new Date(e.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "medium" })}
                  </p>
                  {e.lat != null && e.lng != null && (
                    <p className="text-xs text-cyan-500 font-mono mt-0.5 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {e.lat.toFixed(5)}, {e.lng.toFixed(5)}
                    </p>
                  )}
                </div>
              </div>
              <StatusBadge status={e.resolved ? "RESOLVED" : "ACTIVE"} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  PROFILE TAB                                             */
/* ──────────────────────────────────────────────────────── */
function ProfileTab({
  profile,
  onUpdate,
}: {
  profile: Profile | null;
  onUpdate: (p: Profile) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: profile?.name ?? "",
    phone: profile?.phone ?? "",
    alternativePhone: profile?.alternativePhone ?? "",
    address: profile?.address ?? "",
    gender: profile?.gender ?? "",
    dateOfBirth: profile?.dateOfBirth ? profile.dateOfBirth.split("T")[0] : "",
    nationality: profile?.nationality ?? "",
    bloodGroup: profile?.bloodGroup ?? "",
    bio: profile?.bio ?? "",
    emergencyContactName: profile?.emergencyContactName ?? "",
    emergencyContactPhone: profile?.emergencyContactPhone ?? "",
    emergencyContactRelation: profile?.emergencyContactRelation ?? "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) {
      setMsg("Image must be under 500KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setSaving(true);
      setMsg(null);
      try {
        const res = await fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileImage: base64 }),
        });
        const data = await res.json();
        if (res.ok && data.user) {
          onUpdate(data.user);
          setMsg("Profile matrix updated!");
        } else {
          setMsg(data.error ?? "Sync failed");
        }
      } catch {
        setMsg("Sync connection failed");
      } finally {
        setSaving(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        onUpdate(data.user);
        setEditing(false);
        setMsg("Identity records synchronized.");
      } else {
        setMsg(data.error ?? "Sync error");
      }
    } catch {
      setMsg("Connection error");
    } finally {
      setSaving(false);
    }
  }

  if (!profile) return null;

  const age = profile.dateOfBirth
    ? Math.floor(
        (Date.now() - new Date(profile.dateOfBirth).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000),
      )
    : null;

  return (
    <div className="max-w-4xl space-y-6 pb-20">
      {msg && (
        <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold shadow-lg ${msg.includes("fail") || msg.includes("error") || msg.includes("must") ? "bg-red-500/10 border-red-500/50 text-red-500" : "bg-emerald-500/10 border-emerald-500/50 text-emerald-500"}`}>
          {msg.includes("fail") || msg.includes("error") || msg.includes("must") ? <X className="h-4 w-4 " /> : <CheckCircle2 className="h-4 w-4 " />}
          {msg}
        </div>
      )}

      {/* Profile header card */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="flex flex-wrap items-center gap-6 relative z-10">
          {/* Avatar + upload */}
          <div className="relative group">
            {profile.profileImage ? (
              <img
                src={profile.profileImage}
                alt={profile.name}
                className="h-28 w-28 rounded-2xl object-cover ring-2 ring-slate-200 dark:ring-[#2A303C] transition group-hover:ring-emerald-400/80  group-hover: "
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-slate-800 text-3xl font-bold text-emerald-500 border border-emerald-500/30">
                {profile.name.charAt(0).toUpperCase()}
              </div>
            )}
            <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-2xl bg-black/60 opacity-0 transition group-hover:opacity-100">
              <Camera className="h-6 w-6 text-emerald-500 " />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
            {saving && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white dark:bg-[#131B2B]/80 backdrop-blur-sm">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{profile.name}</h2>
            <p className="text-sm font-mono text-cyan-500 mt-1">{profile.email}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] uppercase tracking-widest font-bold text-emerald-500  ">
                {profile.kycStatus === "Complete" ? "Verified ID" : profile.kycStatus}
              </span>
              {profile.gender && (
                <span className="rounded-md border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[10px] uppercase tracking-widest font-bold text-blue-500">
                  {profile.gender}
                </span>
              )}
              {age !== null && (
                <span className="rounded-md border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[10px] uppercase tracking-widest font-bold text-violet-500">
                  AGE {age}
                </span>
              )}
              {profile.bloodGroup && (
                <span className="rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold text-red-500 ">
                  TYPE {profile.bloodGroup}
                </span>
              )}
            </div>
            {profile.bio && (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 italic font-medium leading-relaxed border-l-2 border-emerald-500/30 pl-3 py-1">
                "{profile.bio}"
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setEditing(!editing)}
            className={`inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition ${
              editing
                ? "bg-slate-800 border-slate-200 dark:border-[#2A303C] text-slate-300 hover:bg-slate-700"
                : "bg-emerald-500/10 border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/20 hover: "
            }`}
          >
            {editing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
            {editing ? "Abort Edit" : "Configure File"}
          </button>
        </div>
      </div>

      {/* Details — view or edit mode */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal Information */}
        <div className="rounded-2xl border border-slate-200 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] p-6">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white tracking-widest mb-6 border-b border-slate-200 dark:border-[#2A303C] pb-3">
            <User className="h-4 w-4 text-emerald-500" />
            Personal Information
          </h3>
          {editing ? (
            <div className="space-y-4">
              <EditField label="Full Name" name="name" value={form.name} onChange={handleChange} />
              <div className="grid grid-cols-2 gap-4">
                <EditField label="Primary Phone" name="phone" value={form.phone} onChange={handleChange} type="tel" />
                <EditField label="Alternative Phone" name="alternativePhone" value={form.alternativePhone} onChange={handleChange} type="tel" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 pl-1">Gender</label>
                  <select name="gender" value={form.gender} onChange={handleChange} className="w-full rounded-xl border border-slate-200 dark:border-[#2A303C] bg-slate-50 dark:bg-[#0B0F19] px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 text-slate-900 dark:text-white font-medium transition">
                    <option value="" className="bg-white dark:bg-[#131B2B]">Select</option>
                    <option value="Male" className="bg-white dark:bg-[#131B2B]">Male</option>
                    <option value="Female" className="bg-white dark:bg-[#131B2B]">Female</option>
                    <option value="Other" className="bg-white dark:bg-[#131B2B]">Other</option>
                    <option value="Prefer not to say" className="bg-white dark:bg-[#131B2B]">Prefer not to say</option>
                  </select>
                </div>
                <EditField label="Date of Birth" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} type="date" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <EditField label="Nationality" name="nationality" value={form.nationality} onChange={handleChange} />
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 pl-1">Blood Group</label>
                  <select name="bloodGroup" value={form.bloodGroup} onChange={handleChange} className="w-full rounded-xl border border-slate-200 dark:border-[#2A303C] bg-slate-50 dark:bg-[#0B0F19] px-4 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 text-slate-900 dark:text-white font-medium transition">
                    <option value="" className="bg-white dark:bg-[#131B2B]">Select</option>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                      <option key={bg} value={bg} className="bg-white dark:bg-[#131B2B] uppercase">{bg}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 pl-1">Short Biography</label>
                <textarea name="bio" value={form.bio} onChange={handleChange} rows={2} className="w-full rounded-xl border border-slate-200 dark:border-[#2A303C] bg-slate-50 dark:bg-[#0B0F19] px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 text-slate-900 dark:text-white font-medium transition placeholder:text-slate-600" placeholder="Agent backstory..." />
              </div>
              <EditField label="Permanent Address" name="address" value={form.address} onChange={handleChange} />
            </div>
          ) : (
            <div className="space-y-4">
              <InfoRow label="Designation" value={profile.name} />
              <InfoRow label="Network ID" value={profile.email} />
              <InfoRow label="Comms Primary" value={profile.phone} />
              <InfoRow label="Comms Secondary" value={profile.alternativePhone} />
              <InfoRow label="Phenotype" value={profile.gender} />
              <InfoRow label="Origin Date" value={profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null} />
              <InfoRow label="Registered Age" value={age !== null ? `${age} Cycles` : null} />
              <InfoRow label="Jurisdiction" value={profile.nationality} />
              <InfoRow label="Blood Type" value={profile.bloodGroup} neonValue />
              <InfoRow label="Profile Notes" value={profile.bio} />
              <InfoRow label="Base Loc" value={profile.address} />
            </div>
          )}
        </div>

        {/* Emergency & Identity */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-[40px] pointer-events-none" />
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white tracking-widest mb-6 border-b border-slate-200 dark:border-[#2A303C] pb-3">
              <Heart className="h-4 w-4 text-red-500 " />
              Emergency Contacts
            </h3>
            {editing ? (
              <div className="space-y-4 relative z-10">
                <EditField label="Contact Alias" name="emergencyContactName" value={form.emergencyContactName} onChange={handleChange} />
                <EditField label="Emergency Frequency" name="emergencyContactPhone" value={form.emergencyContactPhone} onChange={handleChange} type="tel" />
                <EditField label="Bond/Relation" name="emergencyContactRelation" value={form.emergencyContactRelation} onChange={handleChange} />
              </div>
            ) : (
              <div className="space-y-4 relative z-10">
                <InfoRow label="Alias" value={profile.emergencyContactName} />
                <InfoRow label="Frequency" value={profile.emergencyContactPhone} />
                <InfoRow label="Relation" value={profile.emergencyContactRelation} />
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[40px] pointer-events-none" />
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white tracking-widest mb-6 border-b border-slate-200 dark:border-[#2A303C] pb-3">
              <Shield className="h-4 w-4 text-blue-500 " />
              Government Identity (KYC)
            </h3>
            <div className="space-y-4 relative z-10">
              <InfoRow label="Citizenship Code" value={profile.citizenship} />
              <InfoRow label="Aadhaar ID" value={profile.aadhaarNumber ? `XXXX XXXX ${profile.aadhaarNumber.slice(-4)}` : null} />
              <InfoRow label="KYC Validation" value={profile.kycStatus} />
              <InfoRow label="Network Entry" value={new Date(profile.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />
            </div>
          </div>
        </div>
      </div>

      {/* Save button */}
      {editing && (
        <div className="flex justify-end pt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="group inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/50 px-8 py-3.5 text-sm font-bold text-emerald-500 hover:bg-emerald-500/20 hover: disabled:opacity-50 transition uppercase tracking-widest"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 group-hover:scale-110 transition-transform" />}
            {saving ? "Transmitting..." : "Initialize Update"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  SHARED UI COMPONENTS                                    */
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
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500", shadow: "", border: "border-emerald-500/20" },
    blue: { bg: "bg-blue-500/10", text: "text-blue-500", shadow: "", border: "border-blue-500/20" },
    cyan: { bg: "bg-cyan-500/10", text: "text-cyan-500", shadow: "", border: "border-cyan-500/20" },
    red: { bg: "bg-red-500/10", text: "text-red-500", shadow: "", border: "border-red-500/20" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-500", shadow: "", border: "border-amber-500/20" },
    violet: { bg: "bg-violet-500/10", text: "text-violet-500", shadow: "", border: "border-violet-500/20" },
  };
  const theme = colorMap[color] ?? colorMap.cyan;

  return (
    <div className={`group rounded-2xl border bg-white dark:bg-[#131B2B] p-5 transition-all duration-300 border-slate-300 dark:border-[#2A303C] hover:-translate-y-1 hover:shadow-lg shadow-sm hover:bg-slate-50 dark:hover:bg-[#131B2B]/60`}>
      <div className={`inline-flex rounded-xl p-2.5 transition-all duration-300 ${theme.bg}`}>
        <Icon className={`h-5 w-5 ${theme.text} group-hover:drop-shadow-[0_0_8px_currentColor]`} />
      </div>
      <p className={`mt-4 text-3xl font-bold font-mono tracking-tight transition-all duration-300 ${theme.text} group-hover:drop-shadow-[0_0_12px_currentColor]`}>{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">{title}</p>
    </div>
  );
}

function ActionCard({
  href,
  icon: Icon,
  title,
  description,
  color,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    red: "hover:bg-red-500/10 hover:border-red-500/50 text-red-500 group-hover:",
    amber: "hover:bg-amber-500/10 hover:border-amber-500/50 text-amber-500 group-hover:",
    violet: "hover:bg-violet-500/10 hover:border-violet-500/50 text-violet-500 group-hover:",
    emerald: "hover:bg-emerald-500/10 hover:border-emerald-500/50 text-emerald-500 group-hover:",
  };

  return (
    <Link
      href={href}
      className={`group flex items-center justify-between gap-4 rounded-xl border border-slate-300 dark:border-[#2A303C] shadow-sm hover:shadow-lg bg-white dark:bg-[#131B2B] backdrop-blur p-4 transition-all duration-300 hover:-translate-y-1 ${colorMap[color] ?? colorMap.emerald}`}
    >
      <div>
        <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-all">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 transition-colors group-hover:text-slate-700 dark:group-hover:text-slate-300">{description}</p>
      </div>
      <div className="rounded-xl bg-slate-100 dark:bg-slate-800 p-2.5 transition-all duration-300 group-hover:scale-110">
        <Icon className="h-5 w-5 inherit-text transition-all duration-300 group-hover:drop-shadow-[0_0_8px_currentColor]" />
      </div>
    </Link>
  );
}

function InfoRow({ label, value, neonValue = false }: { label: string; value?: string | null, neonValue?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 border-b border-slate-200 dark:border-[#2A303C] pb-2 last:border-0 last:pb-0">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`text-sm font-medium ${neonValue && value ? "text-red-500 font-bold" : "text-slate-900 dark:text-slate-300"}`}>
        {value || <span className="text-slate-500 dark:text-slate-400 italic">Not specified</span>}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    INVESTIGATING: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    RESOLVED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 ",
    CLOSED: "bg-slate-700/50 text-slate-300 border-slate-200 dark:border-[#2A303C]/50",
    ACTIVE: "bg-red-500/10 text-red-500 border-red-500/30 ",
    VERIFIED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
    APPROVED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
    REJECTED: "bg-red-500/10 text-red-400 border-red-500/30",
  };

  return (
    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${map[status] ?? map.PENDING}`}>
      {status}
    </span>
  );
}

function EmptyState({
  icon: Icon,
  message,
  hint,
  color = "emerald"
}: {
  icon: React.ElementType;
  message: string;
  hint: string;
  color?: string;
}) {
  const colorClass = color === "red" ? "text-red-500 " :
                     color === "amber" ? "text-amber-500 " :
                     "text-emerald-500 ";
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-[#2A303C] bg-white dark:bg-[#131B2B]/30 backdrop-blur py-20 text-center">
      <div className="rounded-2xl border border-slate-200 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] p-5 mb-4">
        <Icon className={`h-8 w-8 ${colorClass}`} />
      </div>
      <p className="text-sm font-bold tracking-widest uppercase text-slate-900 dark:text-white">{message}</p>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 max-w-sm">{hint}</p>
    </div>
  );
}

function EditField({
  label,
  name,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 pl-1">{label}</label>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-slate-200 dark:border-[#2A303C] bg-slate-50 dark:bg-[#0B0F19] px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 text-slate-900 dark:text-white font-medium transition placeholder:text-slate-600"
      />
    </div>
  );
}
