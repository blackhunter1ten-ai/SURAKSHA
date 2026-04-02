"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ExternalLink,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  Shield,
  Siren,
  X,
  Loader2,
  User,
} from "lucide-react";

/* ─── Emergency Siren Sound (Web Audio API) ─── */
let sirenContext: AudioContext | null = null;
let sirenOscillator: OscillatorNode | null = null;
let sirenGain: GainNode | null = null;
let sirenTimeout: ReturnType<typeof setTimeout> | null = null;

function playEmergencySiren(durationMs = 5000) {
  try {
    // Stop any existing siren
    stopEmergencySiren();

    sirenContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    sirenOscillator = sirenContext.createOscillator();
    sirenGain = sirenContext.createGain();

    // Create a siren waveform: oscillating frequency
    sirenOscillator.type = "sawtooth";
    sirenOscillator.frequency.setValueAtTime(800, sirenContext.currentTime);

    // Siren sweep: alternate between 800Hz and 1200Hz
    const sweepDuration = 0.5; // half-second per sweep
    const sweepCount = Math.ceil(durationMs / 1000 / sweepDuration) * 2;
    for (let i = 0; i < sweepCount; i++) {
      const time = sirenContext.currentTime + i * sweepDuration;
      if (i % 2 === 0) {
        sirenOscillator.frequency.linearRampToValueAtTime(1200, time + sweepDuration);
      } else {
        sirenOscillator.frequency.linearRampToValueAtTime(800, time + sweepDuration);
      }
    }

    // Volume envelope
    sirenGain.gain.setValueAtTime(0.3, sirenContext.currentTime);
    sirenGain.gain.linearRampToValueAtTime(0.3, sirenContext.currentTime + durationMs / 1000 - 0.5);
    sirenGain.gain.linearRampToValueAtTime(0, sirenContext.currentTime + durationMs / 1000);

    sirenOscillator.connect(sirenGain);
    sirenGain.connect(sirenContext.destination);
    sirenOscillator.start();

    // Auto-stop after duration
    sirenTimeout = setTimeout(() => {
      stopEmergencySiren();
    }, durationMs);
  } catch {
    // Audio not available — fail silently
  }
}

function stopEmergencySiren() {
  if (sirenTimeout) { clearTimeout(sirenTimeout); sirenTimeout = null; }
  if (sirenOscillator) { try { sirenOscillator.stop(); } catch {} sirenOscillator = null; }
  if (sirenGain) { sirenGain.disconnect(); sirenGain = null; }
  if (sirenContext) { sirenContext.close().catch(() => {}); sirenContext = null; }
}

/* ─── WhatsApp & SMS Helpers ─── */
function buildSosMessage(
  userName: string,
  lat?: number | null,
  lng?: number | null,
  address?: string | null,
  mapsLink?: string | null
) {
  let msg = `🚨 *EMERGENCY SOS — SURAKSHA*\n\n`;
  msg += `${userName} has triggered an emergency SOS alert and needs immediate help!\n\n`;
  if (lat != null && lng != null) {
    msg += `📍 *Location:* ${lat.toFixed(6)}, ${lng.toFixed(6)}\n`;
  }
  if (address) {
    msg += `🏠 *Address:* ${address}\n`;
  }
  if (mapsLink) {
    msg += `🗺️ *Google Maps:* ${mapsLink}\n`;
  }
  msg += `\n⏰ *Time:* ${new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "medium" })}\n`;
  msg += `\nPlease respond immediately or contact local authorities.`;
  return msg;
}

function getWhatsAppUrl(phone: string, message: string) {
  // Clean phone number: remove spaces, dashes, keep + prefix
  const cleaned = phone.replace(/[\s-()]/g, "");
  const intlPhone = cleaned.startsWith("+") ? cleaned.slice(1) : cleaned.startsWith("91") ? cleaned : `91${cleaned}`;
  // Use whatsapp:// protocol to open app directly (no browser intermediate)
  // Fallback to wa.me for web
  return `https://wa.me/${intlPhone}?text=${encodeURIComponent(message)}`;
}

function getWhatsAppDirectUrl(phone: string, message: string) {
  const cleaned = phone.replace(/[\s-()]/g, "");
  const intlPhone = cleaned.startsWith("+") ? cleaned.slice(1) : cleaned.startsWith("91") ? cleaned : `91${cleaned}`;
  // whatsapp:// scheme opens the desktop/mobile app directly and auto-fills the message
  return `whatsapp://send?phone=${intlPhone}&text=${encodeURIComponent(message)}`;
}

function getSmsUrl(phone: string, message: string) {
  return `sms:${phone}?body=${encodeURIComponent(message)}`;
}

/* ─── Types ─── */
type SosPhase = "idle" | "armed" | "dispatching" | "dispatched";

type EmergencyResult = {
  id: string;
  createdAt: string;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  address: string | null;
  locationUnavailable: boolean;
  mapsLink: string | null;
};

type ContactResult = {
  name: string | null;
  phone: string | null;
  relation: string | null;
  notified: boolean;
  contactUserId: string | null;
};

const steps = [
  { key: "panic", label: "Panic Button Activated", icon: AlertTriangle },
  { key: "loc", label: "Location Transmitted", icon: MapPin },
  { key: "auth", label: "Authorities Notified", icon: Phone },
  { key: "dispatch", label: "Emergency Response Dispatched", icon: Shield },
];

const COUNTDOWN_SECONDS = 3;

export default function EmergencyPage() {
  const [session, setSession] = useState<"unknown" | "in" | "out">("unknown");
  const [phase, setPhase] = useState<SosPhase>("idle");
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [hint, setHint] = useState<string | null>(null);

  // Dispatch results
  const [evId, setEvId] = useState<string | null>(null);
  const [stepState, setStepState] = useState<string[] | null>(null);
  const [emergencyResult, setEmergencyResult] = useState<EmergencyResult | null>(null);
  const [contactResult, setContactResult] = useState<ContactResult | null>(null);
  const [reverseAddress, setReverseAddress] = useState<string | null>(null);

  // False trigger log
  const [falseTriggers, setFalseTriggers] = useState(0);

  // Refs for timer cleanup
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingDispatch = useRef(false);

  // Check session
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        if (d.user?.role === "TOURIST") setSession("in");
        else setSession("out");
      })
      .catch(() => setSession("out"));
  }, []);

  // Poll step progression when dispatched
  useEffect(() => {
    if (!evId) return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/emergency/${evId}`);
      if (!r.ok) return;
      const d = await r.json();
      setStepState(d.steps ?? []);
    }, 800);
    return () => clearInterval(t);
  }, [evId]);

  // Reverse geocode (best-effort, non-blocking)
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { "User-Agent": "SURAKSHA-Safety-App" } }
      );
      const data = await res.json();
      if (data?.display_name) {
        setReverseAddress(data.display_name);
      }
    } catch {
      // Non-blocking: silently fail
    }
  }, []);

  // ─── ARMED: Start 3-second countdown ───
  function enterArmedState() {
    if (phase !== "idle") return;
    setPhase("armed");
    setCountdown(COUNTDOWN_SECONDS);
    setHint(null);
    pendingDispatch.current = true;

    // 🔊 Play emergency siren during countdown (5 seconds)
    playEmergencySiren(5000);

    let remaining = COUNTDOWN_SECONDS;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = null;
        if (pendingDispatch.current) {
          triggerDispatch();
        }
      }
    }, 1000);
  }

  // ─── CANCEL: Abort during grace window ───
  function cancelSos() {
    pendingDispatch.current = false;
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    // 🔇 Stop the siren on cancel
    stopEmergencySiren();
    setPhase("idle");
    setCountdown(COUNTDOWN_SECONDS);
    // Log false trigger locally for analytics
    setFalseTriggers((f) => f + 1);
    console.log("[SOS] False trigger logged locally:", new Date().toISOString());
  }

  // ─── DISPATCH: Capture coordinates & send ───
  async function triggerDispatch() {
    setPhase("dispatching");

    let lat: number | undefined;
    let lng: number | undefined;
    let accuracy: number | undefined;
    let locationUnavailable = false;

    // Phase 2: Coordinate Capture
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 0,
          });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        accuracy = pos.coords.accuracy;
      } catch {
        // GPS failed — flag as unavailable but proceed
        locationUnavailable = true;
      }
    } else {
      locationUnavailable = true;
    }

    // Fire reverse geocode (non-blocking)
    if (lat != null && lng != null) {
      reverseGeocode(lat, lng);
    }

    // Dispatch to server — never block on location
    try {
      const res = await fetch("/api/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat,
          lng,
          accuracy,
          address: reverseAddress ?? undefined,
          locationUnavailable,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setHint(
          data.error === "Tourist login required"
            ? "Please log in as a tourist (User login) to trigger a live SOS with your account."
            : data.error ?? "Request failed"
        );
        setPhase("idle");
        return;
      }

      setEvId(data.emergency?.id ?? null);
      setEmergencyResult(data.emergency ?? null);
      setContactResult(data.emergencyContact ?? null);
      setStepState(["pending", "pending", "pending", "pending"]);
      setPhase("dispatched");

      // ─── AUTO-SEND WHATSAPP MESSAGE (direct app open) ───
      const contact = data.emergencyContact;
      if (contact?.phone) {
        const emergencyMsg = buildSosMessage(
          data.emergency?.userName || "A registered tourist",
          data.emergency?.lat,
          data.emergency?.lng,
          reverseAddress ?? data.emergency?.address,
          data.emergency?.mapsLink
        );
        // Try direct WhatsApp app protocol first (opens app directly, skips browser)
        const directUrl = getWhatsAppDirectUrl(contact.phone, emergencyMsg);
        const fallbackUrl = getWhatsAppUrl(contact.phone, emergencyMsg);
        
        // Use location.href for direct app protocol — no popup blocker issues
        try {
          const iframe = document.createElement("iframe");
          iframe.style.display = "none";
          iframe.src = directUrl;
          document.body.appendChild(iframe);
          // Fallback: if app protocol doesn't work, open wa.me after 1.5s
          setTimeout(() => {
            document.body.removeChild(iframe);
            window.open(fallbackUrl, "_blank", "noopener,noreferrer");
          }, 1500);
        } catch {
          // Final fallback
          window.open(fallbackUrl, "_blank", "noopener,noreferrer");
        }
      }

      // ─── NOTIFY ALL ADMIN USERS ───
      try {
        await fetch("/api/emergency/notify-admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emergencyId: data.emergency?.id }),
        });
      } catch {
        // Non-blocking: admin notification is best-effort
      }

      // Request browser notification permission + fire notification
      if (typeof Notification !== "undefined" && Notification.permission !== "denied") {
        try {
          const perm = await Notification.requestPermission();
          if (perm === "granted") {
            new Notification("🚨 SOS Dispatched — SURAKSHA", {
              body: `Emergency alert sent. ${contact?.notified ? `${contact.name} notified.` : "Emergency contact will be notified."}`,
              icon: "/favicon.ico",
              tag: "sos-dispatch",
            });
          }
        } catch {
          // Notification API not available
        }
      }
    } catch {
      setHint("Network error — SOS will be retried when connectivity is restored.");
      // Retry mechanism: store in localStorage for future dispatch
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(
          "pendingSOS",
          JSON.stringify({ lat, lng, accuracy, locationUnavailable, timestamp: Date.now() })
        );
      }
      setPhase("idle");
    }
  }

  // Check for pending SOS on mount (connectivity restored scenario)
  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    const pending = localStorage.getItem("pendingSOS");
    if (pending && session === "in") {
      const data = JSON.parse(pending);
      // Only retry if less than 30 minutes old
      if (Date.now() - data.timestamp < 30 * 60 * 1000) {
        setHint("Retrying previous SOS dispatch...");
        fetch("/api/emergency", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: pending,
        })
          .then((r) => r.json())
          .then((d) => {
            if (d.ok) {
              localStorage.removeItem("pendingSOS");
              setEvId(d.emergency?.id ?? null);
              setEmergencyResult(d.emergency ?? null);
              setContactResult(d.emergencyContact ?? null);
              setStepState(["pending", "pending", "pending", "pending"]);
              setPhase("dispatched");
              setHint(null);
            }
          })
          .catch(() => {});
      } else {
        localStorage.removeItem("pendingSOS");
      }
    }
  }, [session]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 text-center relative">
      {/* ─── ARMED STATE OVERLAY ─── */}
      {phase === "armed" && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm">
          {/* Countdown Circle */}
          <div className="relative mb-10">
            <svg
              width="200"
              height="200"
              viewBox="0 0 100 100"
              className="transform -rotate-90"
            >
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="rgba(239, 68, 68, 0.15)"
                strokeWidth="6"
              />
              {/* Animated sweep circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#ef4444"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="283"
                style={{
                  animation: `countdown-sweep ${COUNTDOWN_SECONDS}s linear forwards`,
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-7xl font-black text-red-500 tabular-nums animate-breathe">
                {countdown}
              </span>
            </div>
          </div>

          <p className="text-xl font-bold text-white/90 mb-2 tracking-wide">
            SOS ARMED — DISPATCHING IN {countdown}s
          </p>
          <p className="text-sm text-white/50 mb-10 max-w-sm">
            Press CANCEL now to abort. No notification will be sent.
          </p>

          {/* CANCEL BUTTON — dominant action */}
          <button
            type="button"
            onClick={cancelSos}
            className="animate-cancel-glow rounded-2xl bg-emerald-600 px-16 py-5 text-2xl font-black uppercase tracking-widest text-white transition-all hover:bg-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-400/50 active:scale-95"
          >
            <X className="inline h-7 w-7 mr-2 -mt-1" />
            CANCEL
          </button>

          <p className="mt-6 text-xs text-white/30">
            {falseTriggers > 0
              ? `${falseTriggers} false trigger${falseTriggers > 1 ? "s" : ""} logged this session`
              : "Accidental press? No penalty for cancelling."}
          </p>
        </div>
      )}

      {/* ─── MAIN CONTENT ─── */}
      <p className="text-xs font-semibold uppercase text-red-600 tracking-widest">
        Emergency Response System
      </p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
        Emergency Panic Button System
      </h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-md mx-auto">
        Instant emergency response with a 3-second safety window. Your
        location is captured and emergency contacts are notified immediately.
      </p>

      {session === "out" && (
        <p className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 px-3 py-2 text-sm text-amber-900 dark:text-amber-300">
          Tip: sign in via <strong>Login → Tourist</strong> to record SOS against
          your profile and notify the authority feed.
        </p>
      )}

      {/* ─── SOS BUTTON ─── */}
      <div className="relative mx-auto mt-10 mb-4">
        {/* Outer pulse rings (only in idle) */}
        {phase === "idle" && (
          <>
            <div className="absolute inset-0 m-auto h-44 w-44 rounded-full animate-sos-pulse-outer" />
            <div className="absolute inset-0 m-auto h-44 w-44 rounded-full animate-sos-pulse" />
          </>
        )}

        <button
          type="button"
          onClick={enterArmedState}
          disabled={phase !== "idle"}
          className={`relative mx-auto flex h-44 w-44 flex-col items-center justify-center rounded-full text-white shadow-xl ring-4 transition-all duration-300 ${
            phase === "idle"
              ? "bg-red-600 ring-red-200 dark:ring-red-900/50 hover:bg-red-700 hover:scale-105 cursor-pointer"
              : phase === "dispatching"
                ? "bg-red-500 ring-red-300 opacity-80 cursor-wait"
                : "bg-red-800 ring-red-600/30 cursor-default"
          }`}
        >
          {phase === "dispatching" ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin" />
              <span className="mt-2 text-sm font-black tracking-wider">
                DISPATCHING...
              </span>
            </>
          ) : phase === "dispatched" ? (
            <>
              <CheckCircle2 className="h-10 w-10" />
              <span className="mt-2 text-sm font-black tracking-wider">
                DISPATCHED
              </span>
            </>
          ) : (
            <>
              <Siren className="h-10 w-10" />
              <span className="mt-2 text-lg font-black tracking-wider">
                PANIC
              </span>
            </>
          )}
        </button>
      </div>

      {phase === "idle" && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Press and hold for emergency. A 3-second cancel window will appear.
        </p>
      )}

      {/* ─── Error / Hint ─── */}
      {hint && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400 animate-slide-up bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl px-4 py-3" role="alert">
          {hint}
        </p>
      )}

      {/* ─── DISPATCH RESULTS ─── */}
      {phase === "dispatched" && emergencyResult && (
        <div className="mt-8 space-y-4 animate-slide-up">
          {/* Location / Map Card */}
          <div className="rounded-2xl border border-red-500/30 bg-white dark:bg-[#131B2B] p-5 text-left animate-dispatch-border shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-red-500" />
              <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Location Data
              </span>
              {emergencyResult.locationUnavailable && (
                <span className="ml-auto rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-500 uppercase">
                  GPS Unavailable
                </span>
              )}
            </div>

            {emergencyResult.lat != null && emergencyResult.lng != null ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                    Coordinates
                  </span>
                  <span className="font-mono text-sm text-cyan-500">
                    {emergencyResult.lat.toFixed(6)}, {emergencyResult.lng.toFixed(6)}
                  </span>
                </div>

                {emergencyResult.accuracy != null && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                      Accuracy
                    </span>
                    <span className="font-mono text-sm text-slate-300">
                      ±{Math.round(emergencyResult.accuracy)}m
                    </span>
                  </div>
                )}

                {(reverseAddress || emergencyResult.address) && (
                  <div className="flex flex-col gap-1 border-t border-slate-200 dark:border-[#2A303C] pt-3">
                    <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                      Address
                    </span>
                    <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {reverseAddress || emergencyResult.address}
                    </span>
                  </div>
                )}

                {emergencyResult.mapsLink && (
                  <a
                    href={emergencyResult.mapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 px-5 py-2.5 text-sm font-bold text-red-500 hover:bg-red-500/20 transition mt-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open in Google Maps
                  </a>
                )}
              </div>
            ) : (
              <p className="text-sm text-amber-500 italic">
                Location coordinates unavailable. Alert dispatched without GPS data — emergency contacts have been notified.
              </p>
            )}
          </div>

          {/* Emergency Contact Card */}
          {contactResult && (
            <div className="rounded-2xl border border-slate-200 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] p-5 text-left shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Notification Dispatch
                </span>
              </div>

              {contactResult.name && contactResult.phone ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <User className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {contactResult.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {contactResult.relation} · {contactResult.phone}
                      </p>
                    </div>
                    {contactResult.notified && (
                      <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-500 uppercase">
                        <CheckCircle2 className="h-3 w-3" />
                        In-App Notified
                      </span>
                    )}
                  </div>

                  {/* WhatsApp & SMS Send Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 border-t border-slate-200 dark:border-[#2A303C] pt-4">
                    <a
                      href={getWhatsAppUrl(
                        contactResult.phone,
                        buildSosMessage(
                          "Your emergency contact",
                          emergencyResult?.lat,
                          emergencyResult?.lng,
                          reverseAddress ?? emergencyResult?.address,
                          emergencyResult?.mapsLink
                        )
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition-all hover:shadow-lg active:scale-95"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Send WhatsApp
                    </a>
                    <a
                      href={getSmsUrl(
                        contactResult.phone,
                        buildSosMessage(
                          "Your emergency contact",
                          emergencyResult?.lat,
                          emergencyResult?.lng,
                          reverseAddress ?? emergencyResult?.address,
                          emergencyResult?.mapsLink
                        ).replace(/\*/g, "") // strip markdown bold for SMS
                      )}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-3 text-sm font-bold text-white transition-all hover:shadow-lg active:scale-95"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Send SMS
                    </a>
                    <a
                      href={`tel:${contactResult.phone}`}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 px-4 py-3 text-sm font-bold text-white transition-all hover:shadow-lg active:scale-95"
                    >
                      <Phone className="h-4 w-4" />
                      Call
                    </a>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
                    WhatsApp was auto-opened on dispatch. Use buttons above to resend.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-amber-500 italic">
                  No emergency contact configured. Go to your profile to add one.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Step Progression ─── */}
      <div className="mt-10 space-y-3 text-left">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          const st = stepState?.[idx];
          const done = st === "complete";
          return (
            <div
              key={s.key}
              className={`flex items-center justify-between rounded-xl border bg-white dark:bg-[#131B2B] px-4 py-3 shadow-sm transition-all duration-500 ${
                done
                  ? "border-emerald-500/30 dark:border-emerald-500/20"
                  : "border-slate-200 dark:border-[#2A303C]"
              } ${stepState ? "animate-slide-up" : ""}`}
              style={stepState ? { animationDelay: `${idx * 120}ms` } : undefined}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition-all duration-500 ${
                    done
                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-[#2A303C]"
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    idx + 1
                  )}
                </span>
                <Icon
                  className={`h-5 w-5 transition-all duration-500 ${
                    done ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
                  }`}
                />
                <span
                  className={`text-sm font-medium transition-all duration-500 ${
                    done ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold transition-all duration-500 ${
                  done
                    ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2A303C]"
                }`}
              >
                {done ? "Complete" : "Pending"}
              </span>
            </div>
          );
        })}
      </div>

      {/* ─── Timestamp ─── */}
      {emergencyResult && (
        <p className="mt-6 text-xs text-slate-400 dark:text-slate-500 font-mono">
          Event ID: {emergencyResult.id} · Dispatched:{" "}
          {new Date(emergencyResult.createdAt).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "medium",
          })}
        </p>
      )}
    </div>
  );
}
