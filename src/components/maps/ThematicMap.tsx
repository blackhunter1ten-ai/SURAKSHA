"use client";

import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polygon } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { GeoFenceMapFence } from "./GeoFenceMap"; // reuse the type

// Fix default marker icon issue in Next.js
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const ZONE_COLORS: Record<string, string> = {
  RED: "#ef4444",
  ORANGE: "#f97316",
  YELLOW: "#eab308",
};

const ZONE_BG: Record<string, string> = {
  RED: "rgba(239,68,68,0.12)",
  ORANGE: "rgba(249,115,22,0.12)",
  YELLOW: "rgba(234,179,8,0.12)",
};

// ── Haversine distance (meters) ──────────────────────────────────────────
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Format distance as human-readable string
function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

// ── Polygon centroid helper ──────────────────────────────────────────────
function getPolygonCentroid(vertices: { lat: number; lng: number }[]): { lat: number; lng: number } {
  let latSum = 0, lngSum = 0;
  for (const v of vertices) {
    latSum += v.lat;
    lngSum += v.lng;
  }
  return { lat: latSum / vertices.length, lng: lngSum / vertices.length };
}

function UpdateMapCenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

function parseVertices(j: string | null | undefined): { lat: number; lng: number }[] {
  if (!j) return [];
  try {
    return JSON.parse(j);
  } catch {
    return [];
  }
}

// ── Reverse geocoding cache (per session) ────────────────────────────────
const geocodeCache: Record<string, string> = {};

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (geocodeCache[key]) return geocodeCache[key];

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
      { headers: { "User-Agent": "SURAKSHA-App/1.0" } }
    );
    if (!res.ok) throw new Error("Geocode failed");
    const data = await res.json();

    // Build a short location string
    const addr = data.address || {};
    const parts: string[] = [];
    if (addr.neighbourhood || addr.suburb) parts.push(addr.neighbourhood || addr.suburb);
    if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
    if (addr.state) parts.push(addr.state);
    if (addr.country) parts.push(addr.country);

    const result = parts.length > 0 ? parts.join(", ") : data.display_name?.split(",").slice(0, 3).join(",") || "Unknown Location";
    geocodeCache[key] = result;
    return result;
  } catch {
    geocodeCache[key] = "Location unavailable";
    return "Location unavailable";
  }
}

// ── Zone Popup Component ─────────────────────────────────────────────────
function ZonePopup({
  fence,
  userLat,
  userLng,
  zoneLat,
  zoneLng,
  vertexCount,
}: {
  fence: GeoFenceMapFence;
  userLat: number;
  userLng: number;
  zoneLat: number;
  zoneLng: number;
  vertexCount?: number;
}) {
  const [placeName, setPlaceName] = useState<string>("Resolving...");
  const color = ZONE_COLORS[fence.zone] || "#ef4444";
  const bgColor = ZONE_BG[fence.zone] || "rgba(239,68,68,0.12)";
  const distMeters = haversineDistance(userLat, userLng, zoneLat, zoneLng);
  const distStr = formatDistance(distMeters);

  useEffect(() => {
    reverseGeocode(zoneLat, zoneLng).then(setPlaceName);
  }, [zoneLat, zoneLng]);

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: "12px", minWidth: "220px", maxWidth: "280px" }}>
      {/* Zone Badge */}
      <div style={{
        display: "inline-block",
        background: bgColor,
        border: `1.5px solid ${color}`,
        borderRadius: "6px",
        padding: "2px 10px",
        marginBottom: "8px",
      }}>
        <span style={{ color, fontWeight: 800, fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase" }}>
          {fence.zone} ZONE
        </span>
      </div>

      {/* Fence Name */}
      <div style={{ fontWeight: 700, fontSize: "13px", color: "#1e293b", marginBottom: "4px", lineHeight: 1.3 }}>
        {fence.name}
      </div>

      {/* Radius / Vertices */}
      <div style={{ color: "#64748b", fontSize: "11px", marginBottom: "6px" }}>
        {fence.type === "circle" && fence.radius
          ? `Radius: ${fence.radius}m`
          : vertexCount
            ? `Polygon · ${vertexCount} vertices`
            : ""
        }
      </div>

      {/* Description */}
      {fence.description && (
        <div style={{
          background: "rgba(0,0,0,0.04)",
          borderRadius: "6px",
          padding: "6px 8px",
          marginBottom: "8px",
          fontSize: "11px",
          color: "#475569",
          lineHeight: 1.5,
          borderLeft: `3px solid ${color}`,
        }}>
          {fence.description}
        </div>
      )}

      {/* Divider */}
      <div style={{ borderTop: "1px solid #e2e8f0", margin: "8px 0" }} />

      {/* Location Info */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "6px", marginBottom: "6px" }}>
        <span style={{ fontSize: "14px", lineHeight: "1" }}>📍</span>
        <div>
          <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>
            Location
          </div>
          <div style={{ fontSize: "11.5px", color: "#334155", fontWeight: 600, lineHeight: 1.4 }}>
            {placeName}
          </div>
        </div>
      </div>

      {/* Distance Info */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
        <span style={{ fontSize: "14px", lineHeight: "1" }}>📏</span>
        <div>
          <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>
            Distance from you
          </div>
          <div style={{
            fontSize: "13px",
            fontWeight: 800,
            color: distMeters < 500 ? "#ef4444" : distMeters < 2000 ? "#f97316" : "#059669",
            letterSpacing: "0.3px",
          }}>
            {distStr}
            {distMeters < 500 && (
              <span style={{ fontSize: "10px", marginLeft: "6px", color: "#ef4444", fontWeight: 600 }}>
                ⚠ Very Close
              </span>
            )}
            {distMeters >= 500 && distMeters < 2000 && (
              <span style={{ fontSize: "10px", marginLeft: "6px", color: "#f97316", fontWeight: 600 }}>
                — Nearby
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ThematicMap({
  lat,
  lng,
  fences = [],
}: {
  lat: number;
  lng: number;
  fences?: GeoFenceMapFence[];
}) {
  return (
    <div className="h-full w-full">
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        scrollWheelZoom={true}
        className="h-full w-full"
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap &copy; CARTO"
        />

        {fences.map((fence) => {
          if (!fence.active) return null;
          const color = ZONE_COLORS[fence.zone] || "#ef4444";

          if (fence.type === "circle" && fence.centerLat && fence.centerLng && fence.radius) {
            return (
              <Circle
                key={fence.id}
                center={[fence.centerLat, fence.centerLng]}
                radius={fence.radius}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.15,
                  weight: 2,
                  dashArray: "6 4",
                }}
              >
                <Popup maxWidth={300} minWidth={240}>
                  <ZonePopup
                    fence={fence}
                    userLat={lat}
                    userLng={lng}
                    zoneLat={fence.centerLat}
                    zoneLng={fence.centerLng}
                  />
                </Popup>
              </Circle>
            );
          } else if (fence.type === "polygon" && fence.vertices) {
            const vertices = parseVertices(fence.vertices);
            if (vertices.length < 3) return null;
            const latLngs: L.LatLngExpression[] = vertices.map((v) => [v.lat, v.lng]);
            const centroid = getPolygonCentroid(vertices);
            return (
              <Polygon
                key={fence.id}
                positions={latLngs}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.15,
                  weight: 2,
                  dashArray: "6 4",
                }}
              >
                <Popup maxWidth={300} minWidth={240}>
                  <ZonePopup
                    fence={fence}
                    userLat={lat}
                    userLng={lng}
                    zoneLat={centroid.lat}
                    zoneLng={centroid.lng}
                    vertexCount={vertices.length}
                  />
                </Popup>
              </Polygon>
            );
          }
          return null;
        })}

        <Marker position={[lat, lng]}>
          <Popup>
            <div className="font-semibold text-slate-800">Your location</div>
            <div className="text-xs text-slate-500">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </div>
          </Popup>
        </Marker>

        <UpdateMapCenter lat={lat} lng={lng} />
      </MapContainer>
    </div>
  );
}
