"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  MapPin,
  Shield,
  Users,
  Eye,
  LogOut,
} from "lucide-react";

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
  lat: number | null;
  lng: number | null;
  age: number | null;
  phone: string | null;
  nationality: string | null;
  gender: string | null;
  permanentAddress: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  idDocumentType: string | null;
  idDocumentNumber: string | null;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "alerts" | "analytics" | "reports">(
    "overview",
  );
  const [overview, setOverview] = useState<Overview | null>(null);
  const [tourists, setTourists] = useState<Tourist[]>([]);
  const [emergencies, setEmergencies] = useState<
    { id: string; createdAt: string; user: { name: string } }[]
  >([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/overview").then((r) => r.json()),
      fetch("/api/tourists").then((r) => r.json()),
      fetch("/api/emergency").then((r) => r.json()),
    ])
      .then(([o, t, e]) => {
        if (o.error) return;
        setOverview(o);
        setTourists(t.tourists ?? []);
        setEmergencies(e.emergencies ?? []);
      })
      .catch(() => {});
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const safe = tourists.filter((x) => x.status === "SAFE").length;
  const warn = tourists.filter((x) => x.status === "WARNING").length;
  const emerg = tourists.filter((x) => x.status === "EMERGENCY").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Authority Dashboard</h1>
          <p className="text-slate-600">
            Real-time monitoring for tourism authorities and emergency teams.
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

      <div className="mt-8 flex flex-wrap gap-2 border-b border-slate-200">
        {(
          [
            ["overview", "Overview"],
            ["alerts", "Active Alerts"],
            ["analytics", "Analytics"],
            ["reports", "Reports"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`border-b-2 px-4 py-2 text-sm font-semibold ${
              tab === k
                ? "border-amber-500 text-amber-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && overview && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <Users className="h-8 w-8 text-blue-600" />
              <p className="mt-3 text-2xl font-bold text-slate-900">
                {overview.totalTourists.toLocaleString()}
              </p>
              <p className="text-sm text-slate-600">Total tourists (seed)</p>
              <p className="mt-1 text-xs text-emerald-600">+12% from last month</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <p className="mt-3 text-2xl font-bold text-red-600">
                {overview.activeAlerts}
              </p>
              <p className="text-sm text-slate-600">Active emergencies</p>
              <p className="mt-1 text-xs text-red-600">Requires attention</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <Shield className="h-8 w-8 text-amber-600" />
              <p className="mt-3 text-2xl font-bold text-amber-700">
                &lt; {overview.avgResolutionMin} min
              </p>
              <p className="text-sm text-slate-600">Avg resolution (demo)</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <MapPin className="h-8 w-8 text-rose-600" />
              <p className="mt-3 text-2xl font-bold text-rose-700">
                {overview.safetyScore}%
              </p>
              <p className="text-sm text-slate-600">Safety score</p>
            </div>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 font-bold text-slate-900">
                <Activity className="h-5 w-5" />
                Safety Statistics
              </h2>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>High-Risk Alerts</span>
                    <span>15%</span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-slate-100">
                    <div className="h-2 w-[15%] rounded-full bg-red-500" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Resolved Incidents</span>
                    <span>65%</span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-slate-100">
                    <div className="h-2 w-[65%] rounded-full bg-amber-400" />
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 font-bold text-slate-900">
                <Activity className="h-5 w-5 text-rose-500" />
                Live Activity Feed
              </h2>
              <ul className="mt-4 space-y-3">
                {overview.activities.map((a) => (
                  <li key={a.id} className="flex gap-2 text-sm">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        a.kind === "success"
                          ? "bg-emerald-500"
                          : a.kind === "warning"
                            ? "bg-amber-500"
                            : "bg-blue-500"
                      }`}
                    />
                    <div>
                      <p className="font-medium text-slate-900">{a.message}</p>
                      {a.detail && (
                        <p className="text-xs text-slate-500">{a.detail}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}

      {tab === "alerts" && (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-bold text-slate-900">Emergency events (API)</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {emergencies.length === 0 && (
              <li className="text-slate-500">No events yet — trigger SOS as a tourist.</li>
            )}
            {emergencies.map((ev) => (
              <li key={ev.id} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span>{ev.user.name}</span>
                <span className="text-xs text-slate-500">
                  {new Date(ev.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "analytics" && (
        <p className="mt-8 text-slate-600">
          Plug BI tools or export CSV from your database — metrics above come from{" "}
          <code className="rounded bg-slate-100 px-1">/api/admin/overview</code>.
        </p>
      )}

      {tab === "reports" && (
        <p className="mt-8 text-slate-600">
          Generate PDFs from emergency and contact tables — sample E-FIR JSON at{" "}
          <a href="/api/efir/sample" className="font-semibold text-blue-700 underline">
            /api/efir/sample
          </a>
          .
        </p>
      )}

      <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">
          Live Tourist Registry with real locations and E-FIR fields
        </h2>
        <div className="mt-4 space-y-2">
          {tourists.map((t) => (
            <div
              key={t.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <p className="font-semibold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.email}</p>
                  <p className="text-xs text-slate-600">Last known: {t.address ?? "—"}</p>
                </div>
                {(t.age != null ||
                  t.phone ||
                  t.nationality ||
                  t.gender ||
                  t.permanentAddress ||
                  t.emergencyContactName ||
                  t.emergencyContactPhone ||
                  t.idDocumentType ||
                  t.idDocumentNumber) && (
                  <div className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-slate-800">
                    <p className="font-semibold text-amber-900">E-FIR / profile</p>
                    <ul className="mt-1 grid gap-0.5 sm:grid-cols-2">
                      {t.age != null && (
                        <li>
                          <span className="text-slate-500">Age:</span> {t.age}
                        </li>
                      )}
                      {t.phone && (
                        <li>
                          <span className="text-slate-500">Phone:</span> {t.phone}
                        </li>
                      )}
                      {t.nationality && (
                        <li>
                          <span className="text-slate-500">Nationality:</span> {t.nationality}
                        </li>
                      )}
                      {t.gender && (
                        <li>
                          <span className="text-slate-500">Gender:</span> {t.gender}
                        </li>
                      )}
                      {t.permanentAddress && (
                        <li className="sm:col-span-2">
                          <span className="text-slate-500">Permanent address:</span>{" "}
                          {t.permanentAddress}
                        </li>
                      )}
                      {t.emergencyContactName && (
                        <li>
                          <span className="text-slate-500">Emergency contact:</span>{" "}
                          {t.emergencyContactName}
                        </li>
                      )}
                      {t.emergencyContactPhone && (
                        <li>
                          <span className="text-slate-500">Emergency phone:</span>{" "}
                          {t.emergencyContactPhone}
                        </li>
                      )}
                      {t.idDocumentType && (
                        <li>
                          <span className="text-slate-500">ID type:</span> {t.idDocumentType}
                        </li>
                      )}
                      {t.idDocumentNumber && (
                        <li>
                          <span className="text-slate-500">ID number:</span> {t.idDocumentNumber}
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    t.status === "SAFE"
                      ? "bg-emerald-100 text-emerald-800"
                      : t.status === "WARNING"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-red-100 text-red-800"
                  }`}
                >
                  {t.status}
                </span>
                <Eye className="h-4 w-4 text-slate-400" />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <span className="text-emerald-700">{safe} Safe</span>
          <span className="text-amber-700">{warn} Warnings</span>
          <span className="text-red-700">{emerg} Emergencies</span>
          <span className="text-blue-700">{tourists.length} Visible</span>
        </div>
      </div>

      <p className="mt-8 text-center text-sm text-slate-600">
        <Link href="/geo" className="font-semibold text-emerald-700 hover:underline">
          Geo-Sensing map UI
        </Link>
      </p>
    </div>
  );
}
