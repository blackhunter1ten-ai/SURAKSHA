"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Loader2,
  LogOut,
  MapPin,
  Route,
  Shield,
  User,
} from "lucide-react";

type U = {
  id: string;
  name: string;
  email: string;
  did: string | null;
  status: string;
  kycStatus: string;
  locationTrackingStatus: string;
  address: string | null;
  phone: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
};

export default function UserDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<U | null>(null);


  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setUser(d.user);
      });
  }, []);



  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }



  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your safety dashboard</h1>
          <p className="text-slate-600">
            Tourist view — onboarding status, live stats, and geo tools.
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {user ? (
          <>
            <StatusCard title="Tourist Registration" icon={User} status="Complete" />
            <StatusCard
              title="KYC Verification"
              icon={Shield}
              status={user.kycStatus}
            />

            <StatusCard
              title="Location Tracking Active"
              icon={MapPin}
              status={user.locationTrackingStatus}
            />
          </>
        ) : (
          <div className="col-span-full flex items-center gap-2 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading profile…
          </div>
        )}
      </div>

      {user && (
        <div className="mt-8 flex flex-wrap gap-6 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">

          <div>
            <span className="text-xs text-slate-500">Safety</span>
            <p
              className={`text-sm font-semibold ${
                user.status === "SAFE"
                  ? "text-emerald-700"
                  : user.status === "WARNING"
                    ? "text-amber-700"
                    : "text-red-700"
              }`}
            >
              {user.status}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Last known</span>
            <p className="text-sm text-slate-800">{user.address ?? "Enable GPS on /geo"}</p>
          </div>
        </div>
      )}



      <div className="mt-8 grid gap-4 text-center sm:grid-cols-3">
        <div className="rounded-xl bg-white py-4 shadow">
          <p className="text-2xl font-bold text-blue-600">1,247</p>
          <p className="text-xs text-slate-600">Active IDs (demo)</p>
        </div>
        <div className="rounded-xl bg-white py-4 shadow">
          <p className="text-2xl font-bold text-red-600">23</p>
          <p className="text-xs text-slate-600">Alerts today (demo)</p>
        </div>
        <div className="rounded-xl bg-white py-4 shadow">
          <p className="text-2xl font-bold text-slate-900">99.9%</p>
          <p className="text-xs text-slate-600">System uptime</p>
        </div>
      </div>

      <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Geo-Fencing & Alert System</h2>
        <p className="text-sm text-slate-600">
          Real-time location monitoring — simplified grid (zones are illustrative).
        </p>
        <div className="relative mt-4 h-72 rounded-xl bg-slate-100">
          <div className="absolute left-8 top-8 h-40 w-52 rounded-3xl border-4 border-emerald-500/80 bg-emerald-500/10">
            <span className="absolute left-3 top-2 text-xs font-semibold text-emerald-800">
              Safe Zone
            </span>
            <div className="absolute bottom-6 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-blue-600 shadow-lg ring-2 ring-white" />
          </div>
          <div className="absolute bottom-10 left-24 h-24 w-36 rounded-3xl border-4 border-blue-500/70 bg-blue-500/10">
            <span className="absolute left-2 top-1 text-[10px] font-semibold text-blue-900">
              Tourist Hub
            </span>
          </div>
          <div className="absolute right-10 top-16 h-28 w-24 rounded-3xl border-4 border-red-500/80 bg-red-500/10">
            <span className="absolute left-1 top-1 text-[10px] font-semibold text-red-900">
              Restricted
            </span>
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-4">
        {[
          ["847", "Active Tourists", "text-blue-600"],
          ["12", "Safe Zones", "text-emerald-600"],
          ["0", "Active Alerts", "text-red-600"],
          ["8", "Checkpoints", "text-violet-600"],
        ].map(([n, l, c]) => (
          <div key={l} className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <p className={`text-2xl font-bold ${c}`}>{n}</p>
            <p className="text-xs text-slate-600">{l}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <Link
          href="/emergency"
          className="rounded-full bg-red-600 px-6 py-3 text-sm font-bold text-white hover:bg-red-700"
        >
          Open Emergency / Panic
        </Link>

        <Link
          href="/dashboard/user/fir"
          className="inline-flex items-center gap-2 rounded-full border-2 border-slate-800 px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
        >
          File New FIR
        </Link>
        <Link
          href="/dashboard/user/safe-route"
          className="inline-flex items-center gap-2 rounded-full border-2 border-rose-600 px-6 py-3 text-sm font-semibold text-rose-900 hover:bg-rose-50"
        >
          <Route className="h-4 w-4" />
          Heat zones — safest path
        </Link>
        <Link
          href="/geo"
          className="rounded-full border-2 border-emerald-600 px-6 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
        >
          Enable location tracking
        </Link>
      </div>
    </div>
  );
}

function StatusCard({
  title,
  icon: Icon,
  status,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  status: string;
}) {
  const done = status === "Complete";
  const processing = status === "Processing";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-6 w-6 text-slate-700" />
          <span className="text-sm font-semibold text-slate-900">{title}</span>
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
            done
              ? "border-emerald-200 bg-emerald-100 text-emerald-800"
              : processing
                ? "border-blue-200 bg-blue-100 text-blue-800"
                : "border-slate-200 bg-slate-100 text-slate-600"
          }`}
        >
          {status}
        </span>
      </div>
    </div>
  );
}
