"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Eye, EyeOff } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@suraksha.gov");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error ?? "Login failed");
        return;
      }
      router.push("/dashboard/admin");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-slate-100 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-200">
            <ShieldAlert className="h-7 w-7 text-white" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Authority Console</p>
          <h1 className="mt-1 text-3xl font-extrabold text-slate-900">Admin login</h1>
          <p className="mt-2 text-sm text-slate-500">
            Use your administrator credentials. Tourist accounts cannot sign in here.
          </p>
        </div>

        {/* Form Card */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-100">
          <form onSubmit={onSubmit} className="space-y-5 px-6 py-7">
            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400"
                autoComplete="email"
                placeholder="admin@suraksha.gov"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="password">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-10 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400"
                  autoComplete="current-password"
                  placeholder="rohan#1234"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {err && (
              <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600" role="alert">
                {err}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in as admin"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
