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
  ShieldCheck,
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
      <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
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
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

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
      fieldErrors[field] ? "border-red-400 bg-red-50" : "border-slate-200 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] focus:border-emerald-400"
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
        body: JSON.stringify({
          ...form,
          phone: `+91 ${form.phone}`,
          alternativePhone: `+91 ${form.alternativePhone}`,
          emergencyContactPhone: `+91 ${form.emergencyContactPhone}`,
          aadhaarNumber: form.aadhaarNumber.replace(/\s/g, ""),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setServerError(data.error ?? "Registration failed. Please try again.");
        return;
      }
      // Show email verification pending screen
      setRegisteredEmail(form.email);
    } finally {
      setLoading(false);
    }
  }

  // ── Email Verification Pending Screen ────────────────────
  if (registeredEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#0B0F19] px-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-900/50">
              <ShieldCheck className="h-7 w-7 text-white" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Suraksha</p>
            <h1 className="mt-1 text-3xl font-extrabold text-slate-900 dark:text-white">Check your email</h1>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] shadow-xl shadow-black/20 px-8 py-10">
            {/* Animated mail icon */}
            <div className="mb-6 flex justify-center">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/10">
                <Mail className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                <span className="absolute top-1 right-1 flex h-5 w-5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-5 w-5 rounded-full bg-emerald-500 items-center justify-center">
                    <CheckCircle2 className="h-3 w-3 text-white" />
                  </span>
                </span>
              </div>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Account created successfully!</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                We sent a verification link to:
              </p>
              <p className="mt-1 rounded-lg bg-slate-100 dark:bg-[#0B0F19] border border-slate-200 dark:border-[#2A303C] px-4 py-2 font-mono text-sm font-semibold text-slate-900 dark:text-white">
                {registeredEmail}
              </p>
            </div>

            <div className="mb-6 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300">
              <p className="font-semibold mb-1">📧 Next steps:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Open your email inbox</li>
                <li>Find the email from Suraksha</li>
                <li>Click <strong>"Confirm your email"</strong></li>
                <li>Come back and sign in</li>
              </ol>
            </div>

            <Link
              href="/login/user"
              className="block w-full rounded-xl bg-emerald-600 py-3 text-center text-sm font-bold text-white shadow-md shadow-emerald-900/30 transition hover:bg-emerald-700"
            >
              Go to Sign In →
            </Link>

            <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
              Didn&apos;t receive it? Check your spam folder or{" "}
              <button
                type="button"
                onClick={async () => {
                  await fetch("/api/auth/resend-verification", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: registeredEmail }),
                  });
                  alert("Verification email resent! Please check your inbox.");
                }}
                className="font-semibold text-emerald-600 hover:underline"
              >
                resend it
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] py-10 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-900/50">
            <ShieldAlert className="h-7 w-7 text-slate-900 dark:text-white" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Suraksha</p>
          <h1 className="mt-1 text-3xl font-extrabold text-slate-900 dark:text-white">Create your account</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Register to access personal safety tools, SOS, and emergency features.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="overflow-hidden rounded-2xl border border-slate-200 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] shadow-xl shadow-black/20"
        >
          {/* Personal Information */}
          <div className="border-b border-slate-200 dark:border-[#2A303C] bg-slate-50 dark:bg-[#0B0F19] px-6 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Personal Information</p>
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
                <div className="relative mt-0.5 flex">
                  <span className="flex items-center rounded-l-lg border border-r-0 border-slate-200 dark:border-[#2A303C] bg-slate-100 dark:bg-[#1A2234] px-3 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400">
                    +91
                  </span>
                  <input
                    name="phone"
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={form.phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setForm((prev) => ({ ...prev, phone: val }));
                      if (fieldErrors.phone) {
                        setFieldErrors((prev) => { const n = { ...prev }; delete n.phone; return n; });
                      }
                    }}
                    className={inputClass("phone").replace("mt-0.5 ", "").replace("rounded-lg", "rounded-r-lg rounded-l-none")}
                  />
                </div>
              </FormField>
              <FormField label="Alternative Phone Number" required icon={Phone} error={fieldErrors.alternativePhone}>
                <div className="relative mt-0.5 flex">
                  <span className="flex items-center rounded-l-lg border border-r-0 border-slate-200 dark:border-[#2A303C] bg-slate-100 dark:bg-[#1A2234] px-3 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400">
                    +91
                  </span>
                  <input
                    name="alternativePhone"
                    type="tel"
                    required
                    placeholder="8765432109"
                    value={form.alternativePhone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setForm((prev) => ({ ...prev, alternativePhone: val }));
                      if (fieldErrors.alternativePhone) {
                        setFieldErrors((prev) => { const n = { ...prev }; delete n.alternativePhone; return n; });
                      }
                    }}
                    className={inputClass("alternativePhone").replace("mt-0.5 ", "").replace("rounded-lg", "rounded-r-lg rounded-l-none")}
                  />
                </div>
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
          <div className="border-y border-slate-200 dark:border-[#2A303C] bg-blue-50 px-6 py-3">
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
                    onChange={(e) => {
                      handleChange(e);
                      setForm((prev) => ({ ...prev, aadhaarNumber: "" }));
                    }}
                    className={inputClass("citizenship") + " appearance-none pr-10"}
                  >
                    <option value="Indian Citizen">Indian Citizen</option>
                    <option value="Foreign Citizen">Foreign Citizen</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
                </div>
              </FormField>
              <FormField 
                label={form.citizenship === "Foreign Citizen" ? "Passport Number" : "Aadhaar Card Number"} 
                required 
                icon={CreditCard} 
                error={fieldErrors.aadhaarNumber}
              >
                <input
                  name="aadhaarNumber"
                  type="text"
                  required
                  placeholder={form.citizenship === "Foreign Citizen" ? "A12345678" : "1234 5678 9012"}
                  value={form.aadhaarNumber}
                  onChange={(e) => {
                    const isForeign = form.citizenship === "Foreign Citizen";
                    let val = e.target.value;
                    if (!isForeign) {
                      val = val.replace(/\D/g, "").slice(0, 12);
                      val = val.replace(/(\d{4})/g, "$1 ").trim();
                    } else {
                      val = val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15);
                    }
                    setForm((prev) => ({ ...prev, aadhaarNumber: val }));
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
          <div className="border-y border-slate-200 dark:border-[#2A303C] bg-red-50 px-6 py-3">
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
                <div className="relative mt-0.5 flex">
                  <span className="flex items-center rounded-l-lg border border-r-0 border-slate-200 dark:border-[#2A303C] bg-slate-100 dark:bg-[#1A2234] px-3 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400">
                    +91
                  </span>
                  <input
                    name="emergencyContactPhone"
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={form.emergencyContactPhone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setForm((prev) => ({ ...prev, emergencyContactPhone: val }));
                      if (fieldErrors.emergencyContactPhone) {
                        setFieldErrors((prev) => { const n = { ...prev }; delete n.emergencyContactPhone; return n; });
                      }
                    }}
                    className={inputClass("emergencyContactPhone").replace("mt-0.5 ", "").replace("rounded-lg", "rounded-r-lg rounded-l-none")}
                  />
                </div>
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
          <div className="border-y border-slate-200 dark:border-[#2A303C] bg-slate-50 dark:bg-[#0B0F19] px-6 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Security</p>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrength password={form.password} />
            </FormField>
          </div>

          {/* Consent & Permissions */}
          <div className="border-t border-slate-200 dark:border-[#2A303C] px-6 py-6">
            <p className="mb-4 text-sm font-bold text-slate-900 dark:text-white">Consent & Permissions</p>
            <div className="flex flex-col gap-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="consentLocation"
                  required
                  checked={form.consentLocation}
                  onChange={(e) => setForm(prev => ({ ...prev, consentLocation: e.target.checked }))}
                  className="mt-1 h-4 w-4 rounded border-slate-200 dark:border-[#2A303C] text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
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
                  className="mt-1 h-4 w-4 rounded border-slate-200 dark:border-[#2A303C] text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                  I consent to storing my credentials securely for verification and data protection
                </span>
              </label>
              {fieldErrors.consentCredentials && <p className="text-xs text-red-600 ml-7">{fieldErrors.consentCredentials}</p>}
            </div>
          </div>

          {/* Submit */}
          <div className="border-t border-slate-200 dark:border-[#2A303C] bg-slate-50 dark:bg-[#0B0F19] px-6 py-5">
            {serverError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                <XCircle className="h-4 w-4 shrink-0" />
                {serverError}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-md shadow-emerald-900/50 transition hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>
            <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
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
