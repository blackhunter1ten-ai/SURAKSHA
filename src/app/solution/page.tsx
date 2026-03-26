import Link from "next/link";
import {
  Activity,
  Brain,
  FileText,
  Heart,
  Lock,
  MapPinned,
  Radio,
  ShieldAlert,
} from "lucide-react";

export default function SolutionPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
      <p className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
        Live System Demonstrations
      </p>
      <h1 className="mt-2 text-center text-3xl font-bold text-slate-900 md:text-4xl">
        Interactive Process Visualizations
      </h1>
      <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
        Experience demonstrations of AI monitoring and
        geo-fencing tied to the same backend used by dashboards.
      </p>


      <div
        id="emergency"
        className="mt-16 grid gap-8 md:grid-cols-3 scroll-mt-24"
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <ShieldAlert className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="mt-4 text-lg font-bold">Emergency Panic Button</h3>
          <p className="text-sm font-medium text-red-600">
            Instant emergency response
          </p>
          <p className="mt-3 text-sm text-slate-600">
            One-touch activation sends location, medical context, and alerts to
            authorities and contacts — wired to{" "}
            <code className="rounded bg-slate-100 px-1">POST /api/emergency</code>.
          </p>
          <Link
            href="/emergency"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-700"
          >
            <Radio className="h-4 w-4" />
            EMERGENCY
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-100">
            <Activity className="h-6 w-6 text-pink-600" />
          </div>
          <h3 className="mt-4 text-lg font-bold">IoT Smart Band</h3>
          <p className="text-sm font-medium text-pink-600">
            Continuous health monitoring
          </p>
          <div className="mt-3 rounded-lg bg-sky-50 p-3 text-xs text-slate-700">
            <span className="rounded bg-blue-200 px-1.5 py-0.5 font-semibold">
              Beta
            </span>{" "}
            <span className="rounded bg-blue-100 px-1.5 py-0.5">Coming Soon</span>
            <p className="mt-2">
              SOS and fall detection on wearable — schema
              ready for vitals ingestion.
            </p>
          </div>
          <div className="mt-4 flex gap-4 text-xs text-slate-600">
            <span>
              <Heart className="mr-1 inline h-3 w-3" />
              72 BPM
            </span>
            <span>Normal</span>
            <span className="text-emerald-600">Active</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200">
            <FileText className="h-6 w-6 text-slate-700" />
          </div>
          <h3 className="mt-4 text-lg font-bold">Auto E-FIR Generation</h3>
          <p className="text-sm font-medium text-slate-600">
            Automated incident reporting
          </p>
          <p className="mt-3 text-sm text-slate-600">
            Electronic FIR drafts with secure audit trail — sample payload
            from API for demos.
          </p>
          <ul className="mt-3 space-y-2 text-xs">
            <li className="flex justify-between">
              Report Generation{" "}
              <span className="rounded bg-amber-200 px-1.5">Automated</span>
            </li>

            <li className="flex justify-between">
              Authority Integration{" "}
              <span className="rounded bg-amber-200 px-1.5">Real-time</span>
            </li>
          </ul>
          <a
            href="/api/efir/sample"
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-300 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            <FileText className="h-4 w-4" />
            View Sample E-FIR (JSON)
          </a>
        </div>
      </div>

      <div className="mt-16 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
          <Brain className="h-8 w-8 text-violet-600" />
          <h3 className="mt-3 font-bold">AI Anomaly Detection</h3>
          <p className="mt-2 text-sm text-slate-600">
            Route and dwell-time anomalies for instant alerts.
          </p>
          <div className="mt-3 h-2 w-full rounded-full bg-slate-200">
            <div className="h-2 w-[97%] rounded-full bg-violet-500" />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Detection accuracy 97.3% · 0.8s response
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
          <MapPinned className="h-8 w-8 text-emerald-600" />
          <h3 className="mt-3 font-bold">Geo-Fencing Alerts</h3>
          <p className="mt-2 text-sm text-slate-600">
            Safe, hub, and restricted zones with breach signals.
          </p>
          <Link
            href="/geo"
            className="mt-4 inline-block text-sm font-semibold text-emerald-700 hover:underline"
          >
            Open Geo-Sensing page →
          </Link>
        </div>
      </div>
    </div>
  );
}
