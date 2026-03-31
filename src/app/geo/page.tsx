"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Loader2, Navigation, AlertTriangle, Crosshair, MapPin, Search, Shield, X, Volume2, Bell, Phone } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { ThreatMarker } from "@/lib/threat-engine";

const SatelliteMap = dynamic(() => import("@/components/maps/SatelliteMap"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-[#0B0F19]"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>
});

interface Loc { lat: number; lng: number }

interface ExtendedGeolocationPosition extends GeolocationPosition {
  heading?: number | null;
  speed?: number | null;
}

// ── Geo-fence alert types ───────────────────────────────────────────────────

interface GeoFenceAlert {
  id: string;
  fenceId: string;
  fenceName: string;
  event: "ENTER" | "EXIT";
  zone: string;
  description: string | null;
  timestamp: number;
}

interface GeoFenceCheckResult {
  inside: boolean;
  name: string;
  zone: string;
  type: string;
  description: string | null;
}

// ── Sound alert helper ──────────────────────────────────────────────────────

function playAlertBeep(type: "danger" | "safe") {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);

    if (type === "danger") {
      // Alarm-style beep: two tones
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
      oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } else {
      // Pleasant chime
      oscillator.frequency.setValueAtTime(523, ctx.currentTime);
      oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // AudioContext not supported — silent fallback
  }
}

// ── Push notification helper ────────────────────────────────────────────────

function sendPushNotification(title: string, body: string, icon?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;

  if (Notification.permission === "granted") {
    new Notification(title, {
      body,
      icon: icon || "/favicon.ico",
      badge: "/favicon.ico",
      tag: `geofence-${Date.now()}`,
      requireInteraction: false,
    });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((perm) => {
      if (perm === "granted") {
        new Notification(title, { body, icon: icon || "/favicon.ico" });
      }
    });
  }
}

// ── Vibration helper ────────────────────────────────────────────────────────

function triggerVibration(pattern: number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

export default function GeoPage() {
  const [loc, setLoc] = useState<Loc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [heading, setHeading] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [threatPins, setThreatPins] = useState<ThreatMarker[]>([]);
  const [threatZone, setThreatZone] = useState<string | null>(null);
  const [threatSummary, setThreatSummary] = useState<string | null>(null);
  const [threatLoading, setThreatLoading] = useState(false);
  const [threatError, setThreatError] = useState<string | null>(null);
  const [hoveredThreat, setHoveredThreat] = useState<ThreatMarker | null>(null);

  // Geo-fence state
  const [geoFenceAlerts, setGeoFenceAlerts] = useState<GeoFenceAlert[]>([]);
  const [activeFenceCount, setActiveFenceCount] = useState(0);
  const [insideFences, setInsideFences] = useState<string[]>([]);
  const previousStatesRef = useRef<Record<string, boolean>>({});
  const cooldownRef = useRef<Record<string, number>>({});
  const COOLDOWN_MS = 30_000;

  // SOS state
  const [sosTriggered, setSosTriggered] = useState(false);
  const [sosSending, setSosSending] = useState(false);

  // Notification permission request
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // ── GPS Tracking ──────────────────────────────────────────

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setLoading(false);
      return;
    }

    const handleSuccess = (pos: GeolocationPosition) => {
      const ePos = pos as ExtendedGeolocationPosition;
      setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setAccuracy(pos.coords.accuracy);
      if (ePos.heading !== undefined) setHeading(ePos.heading);
      if (ePos.speed !== undefined) setSpeed(ePos.speed);
      
      setLoading(false);
      setError(null);
    };

    const handleError = (err: GeolocationPositionError) => {
      setError(err.message);
      setLoading(false);
    };

    const opts = { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 };
    
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, opts);
    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, opts);

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // ── Threat Map Integration ────────────────────────────────

  useEffect(() => {
    if (!loc) return;
    const ctrl = new AbortController();
    setThreatLoading(true);
    setThreatError(null);
    const t = setTimeout(() => {
      fetch(`/api/threat-map?lat=${loc.lat}&lng=${loc.lng}`, { signal: ctrl.signal })
        .then((r) => {
          if (!r.ok) throw new Error("Threat data unavailable");
          return r.json();
        })
        .then((data: { zone?: string; summary?: string; markers?: ThreatMarker[] }) => {
          setThreatZone(data.zone ?? null);
          setThreatSummary(data.summary ?? null);
          setThreatPins(Array.isArray(data.markers) ? data.markers : []);
        })
        .catch((e: Error) => {
          if (e.name === "AbortError") return;
          setThreatError(e.message);
          setThreatPins([]);
        })
        .finally(() => setThreatLoading(false));
    }, 600);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [loc?.lat, loc?.lng]);

  // News threat scan (once)
  useEffect(() => {
    if (!loc) return;
    fetch("/api/news-threat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: loc.lat, lng: loc.lng }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.created > 0) {
          console.log(`[geo] News threats sent to admin: ${d.created} (${d.city})`);
        }
      })
      .catch(() => {/* silent fail */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!loc]);

  // ── GEO-FENCE MONITORING (3-second polling) ───────────────

  const processGeoFenceCheck = useCallback((results: Record<string, GeoFenceCheckResult>) => {
    const now = Date.now();
    const newAlerts: GeoFenceAlert[] = [];
    const currentInside: string[] = [];
    let fenceCount = 0;

    for (const [fenceId, check] of Object.entries(results)) {
      fenceCount++;
      const wasInside = previousStatesRef.current[fenceId] ?? false;
      const isInside = check.inside;

      if (isInside) {
        currentInside.push(check.name);
      }

      // Detect state transitions
      const lastCooldown = cooldownRef.current[fenceId] ?? 0;
      const cooldownOk = now - lastCooldown >= COOLDOWN_MS;

      if (isInside && !wasInside && cooldownOk) {
        // ── ENTER EVENT ─────────────────────────────────
        cooldownRef.current[fenceId] = now;

        const alert: GeoFenceAlert = {
          id: `${fenceId}-enter-${now}`,
          fenceId,
          fenceName: check.name,
          event: "ENTER",
          zone: check.zone,
          description: check.description,
          timestamp: now,
        };
        newAlerts.push(alert);

        // Vibration: danger pattern
        triggerVibration([500, 200, 500]);

        // Sound alert
        playAlertBeep("danger");

        // Push notification
        sendPushNotification(
          "⚠️ Danger Zone Alert",
          `You have entered "${check.name}" — a restricted ${check.zone} zone. Please move to a safe location.`,
        );
      } else if (!isInside && wasInside && cooldownOk) {
        // ── EXIT EVENT ──────────────────────────────────
        cooldownRef.current[fenceId] = now;

        const alert: GeoFenceAlert = {
          id: `${fenceId}-exit-${now}`,
          fenceId,
          fenceName: check.name,
          event: "EXIT",
          zone: check.zone,
          description: check.description,
          timestamp: now,
        };
        newAlerts.push(alert);

        // Short vibration
        triggerVibration([200]);

        // Sound: safe chime
        playAlertBeep("safe");

        // Push notification
        sendPushNotification(
          "✅ Safe Zone",
          `You have exited "${check.name}". You are now in a safe zone.`,
        );
      }

      previousStatesRef.current[fenceId] = isInside;
    }

    if (newAlerts.length > 0) {
      setGeoFenceAlerts((prev) => [...newAlerts, ...prev].slice(0, 20));
    }
    setInsideFences(currentInside);
    setActiveFenceCount(fenceCount);
  }, []);

  useEffect(() => {
    if (!loc) return;

    const checkFences = () => {
      fetch("/api/geofence-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: loc.lat, lng: loc.lng }),
      })
        .then((r) => r.json())
        .then((data: { results?: Record<string, GeoFenceCheckResult> }) => {
          if (data.results) {
            processGeoFenceCheck(data.results);
          }
        })
        .catch(() => {
          /* silent fail */
        });
    };

    // Initial check
    checkFences();

    // Poll every 3 seconds
    const interval = setInterval(checkFences, 3000);

    return () => clearInterval(interval);
  }, [loc?.lat, loc?.lng, processGeoFenceCheck]);

  // ── SOS Emergency Button Handler ──────────────────────────

  const triggerSOS = async () => {
    if (sosSending) return;
    setSosSending(true);
    setSosTriggered(true);

    // Maximum vibration alert
    triggerVibration([1000, 500, 1000, 500, 1000]);

    // Sound alarm
    playAlertBeep("danger");
    setTimeout(() => playAlertBeep("danger"), 600);

    // Push notification
    sendPushNotification(
      "🚨 SOS EMERGENCY TRIGGERED",
      "Emergency signal sent to authorities. Help is on the way.",
    );

    try {
      await fetch("/api/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: loc?.lat,
          lng: loc?.lng,
          accuracy: accuracy,
        }),
      });
    } catch {
      // Best effort
    } finally {
      setSosSending(false);
      // Auto-dismiss after 8 seconds
      setTimeout(() => setSosTriggered(false), 8000);
    }
  };

  // ── Dismiss alert ─────────────────────────────────────────

  const dismissAlert = (alertId: string) => {
    setGeoFenceAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] transition-colors duration-300">
      <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-[#2A303C] bg-slate-50 dark:bg-slate-50/95 dark:bg-[#0B0F19]/95 backdrop-blur px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
           <MapPin className="h-5 w-5 text-emerald-500" />
           <h1 className="font-bold text-slate-900 dark:text-white">SURAKSHA <span className="text-slate-500 dark:text-slate-400">Geo-Sensing</span></h1>
        </div>
        <div className="flex gap-3 items-center">
            {/* Geo-fence indicator */}
            {activeFenceCount > 0 && (
              <div className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-200 dark:border-[#2A303C] px-3 py-1.5 text-xs font-bold">
                <Shield className={`h-3.5 w-3.5 ${insideFences.length > 0 ? "text-red-500 animate-pulse" : "text-emerald-500"}`} />
                <span className={insideFences.length > 0 ? "text-red-500" : "text-emerald-500"}>
                  {insideFences.length > 0
                    ? `⚠ ${insideFences.length} ZONE${insideFences.length > 1 ? "S" : ""}`
                    : `${activeFenceCount} FENCES`
                  }
                </span>
              </div>
            )}
            <Link 
              href="/dashboard/user" 
              className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition"
            >
                Back to Dashboard
            </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Status/Toolbar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] p-4 shadow-sm">
           <div className="flex items-center gap-3">
              <div className="relative flex h-3 w-3">
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${loading || error ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                <span className={`relative inline-flex h-3 w-3 rounded-full ${loading || error ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
              </div>
              <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">GPS Connection</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                      {loading ? 'Acquiring satellites...' : error ? 'Signal lost' : 'Active tracking (High Precision)'}
                  </p>
              </div>
           </div>

           <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-[#2A303C] px-3 py-1.5 text-slate-700 dark:text-slate-300">
                    <Crosshair className="h-4 w-4" />
                    Accuracy: {accuracy ? `±${accuracy.toFixed(1)}m` : '---'}
                </div>

                {/* SOS Emergency Button */}
                <button
                  type="button"
                  onClick={triggerSOS}
                  disabled={sosSending || !loc}
                  className={`relative flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold uppercase tracking-widest transition-all border ${
                    sosTriggered
                      ? "bg-red-600 border-red-400 text-white animate-pulse"
                      : "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-600 hover:text-white hover:border-red-400"
                  }`}
                >
                  <Phone className="h-4 w-4" />
                  {sosSending ? "SENDING..." : sosTriggered ? "SOS SENT ✓" : "SOS"}
                  {!sosTriggered && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  )}
                </button>
           </div>
        </div>

        {/* ── GEO-FENCE ALERT POPUPS (stacked in top-right) ─── */}
        <div className="fixed top-20 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
          {geoFenceAlerts.slice(0, 3).map((alert) => (
            <div
              key={alert.id}
              className={`pointer-events-auto rounded-2xl border p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-right-8 duration-500 ${
                alert.event === "ENTER"
                  ? "bg-red-950/90 border-red-500/50 text-white"
                  : "bg-emerald-950/90 border-emerald-500/50 text-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                      alert.event === "ENTER"
                        ? "bg-red-500/20 border border-red-500/30"
                        : "bg-emerald-500/20 border border-emerald-500/30"
                    }`}
                  >
                    {alert.event === "ENTER" ? (
                      <AlertTriangle className="h-5 w-5 text-red-400 animate-pulse" />
                    ) : (
                      <Shield className="h-5 w-5 text-emerald-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold tracking-wide">
                      {alert.event === "ENTER"
                        ? "⚠️ RESTRICTED AREA"
                        : "✅ SAFE ZONE"
                      }
                    </p>
                    <p className="text-xs mt-1 opacity-90">
                      {alert.event === "ENTER"
                        ? `You have entered "${alert.fenceName}" — a ${alert.zone} restricted/unsafe area.`
                        : `You have exited "${alert.fenceName}". You are now in a safe zone.`
                      }
                    </p>
                    {alert.description && (
                      <p className="text-[11px] mt-1.5 opacity-70 italic">{alert.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                        alert.zone === "RED"
                          ? "bg-red-500/20 text-red-300"
                          : alert.zone === "ORANGE"
                            ? "bg-orange-500/20 text-orange-300"
                            : "bg-yellow-500/20 text-yellow-300"
                      }`}>
                        {alert.zone}
                      </span>
                      <span className="text-[10px] opacity-50 font-mono">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dismissAlert(alert.id)}
                  className="rounded-lg p-1 hover:bg-white/10 transition shrink-0"
                >
                  <X className="h-4 w-4 opacity-60" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ── SOS Triggered Full-Screen Overlay ─── */}
        {sosTriggered && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-red-950/80 backdrop-blur-md animate-in fade-in duration-300 pointer-events-auto">
            <div className="text-center p-8 max-w-md">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-red-500/20 border-2 border-red-500 animate-pulse mb-6">
                <Phone className="h-12 w-12 text-red-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">🚨 SOS ACTIVATED</h2>
              <p className="text-red-200 text-sm mb-6">
                Emergency signal sent to authorities with your coordinates.
                Help is being dispatched to your location.
              </p>
              {loc && (
                <p className="text-xs font-mono text-red-300/80 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                  📍 {loc.lat.toFixed(6)}°N, {loc.lng.toFixed(6)}°E
                  {accuracy && ` (±${accuracy.toFixed(0)}m)`}
                </p>
              )}
              <button
                type="button"
                onClick={() => setSosTriggered(false)}
                className="mt-6 rounded-xl border border-white/20 bg-white/10 px-8 py-3 text-sm font-bold text-white hover:bg-white/20 transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Map Container */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] shadow-sm aspect-video sm:aspect-[21/9]">
            {loading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0B0F19]/80 backdrop-blur z-10">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400" />
                    <p className="mt-4 font-medium text-slate-700 dark:text-slate-300">Calibrating position...</p>
                </div>
            ) : error ? (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-50/95 dark:bg-[#0B0F19]/95 backdrop-blur z-10 p-6 text-center">
                    <AlertTriangle className="h-10 w-10 text-red-500 dark:text-red-400 mb-4" />
                    <p className="font-bold text-lg text-slate-900 dark:text-white">Location Access Required</p>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md">
                        {error}. Please enable location permissions in your browser settings to use Geo-Sensing.
                    </p>
                </div>
            ) : null}

            {loc ? (
               <div className="absolute inset-0 z-0">
                 <SatelliteMap 
                   lat={loc.lat} 
                   lng={loc.lng} 
                   threatMarkers={threatPins} 
                   onHover={setHoveredThreat} 
                 />
               </div>
            ) : (
              <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            )}

            {/* Data Overlay */}
            {loc && (
                <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row gap-4 justify-between pointer-events-none">
                    <div className="rounded-2xl border border-white/20 bg-slate-900/80 p-4 backdrop-blur-md shadow-2xl w-full sm:w-auto ring-1 ring-black/5 max-w-md pointer-events-auto">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Current Coordinates</p>
                        <p className="mt-1.5 font-mono text-base font-semibold text-white drop-shadow-md">
                            {loc.lat.toFixed(6)}° N<br/>{loc.lng.toFixed(6)}° E
                        </p>

                        {/* Geo-fence status inline */}
                        {insideFences.length > 0 && (
                          <div className="mt-3 border-t border-white/10 pt-3">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-red-400 flex items-center gap-1.5">
                              <AlertTriangle className="h-3 w-3 animate-pulse" />
                              INSIDE RESTRICTED ZONE
                            </p>
                            <p className="mt-1 text-xs text-red-300">
                              {insideFences.join(", ")}
                            </p>
                          </div>
                        )}

                        {(threatLoading || threatZone || threatSummary || threatError || hoveredThreat) && (
                          <div className="mt-3 border-t border-white/10 pt-3">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                              {hoveredThreat ? 'Focused Threat Detail' : 'AI threat map'}
                            </p>
                            {threatLoading && !hoveredThreat && (
                              <p className="mt-1 text-xs text-slate-300">Analyzing nearby risk…</p>
                            )}
                            {threatError && !threatLoading && !hoveredThreat && (
                              <p className="mt-1 text-xs text-amber-300">{threatError}</p>
                            )}
                            {(hoveredThreat?.zone || threatZone) && !threatLoading && (
                              <div className="mt-1.5">
                                <span
                                  className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${
                                    (hoveredThreat?.zone || threatZone) === "RED"
                                      ? "bg-red-600 text-white"
                                      : (hoveredThreat?.zone || threatZone) === "ORANGE"
                                        ? "bg-orange-600 text-white"
                                        : (hoveredThreat?.zone || threatZone) === "YELLOW"
                                          ? "bg-yellow-500 text-slate-900"
                                          : "bg-emerald-600 text-white"
                                  }`}
                                >
                                  {hoveredThreat?.zone || threatZone}
                                </span>
                                <span className="ml-2 text-xs text-slate-300">
                                  {hoveredThreat ? hoveredThreat.label : 'Colored pins show approximate hotspots.'}
                                </span>
                              </div>
                            )}
                            {!threatLoading && (hoveredThreat?.summary || threatSummary) && (
                              <p className="mt-2 text-xs leading-relaxed text-slate-200 line-clamp-4">
                                {hoveredThreat?.summary || threatSummary}
                              </p>
                            )}
                          </div>
                        )}
                    </div>

                    <div className="rounded-2xl border border-white/20 bg-slate-900/80 p-4 backdrop-blur-md shadow-2xl w-full sm:w-auto flex gap-8 ring-1 ring-black/5">
                         <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Speed</p>
                            <p className="mt-1.5 font-mono text-base font-semibold text-white drop-shadow-md">
                                {speed !== null ? `${(speed * 3.6).toFixed(1)} km/h` : '0.0 km/h'}
                            </p>
                         </div>
                         <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Heading</p>
                            <p className="mt-1.5 font-mono text-base font-semibold text-white drop-shadow-md flex items-center gap-2">
                                {heading !== null ? `${heading.toFixed(0)}°` : '---'}
                                {heading !== null && (
                                    <Navigation className="h-4 w-4 text-emerald-400" style={{ transform: `rotate(${heading}deg)` }} />
                                )}
                            </p>
                         </div>
                    </div>
                </div>
            )}
            
            {/* Overlay Map Controls */}
            <div className="absolute right-6 top-6 flex flex-col gap-3 pointer-events-none">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900/80 shadow-2xl backdrop-blur-md text-white border border-white/20 ring-1 ring-black/5 pointer-events-auto cursor-pointer hover:bg-slate-800 transition">
                    <Search className="h-5 w-5 drop-shadow-md" />
                </div>
                <div className="flex h-11 w-11 flex-col items-center justify-center rounded-2xl bg-slate-900/80 shadow-2xl backdrop-blur-md overflow-hidden border border-white/20 ring-1 ring-black/5">
                    <div className="flex h-1/2 w-full items-center justify-center bg-transparent hover:bg-white/20 cursor-pointer pointer-events-auto text-white transition font-bold text-lg">+</div>
                    <div className="h-px bg-white/20 w-full" />
                    <div className="flex h-1/2 w-full items-center justify-center bg-transparent hover:bg-white/20 cursor-pointer pointer-events-auto text-white transition font-bold text-lg">-</div>
                </div>
            </div>
        </div>

        {/* ── Geo-Fence Activity Log ─── */}
        {geoFenceAlerts.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="h-5 w-5 text-cyan-500" />
              Geo-Fence Activity Log
            </h2>
            <div className="mt-4 space-y-3">
              {geoFenceAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between gap-4 rounded-xl border p-4 transition ${
                    alert.event === "ENTER"
                      ? "border-red-500/20 bg-red-500/5 dark:bg-red-500/5"
                      : "border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      alert.event === "ENTER"
                        ? "bg-red-500/10 text-red-500"
                        : "bg-emerald-500/10 text-emerald-500"
                    }`}>
                      {alert.event === "ENTER" ? <AlertTriangle className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {alert.event === "ENTER" ? "⚠️ Entered" : "✅ Exited"} {alert.fenceName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        {new Date(alert.timestamp).toLocaleTimeString()} • Zone: {alert.zone}
                      </p>
                    </div>
                  </div>
                  <span className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest border ${
                    alert.event === "ENTER"
                      ? "bg-red-500/10 text-red-500 border-red-500/30"
                      : "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                  }`}>
                    {alert.event}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nearby Safe Zones */}
        <div className="mt-8">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Nearby Safe Zones & Corridors</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {[
                    {name: "Tourist Checkpoint Alpha", dist: "1.2 km", status: "Active"},
                    {name: "City Center Safe Corridor", dist: "2.5 km", status: "Active"},
                    {name: "Emergency Medical Camp", dist: "3.8 km", status: "Standby"},
                ].map((z, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] p-4 shadow-sm transition hover:border-slate-300 dark:hover:border-white/20">
                        <div className="flex items-center justify-between">
                             <h3 className="font-semibold text-slate-900 dark:text-white text-sm truncate pr-2">{z.name}</h3>
                             <Shield className="h-4 w-4 text-emerald-500 shrink-0" />
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs font-semibold">
                            <span className="text-slate-500 dark:text-slate-400">{z.dist}</span>
                            <span className={z.status === 'Active' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-500/20' : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded border border-amber-100 dark:border-amber-500/20'}>
                                {z.status}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </main>
    </div>
  );
}
