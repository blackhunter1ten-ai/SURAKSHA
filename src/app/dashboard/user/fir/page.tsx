"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Upload,
  X,
  Loader2,
  MapPin,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  Film,
  File,
  StickyNote,
} from "lucide-react";

/* ─── Types ─── */
type Profile = {
  name: string;
  phone: string | null;
  email: string;
};

type EvidenceFile = {
  file: File;
  preview: string | null; // data URL for images/video thumbnails
  note: string;
};

/* ─── Severity auto-mapping ─── */
const SEVERITY_MAP: Record<string, string> = {
  ASSAULT: "CRITICAL",
  ROBBERY: "CRITICAL",
  HARASSMENT: "HIGH",
  THEFT: "MEDIUM",
  CYBERCRIME: "MEDIUM",
  OTHER: "LOW",
};

const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB

export default function IncidentReportPage() {
  const router = useRouter();

  // States
  const [step, setStep] = useState<"form" | "success">("form");
  const [firNumber, setFirNumber] = useState("");

  // Profile auto-fill
  const [profileLoading, setProfileLoading] = useState(true);
  const [complainantName, setComplainantName] = useState("");
  const [complainantContact, setComplainantContact] = useState("");

  // Form fields
  const [incidentType, setIncidentType] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [accusedDetails, setAccusedDetails] = useState("");

  // Evidence (COMPULSORY)
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [evidenceNotes, setEvidenceNotes] = useState("");

  // Refs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Submission
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ── Auto-fill profile (name + contact) ───────────────────────
  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setComplainantName(data.user.name || "");
          setComplainantContact(data.user.phone || data.user.email || "");
        }
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, []);

  // ── Auto-fill date/time to current ───────────────────────────
  useEffect(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    setDate(`${yyyy}-${mm}-${dd}`);
    setTime(`${hh}:${min}`);
  }, []);

  // ── Auto-fill GPS coordinates ────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setLocation(`${lat}, ${lng}`);
        setLocationLoading(false);
      },
      () => {
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // ── Evidence helpers ─────────────────────────────────────────
  function addFiles(files: FileList | null) {
    if (!files) return;
    const newFiles: EvidenceFile[] = [];
    const currentSize = evidenceFiles.reduce((s, e) => s + e.file.size, 0);
    let addedSize = 0;

    for (const file of Array.from(files)) {
      if (currentSize + addedSize + file.size > MAX_TOTAL_SIZE) {
        setErr(`Total evidence size exceeds 50MB limit. File "${file.name}" skipped.`);
        continue;
      }

      let preview: string | null = null;
      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        preview = URL.createObjectURL(file);
      }
      newFiles.push({ file, preview, note: "" });
      addedSize += file.size;
    }

    setEvidenceFiles((prev) => [...prev, ...newFiles]);
  }

  function removeEvidence(index: number) {
    setEvidenceFiles((prev) => {
      const removed = prev[index];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  function updateEvidenceNote(index: number, note: string) {
    setEvidenceFiles((prev) =>
      prev.map((e, i) => (i === index ? { ...e, note } : e))
    );
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getFileIcon(type: string) {
    if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
    if (type.startsWith("video/")) return <Film className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  }

  const totalEvidenceSize = evidenceFiles.reduce((s, e) => s + e.file.size, 0);

  // ── Submit ───────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    // Validations
    if (!complainantName || !incidentType || !date || !time || !location || description.length < 20) {
      setErr("Please fill all required fields (description min 20 chars).");
      return;
    }
    if (evidenceFiles.length === 0) {
      setErr("⚠️ Digital evidence is COMPULSORY. Please upload at least one photo, video, or document as proof.");
      return;
    }

    const formData = new FormData();
    formData.append("complainantName", complainantName);
    formData.append("complainantContact", complainantContact);
    formData.append("incidentType", incidentType);
    formData.append("incidentDate", date);
    formData.append("incidentTime", time);
    formData.append("location", location);
    formData.append("description", description);
    formData.append("accusedDetails", accusedDetails);
    formData.append("severity", SEVERITY_MAP[incidentType] || "MEDIUM");
    formData.append("evidenceNotes", evidenceNotes);
    evidenceFiles.forEach((ef) => formData.append("evidence", ef.file));

    // Include per-file notes as JSON
    const fileNotes = evidenceFiles.map((ef) => ef.note).filter(Boolean);
    if (fileNotes.length > 0) {
      formData.append("fileNotes", JSON.stringify(fileNotes));
    }

    setLoading(true);

    try {
      const res = await fetch("/api/user/fir", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit report");
      }

      if (data.success && data.firNumber) {
        setStep("success");
        setFirNumber(data.firNumber);
      } else {
        throw new Error("No report number returned");
      }
    } catch (err: any) {
      setErr(err.message || "Failed to submit report.");
    } finally {
      setLoading(false);
    }
  }

  // ── Styles ───────────────────────────────────────────────────
  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:focus:border-amber-400 dark:focus:ring-amber-400 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition";
  const labelClass = "text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300";
  const readOnlyClass =
    "mt-1 w-full rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-900/10 px-3 py-2.5 text-sm text-slate-900 dark:text-white cursor-not-allowed transition";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 lg:py-14">
      <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
        File Incident Report
      </h1>
      <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
        Report safety incidents with eyewitness evidence. Your identity is auto-verified from your account.
      </p>

      {step === "success" ? (
        <div className="mt-8 flex flex-col items-center justify-center space-y-6 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-900/10 p-10 text-center shadow-sm dark:shadow-2xl transition-all">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Report Submitted Successfully
          </h2>
          <p className="text-base font-medium text-slate-600 dark:text-slate-400 max-w-md">
            Your incident report has been submitted and is now under admin review. Your reference number is:
          </p>
          <div className="inline-block rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-white dark:bg-slate-900 px-6 py-3 font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400 shadow-sm">
            {firNumber}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-lg">
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            You'll be notified when admin reviews your report
          </div>
          <button
            type="button"
            onClick={() => router.push("/dashboard/user")}
            className="mt-4 w-full max-w-xs rounded-xl bg-slate-900 dark:bg-white py-3 text-sm font-bold uppercase tracking-widest text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition"
          >
            ← Back to Dashboard
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 p-6 sm:p-8 shadow-sm dark:shadow-2xl dark:backdrop-blur transition-all"
        >
          {/* ── Complainant Details (Auto-filled) ─── */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-white/5 pb-2 flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Reporter Details (Auto-Verified)
            </h3>

            {profileLoading ? (
              <div className="flex items-center gap-3 py-4">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                <span className="text-sm text-slate-500 dark:text-slate-400">Loading your profile...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Your Name *</label>
                  <input
                    readOnly
                    value={complainantName}
                    className={readOnlyClass}
                  />
                  <p className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Auto-filled from your account
                  </p>
                </div>
                <div>
                  <label className={labelClass}>Contact *</label>
                  <input
                    readOnly
                    value={complainantContact}
                    className={readOnlyClass}
                  />
                  <p className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Auto-filled from your account
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Incident Parameters ─── */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-white/5 pb-2">
              Incident Parameters
            </h3>

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
              {incidentType && (
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider">
                  <span className={`px-2 py-0.5 rounded border ${
                    SEVERITY_MAP[incidentType] === "CRITICAL"
                      ? "text-red-500 bg-red-500/10 border-red-500/30"
                      : SEVERITY_MAP[incidentType] === "HIGH"
                        ? "text-orange-500 bg-orange-500/10 border-orange-500/30"
                        : "text-amber-500 bg-amber-500/10 border-amber-500/30"
                  }`}>
                    Severity: {SEVERITY_MAP[incidentType]}
                  </span>
                </p>
              )}
            </div>

            {/* Date & Time — auto-populated, editable */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  Date *
                  <span className="text-[10px] font-medium text-emerald-500 ml-2 normal-case">(auto-set)</span>
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`${inputClass} dark:[color-scheme:dark]`}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Time *
                  <span className="text-[10px] font-medium text-emerald-500 ml-2 normal-case">(auto-set)</span>
                </label>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className={`${inputClass} dark:[color-scheme:dark]`}
                />
              </div>
            </div>

            {/* Location — auto-filled GPS */}
            <div>
              <label className={labelClass}>
                Location Coordinates *
                {locationLoading && (
                  <span className="text-[10px] font-medium text-cyan-500 ml-2 normal-case flex items-center gap-1 inline-flex">
                    <Loader2 className="h-3 w-3 animate-spin" /> Acquiring GPS...
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Latitude, Longitude (auto-detected)"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={inputClass}
                />
                <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-500" />
              </div>
              {location && !locationLoading && (
                <p className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> GPS coordinates auto-captured (editable for manual override)
                </p>
              )}
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

          {/* ── Digital Evidence (COMPULSORY) ─── */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-red-500 border-b border-red-500/20 pb-2 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5" />
              Digital Evidence (Compulsory — Max 50MB)
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
              ⚠️ Eyewitness evidence is <strong>mandatory</strong>. Your report cannot be submitted without at least one photo, video, or document as proof.
            </p>

            {/* Dual Upload Buttons */}
            <div className="grid grid-cols-2 gap-3">
              {/* Camera Capture */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 hover:border-cyan-500/50 px-4 py-5 transition group"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 group-hover:bg-cyan-500/20 transition">
                  <Camera className="h-6 w-6 text-cyan-500" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                  Open Camera
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Capture new proof
                </span>
              </button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*,video/*"
                capture="environment"
                multiple
                onChange={(e) => addFiles(e.target.files)}
                className="hidden"
              />

              {/* Gallery / File Select */}
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/50 px-4 py-5 transition group"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 group-hover:bg-amber-500/20 transition">
                  <Upload className="h-6 w-6 text-amber-500" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Select from Gallery
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Choose existing files
                </span>
              </button>
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*,video/*,.pdf,.doc,.docx"
                multiple
                onChange={(e) => addFiles(e.target.files)}
                className="hidden"
              />
            </div>

            {/* Evidence Preview Grid */}
            {evidenceFiles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {evidenceFiles.length} file{evidenceFiles.length > 1 ? "s" : ""} selected
                  </p>
                  <p className={`text-xs font-mono font-bold ${totalEvidenceSize > MAX_TOTAL_SIZE * 0.8 ? "text-red-500" : "text-slate-500 dark:text-slate-400"}`}>
                    {formatFileSize(totalEvidenceSize)} / 50MB
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {evidenceFiles.map((ef, i) => (
                    <div
                      key={i}
                      className="relative rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/50 overflow-hidden group"
                    >
                      {/* Preview */}
                      {ef.preview && ef.file.type.startsWith("image/") ? (
                        <img
                          src={ef.preview}
                          alt={ef.file.name}
                          className="h-28 w-full object-cover"
                        />
                      ) : ef.preview && ef.file.type.startsWith("video/") ? (
                        <video
                          src={ef.preview}
                          className="h-28 w-full object-cover"
                          muted
                        />
                      ) : (
                        <div className="h-28 w-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800">
                          {getFileIcon(ef.file.type)}
                          <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">
                            {ef.file.name.split(".").pop()}
                          </p>
                        </div>
                      )}

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => removeEvidence(i)}
                        className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>

                      {/* File info */}
                      <div className="p-2">
                        <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                          {ef.file.name}
                        </p>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400 font-mono">
                          {formatFileSize(ef.file.size)}
                        </p>
                        {/* Per-file note */}
                        <input
                          type="text"
                          placeholder="Add note..."
                          value={ef.note}
                          onChange={(e) => updateEvidenceNote(i, e.target.value)}
                          className="mt-1.5 w-full rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-2 py-1 text-[10px] text-slate-700 dark:text-slate-300 outline-none focus:border-amber-400 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overall Evidence Notes */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <StickyNote className="h-3.5 w-3.5" />
                Eyewitness Notes (optional)
              </label>
              <textarea
                placeholder="Describe what is shown in the evidence, context, when it was captured..."
                value={evidenceNotes}
                onChange={(e) => setEvidenceNotes(e.target.value)}
                rows={2}
                className={`${inputClass} resize-y`}
              />
            </div>
          </div>

          {/* Error */}
          {err && (
            <p
              className="text-sm rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 px-3 py-2 font-semibold text-red-600 dark:text-red-400"
              role="alert"
            >
              {err}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-amber-500 dark:bg-amber-500/20 dark:border dark:border-amber-500/50 py-3.5 text-sm font-bold uppercase tracking-widest text-white dark:text-amber-400 hover:bg-amber-600 dark:hover:bg-amber-500/30 disabled:opacity-50 transition shadow-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Transmitting Report...
              </span>
            ) : (
              "Submit Incident Report"
            )}
          </button>
        </form>
      )}
    </div>
  );
}