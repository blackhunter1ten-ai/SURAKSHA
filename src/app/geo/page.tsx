"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Loader2, Navigation, AlertTriangle, Crosshair, MapPin, Search, Shield, X, Volume2, Bell, Phone, BarChart2 } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { ThreatMarker } from "@/lib/threat-engine";

const SatelliteMap = dynamic(() => import("@/components/maps/SatelliteMap"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-[#0B0F19]"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>
});

const ThematicMap = dynamic(() => import("@/components/maps/ThematicMap"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-[#0B0F19]"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>
});

import type { GeoFenceMapFence } from "@/components/maps/GeoFenceMap";

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
  const [expandThreat, setExpandThreat] = useState(false);

  // Geo-fence state
  const [geoFenceAlerts, setGeoFenceAlerts] = useState<GeoFenceAlert[]>([]);
  const [activeFenceCount, setActiveFenceCount] = useState(0);
  const [insideFences, setInsideFences] = useState<string[]>([]);
  const previousStatesRef = useRef<Record<string, boolean>>({});
  const cooldownRef = useRef<Record<string, number>>({});
  const COOLDOWN_MS = 30_000;

  // Map Type
  const [mapType, setMapType] = useState<"satellite" | "thematic">("satellite");
  const [allFences, setAllFences] = useState<GeoFenceMapFence[]>([]);

  // Geo Fence Category
  const [geoFenceCategory, setGeoFenceCategory] = useState("all");

  // AI Geo Fence state
  const [aiFences, setAiFences] = useState<Record<string, GeoFenceMapFence[]> | null>(null);
  const [aiFenceLoading, setAiFenceLoading] = useState(false);
  const [aiFenceSummary, setAiFenceSummary] = useState<string | null>(null);

  // Fetch fences for Thematic map
  useEffect(() => {
    fetch("/api/admin/geofences")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data && data.fences) {
          setAllFences(data.fences);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch AI fences when category changes
  useEffect(() => {
    if (geoFenceCategory === "all" || !loc) {
      return;
    }

    // If we already have cached AI data, just switch the map
    if (aiFences && aiFences[geoFenceCategory]) {
      setMapType("thematic");
      return;
    }

    // Fetch all categories in one call
    setAiFenceLoading(true);
    setAiFenceSummary(null);
    setMapType("thematic");

    fetch(`/api/geofence-ai?lat=${loc.lat}&lng=${loc.lng}&category=${geoFenceCategory}`)
      .then((r) => {
        if (!r.ok) throw new Error("AI fence fetch failed");
        return r.json();
      })
      .then((data) => {
        if (data.fences) {
          setAiFences(data.fences);
          setAiFenceSummary(data.summary || null);
        }
      })
      .catch((e) => {
        console.error("[geo] AI fence error:", e);
      })
      .finally(() => setAiFenceLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoFenceCategory, loc?.lat, loc?.lng]);

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
              href="/geo/heatmap"
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20 hover:text-red-300 transition"
            >
              <BarChart2 className="h-3.5 w-3.5" />
              Danger Heatmap
            </Link>
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
                {/* Geo Fence Category Selector */}
                <select
                  value={geoFenceCategory}
                  onChange={(e) => setGeoFenceCategory(e.target.value)}
                  className="rounded-xl border border-slate-300 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition cursor-pointer"
                >
                  <option value="all">All Geo Fences</option>
                  <option value="hazard">🌍 Hazard</option>
                  <option value="traffic">🚦 Traffic</option>
                  <option value="risk">⚠️ Risk</option>
                </select>

                {/* Map Type Selector */}
                <select
                  value={mapType}
                  onChange={(e) => setMapType(e.target.value as "satellite" | "thematic")}
                  className="rounded-xl border border-slate-300 dark:border-[#2A303C] bg-white dark:bg-[#131B2B] px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition cursor-pointer"
                >
                  <option value="satellite">Satellite Map</option>
                  <option value="thematic">Thematic Map</option>
                </select>
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
                      <div className="mt-2 text-xs opacity-100 bg-black/20 p-2.5 rounded border border-white/10 font-bold" style={{lineHeight: 1.5}}>
                        {alert.description}
                      </div>
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
                 {mapType === "satellite" ? (
                   <SatelliteMap 
                     lat={loc.lat} 
                     lng={loc.lng} 
                     threatMarkers={threatPins} 
                     onHover={setHoveredThreat} 
                   />
                 ) : (
                   <ThematicMap
                     lat={loc.lat}
                     lng={loc.lng}
                     fences={
                       geoFenceCategory !== "all" && aiFences && aiFences[geoFenceCategory]
                         ? aiFences[geoFenceCategory]
                         : allFences
                     }
                   />
                 )}

                 {/* AI Fence Loading Overlay */}
                 {aiFenceLoading && (
                   <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0B0F19]/70 backdrop-blur-sm">
                     <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                     <p className="mt-3 text-sm font-bold text-cyan-300 tracking-wide animate-pulse">
                       AI analyzing {geoFenceCategory} zones...
                     </p>
                   </div>
                 )}
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
                            {!threatLoading && (hoveredThreat?.zone || threatZone || hoveredThreat?.summary || threatSummary) && (
                              <button
                                onClick={() => setExpandThreat(!expandThreat)}
                                className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 mt-2 hover:text-emerald-300 transition-colors pointer-events-auto flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg w-fit"
                              >
                                {expandThreat ? "Collapse Details" : "Read More AI Details"}
                              </button>
                            )}

                            {expandThreat && !threatLoading && (
                              <div className="mt-3 bg-black/20 rounded-xl p-3 border border-white/5 shadow-inner">
                                {(hoveredThreat?.zone || threatZone) && (
                                  <div className="mb-2">
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
                                    <span className="ml-2 text-[11px] text-slate-300">
                                      {hoveredThreat ? hoveredThreat.label : 'Pins indicate approximate hotspots.'}
                                    </span>
                                  </div>
                                )}
                                {(hoveredThreat?.summary || threatSummary) && (
                                  <p className="text-[11px] leading-relaxed text-slate-200">
                                    {hoveredThreat?.summary || threatSummary}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
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
