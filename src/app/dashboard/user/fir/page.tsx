"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FirPage() {
  const router = useRouter();

  const [step, setStep] = useState<'form' | 'success'>('form');
  const [firNumber, setFirNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [signatureChecked, setSignatureChecked] = useState(false);
  const [verifyErr, setVerifyErr] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [complainantName, setComplainantName] = useState('');
  const [complainantAddress, setComplainantAddress] = useState('');
  const [complainantContact, setComplainantContact] = useState('');
  const [incidentType, setIncidentType] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [accusedDetails, setAccusedDetails] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFIRSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
  
    if (!complainantName || !incidentType || !date || !time || !location || description.length < 20) {
      setErr("Please fill all required fields (description min 20 chars).");
      return;
    }
  
    const formData = new FormData();
    formData.append('complainantName', complainantName);
    formData.append('complainantAddress', complainantAddress);
    formData.append('complainantContact', complainantContact);
    formData.append('incidentType', incidentType);
    formData.append('incidentDate', date);
    formData.append('incidentTime', time);
    formData.append('location', location);
    formData.append('description', description);
    formData.append('accusedDetails', accusedDetails);
    evidenceFiles.forEach((file) => formData.append('evidence', file));

    setLoading(true);
  
    try {
      const res = await fetch("/api/user/fir", {
        method: "POST",
        body: formData,
      });
  
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit FIR");
      }
  
      if (data.success && data.firNumber) {
        setStep('success');
        setFirNumber(data.firNumber);
      } else {
        throw new Error("No FIR number returned");
      }
  
    } catch (err: any) {
      setErr(err.message || "Failed to submit FIR.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!otp || otp.length !== 6 || !signatureChecked) {
      setVerifyErr("Enter 6-digit OTP and confirm e-signature");
      return;
    }

    setVerifyErr(null);
    setVerifyLoading(true);

    try {
      const res = await fetch("/api/user/fir/verify", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firNumber,
          otp: Number(otp),
          signatureConfirmed: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }

      router.push(`/dashboard/user/fir/success?fir=${firNumber}`);
    } catch (err: any) {
      setVerifyErr(err.message || "Verification failed");
    } finally {
      setVerifyLoading(false);
    }
  }

  // Common input class
  const inputClass = "mt-1 w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:focus:border-amber-400 dark:focus:ring-amber-400 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition";
  const labelClass = "text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 lg:py-14">
      <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
        File FIR Complaint
      </h1>
      <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
        Provide accurate incident details. This will be securely submitted to authorities.
      </p>

      {step === 'success' ? (
        <div className="mt-8 flex flex-col items-center justify-center space-y-6 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-900/10 p-10 text-center shadow-sm dark:shadow-2xl transition-all">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            FIR Submitted Successfully
          </h2>
          <p className="text-base font-medium text-slate-600 dark:text-slate-400 max-w-md">
            Your complaint has been securely registered and officially processed. Your reference number is:
          </p>
          <div className="inline-block rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-white dark:bg-slate-900 px-6 py-3 font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400 shadow-sm">
            {firNumber}
          </div>
          <button
            type="button"
            onClick={() => router.push('/dashboard/user')}
            className="mt-4 w-full max-w-xs rounded-xl bg-slate-900 dark:bg-white py-3 text-sm font-bold uppercase tracking-widest text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition"
          >
            ← Back to Dashboard
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleFIRSubmit}
          className="mt-8 space-y-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 p-6 sm:p-8 shadow-sm dark:shadow-2xl dark:backdrop-blur transition-all"
        >
        {/* Complainant Details */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-white/5 pb-2">Complainant Protocol</h3>
          <div>
            <label className={labelClass}>Complainant Name *</label>
            <input
              required
              placeholder="Full legal name"
              value={complainantName}
              onChange={(e) => setComplainantName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Address (optional)</label>
              <input
                placeholder="Full address"
                value={complainantAddress}
                onChange={(e) => setComplainantAddress(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Contact (optional)</label>
              <input
                type="tel"
                placeholder="Phone or email"
                value={complainantContact}
                onChange={(e) => setComplainantContact(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Incident Type */}
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-white/5 pb-2">Incident Parameters</h3>
          <div>
            <label className={labelClass}>Incident Type *</label>
            <select
              required
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              className={inputClass}
            >
              <option value="" className="dark:bg-slate-900">Select categorization</option>
              <option value="THEFT" className="dark:bg-slate-900">Theft / Larceny</option>
              <option value="ASSAULT" className="dark:bg-slate-900">Physical Assault</option>
              <option value="CYBERCRIME" className="dark:bg-slate-900">Digital / Cybercrime</option>
              <option value="HARASSMENT" className="dark:bg-slate-900">Harassment</option>
              <option value="ROBBERY" className="dark:bg-slate-900">Armed Robbery</option>
              <option value="OTHER" className="dark:bg-slate-900">Other / Uncategorized</option>
            </select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`${inputClass} dark:[color-scheme:dark]`}
              />
            </div>
            <div>
              <label className={labelClass}>Time *</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={`${inputClass} dark:[color-scheme:dark]`}
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className={labelClass}>Location coordinates/Address *</label>
            <input
              type="text"
              required
              placeholder="Where did this occur?"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Chronological Description *</label>
            <textarea
              required
              minLength={20}
              placeholder="Provide a detailed account of the incident (minimum 20 characters)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputClass} min-h-[120px] resize-y`}
            />
          </div>

          {/* Accused */}
          <div>
            <label className={labelClass}>Accused Identifiers (optional)</label>
            <input
              type="text"
              placeholder="Name, appearance, or other identifiers"
              value={accusedDetails}
              onChange={(e) => setAccusedDetails(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* File Upload */}
        <div className="space-y-2 pt-2">
          <label className={labelClass}>Digital Evidence (optional)</label>
          <div className="mt-1 rounded-xl border border-dashed border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-slate-950/50 px-6 py-6 text-center">
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              onChange={(e) => {
                if (e.target.files) {
                  setEvidenceFiles(Array.from(e.target.files));
                }
              }}
              className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:rounded-full file:border-0 file:bg-amber-100 dark:file:bg-amber-500/20 file:px-4 file:py-2 file:text-sm file:font-bold file:text-amber-700 dark:file:text-amber-400 hover:file:bg-amber-200 dark:hover:file:bg-amber-500/30 file:transition cursor-pointer"
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">Attach images, documents, or logs (Max 5MB per file)</p>
          </div>
        </div>

        {err && (
          <p className="text-sm rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 px-3 py-2 font-semibold text-red-600 dark:text-red-400" role="alert">
            {err}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-amber-500 dark:bg-amber-500/20 dark:border dark:border-amber-500/50 py-3.5 text-sm font-bold uppercase tracking-widest text-white dark:text-amber-400 hover:bg-amber-600 dark:hover:bg-amber-500/30 disabled:opacity-50 transition shadow-sm"
        >
          {loading ? "Transmitting..." : "Initialize FIR Report"}
        </button>
      </form>
      )}
    </div>
  );
}