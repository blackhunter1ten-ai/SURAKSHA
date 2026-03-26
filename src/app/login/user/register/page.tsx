"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Mail,
  Phone,
  Lock,
  ShieldAlert,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Globe,
  CreditCard,
  ChevronDown,
  MapPin,
} from "lucide-react";

type FieldError = {
  [key: string]: string;
};

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "Lowercase letter", ok: /[a-z]/.test(password) },
    { label: "Number", ok: /[0-9]/.test(password) },
    { label: "Special character", ok: /[^A-Za-z0-9]/.test(password) },
  ];
  if (!password) return null;
  return (
    <div className="mt-2 grid grid-cols-2 gap-1">
      {checks.map((c) => (
        <span key={c.label} className={`flex items-center gap-1 text-xs ${c.ok ? "text-emerald-600" : "text-slate-400"}`}>
          {c.ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
          {c.label}
        </span>
      ))}
    </div>
  );
}

function FormField({
  label,
  required,
  icon: Icon,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  icon: React.ElementType;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-700">
        <Icon className="h-4 w-4 text-emerald-600" />
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldError>({});

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    alternativePhone: "",
    address: "",
    password: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "",
    citizenship: "Indian Citizen",
    aadhaarNumber: "",
    consentLocation: false,
    consentCredentials: false,
  });

  const inputClass = (field: string) =>
    `mt-0.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-emerald-400 ${
      fieldErrors[field] ? "border-red-400 bg-red-50" : "border-slate-300 bg-white focus:border-emerald-400"
    }`;

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});
    setLoading(true);
    try {
      const res = await fetch("/api/auth/user/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setServerError(data.error ?? "Registration failed. Please try again.");
        return;
      }
      router.push("/dashboard/user");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-100 py-10 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-200">
            <ShieldAlert className="h-7 w-7 text-white" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Suraksha</p>
          <h1 className="mt-1 text-3xl font-extrabold text-slate-900">Create your account</h1>
          <p className="mt-2 text-sm text-slate-500">
            Register to access personal safety tools, SOS, and emergency features.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-100"
        >
          {/* Personal Information */}
          <div className="border-b border-slate-100 bg-slate-50 px-6 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Personal Information</p>
          </div>
          <div className="space-y-5 px-6 py-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField label="Full Name" required icon={User} error={fieldErrors.name}>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Ravi Kumar"
                  value={form.name}
                  onChange={handleChange}
                  className={inputClass("name")}
                />
              </FormField>
              <FormField label="Email Address" required icon={Mail} error={fieldErrors.email}>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="ravi@example.com"
                  value={form.email}
                  onChange={handleChange}
                  className={inputClass("email")}
                  autoComplete="email"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField label="Phone Number" required icon={Phone} error={fieldErrors.phone}>
                <input
                  name="phone"
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={handleChange}
                  className={inputClass("phone")}
                />
              </FormField>
              <FormField label="Alternative Phone Number" required icon={Phone} error={fieldErrors.alternativePhone}>
                <input
                  name="alternativePhone"
                  type="tel"
                  required
                  placeholder="+91 87654 32109"
                  value={form.alternativePhone}
                  onChange={handleChange}
                  className={inputClass("alternativePhone")}
                />
              </FormField>
            </div>
            
            <FormField label="Current Address" required icon={MapPin} error={fieldErrors.address}>
              <textarea
                name="address"
                required
                placeholder="123 Example Street, City, State 123456"
                value={form.address}
                onChange={handleChange as any}
                className={inputClass("address") + " min-h-[80px] resize-y"}
              />
            </FormField>
          </div>

          {/* Citizenship Information */}
          <div className="border-y border-slate-100 bg-blue-50 px-6 py-3">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-700">
              <Globe className="h-3.5 w-3.5" />
              Citizenship Information
            </p>
          </div>
          <div className="space-y-5 px-6 py-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField label="Are you an Indian or Foreign citizen?" required icon={Globe} error={fieldErrors.citizenship}>
                <div className="relative">
                  <select
                    name="citizenship"
                    required
                    value={form.citizenship}
                    onChange={handleChange}
                    className={inputClass("citizenship") + " appearance-none pr-10"}
                  >
                    <option value="Indian Citizen">Indian Citizen</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </FormField>
              <FormField label="Aadhaar Card Number" required icon={CreditCard} error={fieldErrors.aadhaarNumber}>
                <input
                  name="aadhaarNumber"
                  type="text"
                  required
                  placeholder="1234 5678 9012"
                  value={form.aadhaarNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 12);
                    const formatted = val.replace(/(\d{4})/g, "$1 ").trim();
                    setForm((prev) => ({ ...prev, aadhaarNumber: formatted }));
                    if (fieldErrors.aadhaarNumber) {
                      setFieldErrors((prev) => { const n = { ...prev }; delete n.aadhaarNumber; return n; });
                    }
                  }}
                  className={inputClass("aadhaarNumber")}
                />
              </FormField>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="border-y border-slate-100 bg-red-50 px-6 py-3">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-red-600">
              <ShieldAlert className="h-3.5 w-3.5" />
              Emergency Contact Details
            </p>
          </div>
          <div className="space-y-5 px-6 py-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <FormField label="Contact Name" required icon={User} error={fieldErrors.emergencyContactName}>
                <input
                  name="emergencyContactName"
                  type="text"
                  required
                  placeholder="Jane Doe"
                  value={form.emergencyContactName}
                  onChange={handleChange}
                  className={inputClass("emergencyContactName")}
                />
              </FormField>
              <FormField label="Contact Phone" required icon={Phone} error={fieldErrors.emergencyContactPhone}>
                <input
                  name="emergencyContactPhone"
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={form.emergencyContactPhone}
                  onChange={handleChange}
                  className={inputClass("emergencyContactPhone")}
                />
              </FormField>
              <FormField label="Relation" required icon={User} error={fieldErrors.emergencyContactRelation}>
                <input
                  name="emergencyContactRelation"
                  type="text"
                  required
                  placeholder="Spouse / Parent / Friend"
                  value={form.emergencyContactRelation}
                  onChange={handleChange}
                  className={inputClass("emergencyContactRelation")}
                />
              </FormField>
            </div>
          </div>

          {/* Security */}
          <div className="border-y border-slate-100 bg-slate-50 px-6 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Security</p>
          </div>
          <div className="space-y-5 px-6 py-6">
            <FormField label="Password" required icon={Lock} error={fieldErrors.password}>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Create a strong password"
                  value={form.password}
                  onChange={handleChange}
                  className={`${inputClass("password")} pr-10`}
                  autoComplete="new-password"
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
              <PasswordStrength password={form.password} />
            </FormField>
          </div>

          {/* Consent & Permissions */}
          <div className="border-t border-slate-100 px-6 py-6">
            <p className="mb-4 text-sm font-bold text-slate-900">Consent & Permissions</p>
            <div className="flex flex-col gap-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="consentLocation"
                  required
                  checked={form.consentLocation}
                  onChange={(e) => setForm(prev => ({ ...prev, consentLocation: e.target.checked }))}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                />
                <span className="text-sm text-slate-700 font-medium">
                  I consent to real-time location tracking for safety and emergency response purposes
                </span>
              </label>
              {fieldErrors.consentLocation && <p className="text-xs text-red-600 ml-7">{fieldErrors.consentLocation}</p>}
              
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="consentCredentials"
                  required
                  checked={form.consentCredentials}
                  onChange={(e) => setForm(prev => ({ ...prev, consentCredentials: e.target.checked }))}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                />
                <span className="text-sm text-slate-700 font-medium">
                  I consent to storing my credentials securely for verification and data protection
                </span>
              </label>
              {fieldErrors.consentCredentials && <p className="text-xs text-red-600 ml-7">{fieldErrors.consentCredentials}</p>}
            </div>
          </div>

          {/* Submit */}
          <div className="border-t border-slate-100 bg-slate-50 px-6 py-5">
            {serverError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                <XCircle className="h-4 w-4 shrink-0" />
                {serverError}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>
            <p className="mt-4 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link href="/login/user" className="font-semibold text-emerald-700 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
