import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Shield,
  Link2,
  FileCheck,
  Activity,
  Hash,
  ExternalLink,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BlockchainPage() {
  const items = await prisma.blockchainActivity.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const totalIds = items.filter((i) => i.label.includes("Tourist ID")).length;
  const totalFir = items.filter((i) => i.label.toLowerCase().includes("fir")).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Dark header ── */}
      <section className="hero-gradient circuit-bg relative overflow-hidden">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-cyan-500/15 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-4 py-16 text-center lg:px-8 lg:py-20">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
            <Shield className="h-7 w-7 text-cyan-300" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            Blockchain Trust Layer
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-white/70">
            Immutable audit trail — Tourist DID anchoring, e-FIR hashes, and
            all safety events recorded on-chain for full transparency.
          </p>

          {/* Stat cards */}
          <div className="mx-auto mt-10 grid max-w-lg gap-4 sm:grid-cols-3">
            <div className="glass rounded-2xl px-4 py-5 text-center">
              <p className="text-2xl font-bold text-white">{items.length}</p>
              <p className="mt-1 text-xs font-medium text-white/60">Total Records</p>
            </div>
            <div className="glass rounded-2xl px-4 py-5 text-center">
              <p className="text-2xl font-bold text-cyan-300">{totalIds}</p>
              <p className="mt-1 text-xs font-medium text-white/60">Tourist IDs</p>
            </div>
            <div className="glass rounded-2xl px-4 py-5 text-center">
              <p className="text-2xl font-bold text-amber-300">{totalFir}</p>
              <p className="mt-1 text-xs font-medium text-white/60">FIR Anchors</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Activity feed ── */}
      <div className="mx-auto max-w-4xl px-4 py-12 lg:px-8">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-slate-700" />
          <h2 className="text-lg font-bold text-slate-900">On-Chain Activity Feed</h2>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Live data from{" "}
          <code className="rounded bg-slate-200 px-1.5 py-0.5 text-xs font-medium">
            GET /api/blockchain/activity
          </code>
        </p>

        {items.length === 0 ? (
          <div className="mt-8 rounded-2xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
            <Hash className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-500">
              No blockchain activity yet
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Run{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                npm run db:seed
              </code>{" "}
              to populate demo data
            </p>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {items.map((row, idx) => {
              const isId = row.label.includes("Tourist ID");
              const isFir = row.label.toLowerCase().includes("fir");
              return (
                <li
                  key={row.id}
                  className="group flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:shadow-md"
                >
                  {/* Icon */}
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      isId
                        ? "bg-indigo-100 text-indigo-600"
                        : isFir
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {isId ? (
                      <Link2 className="h-4 w-4" />
                    ) : isFir ? (
                      <FileCheck className="h-4 w-4" />
                    ) : (
                      <Hash className="h-4 w-4" />
                    )}
                  </div>

                  {/* Tx hash */}
                  <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-indigo-700">
                    {row.hash.slice(0, 16)}…
                  </code>

                  {/* Label */}
                  <span className="flex-1 text-sm font-medium text-slate-800">
                    {row.label}
                  </span>

                  {/* DID badge */}
                  {row.touristDid && (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        isId
                          ? "border border-indigo-200 bg-indigo-50 text-indigo-700"
                          : "border border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                    >
                      {row.touristDid}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* Footer link */}
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/dashboard/admin"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Authority Dashboard
          </Link>
          <Link
            href="/solution"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Solution Architecture
          </Link>
        </div>
      </div>
    </div>
  );
}
