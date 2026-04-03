"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { ThreatMarker as ThreatPin } from "@/lib/threat-engine";
import type { AmenityItem } from "./ThematicMap";

// Fix default marker icon issue in Next.js/Webpack
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function getMarkerIcon(zone: string) {
  if (typeof window === "undefined") return undefined;
  let color = "blue";
  if (zone === "RED") color = "red";
  else if (zone === "ORANGE") color = "orange";
  else if (zone === "YELLOW") color = "yellow";
  else if (zone === "GREEN") color = "green";

  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function UpdateMapCenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

function FitThreatBounds({
  userLat,
  userLng,
  pins,
}: {
  userLat: number;
  userLng: number;
  pins: ThreatPin[];
}) {
  const map = useMap();
  const pinsSig = useMemo(() => pins.map((p) => `${p.lat},${p.lng},${p.zone}`).join("|"), [pins]);

  useEffect(() => {
    if (pins.length === 0) return;
    const pts: L.LatLngExpression[] = [
      [userLat, userLng],
      ...pins.map((p) => [p.lat, p.lng] as L.LatLngExpression),
    ];
    const b = L.latLngBounds(pts);
    map.fitBounds(b, { padding: [52, 52], maxZoom: 15, animate: true });
    // Refit only when threat pins change, not on every GPS tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, pinsSig]);

  return null;
}

export default function SatelliteMap({
  lat,
  lng,
  threatMarkers = [],
  amenities = [],
  onHover,
}: {
  lat: number;
  lng: number;
  threatMarkers?: ThreatPin[];
  amenities?: AmenityItem[];
  onHover?: (marker: ThreatPin | null) => void;
}) {
  return (
    <div className="h-full w-full">
      <MapContainer
        center={[lat, lng]}
        zoom={16}
        scrollWheelZoom={true}
        className="h-full w-full"
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
        />
        <TileLayer
          url="https://stamen-tiles-{s}.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}{r}.png"
          attribution=""
        />

        {threatMarkers
          .filter((m) => distanceMeters(lat, lng, m.lat, m.lng) <= 3000)
          .map((m, i) => {
          const icon = getMarkerIcon(m.zone);
          if (!icon) return null;
          const zoneColor = m.zone === "RED" ? "#ef4444" : m.zone === "ORANGE" ? "#f97316" : m.zone === "YELLOW" ? "#eab308" : "#22c55e";
          return (
            <Marker
              key={`${m.lat}-${m.lng}-${i}`}
              position={[m.lat, m.lng]}
              icon={icon}
              eventHandlers={{
                mouseover: () => onHover?.(m),
                mouseout: () => onHover?.(null),
              }}
            >
              <Popup maxWidth={300}>
                <div style={{ fontFamily: "Inter, sans-serif", minWidth: 220 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{
                      background: zoneColor + "22",
                      color: zoneColor,
                      border: `1px solid ${zoneColor}55`,
                      borderRadius: 6,
                      padding: "2px 8px",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                    }}>{m.zone} ZONE</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b", marginBottom: 4 }}>
                    📍 {m.label}
                  </div>
                  <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.4, margin: "8px 0" }}>
                    {m.summary}
                  </div>
                  {m.newsSource && (
                    <div style={{
                      marginTop: 8,
                      padding: "8px 10px",
                      background: "#fef3c7",
                      borderLeft: `3px solid ${zoneColor}`,
                      borderRadius: 4,
                      fontSize: 11,
                      color: "#78350f",
                      lineHeight: 1.5,
                    }}>
                      <span style={{ fontWeight: 700 }}>📰 News:</span> {m.newsSource}
                    </div>
                  )}
                  <div style={{ marginTop: 8, fontSize: 10, color: "#94a3b8" }}>
                    Verified by Police Authority
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Threat Zone Circle Overlays */}
        {threatMarkers
          .filter((m) => distanceMeters(lat, lng, m.lat, m.lng) <= 5000)
          .map((m, i) => {
            const zoneColor = m.zone === "RED" ? "#ef4444" : m.zone === "ORANGE" ? "#f97316" : m.zone === "YELLOW" ? "#eab308" : "#22c55e";
            const radius = m.zone === "RED" ? 600 : m.zone === "ORANGE" ? 450 : 300;
            return (
              <Circle
                key={`threat-circle-${m.lat}-${m.lng}-${i}`}
                center={[m.lat, m.lng]}
                radius={radius}
                pathOptions={{
                  color: zoneColor,
                  fillColor: zoneColor,
                  fillOpacity: 0.18,
                  weight: 2,
                  dashArray: "8 4",
                }}
              >
                <Popup maxWidth={260}>
                  <div style={{ fontFamily: "Inter, sans-serif" }}>
                    <div style={{ display: "inline-block", background: zoneColor + "22", color: zoneColor, border: `1px solid ${zoneColor}55`, borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
                      {m.zone} THREAT ZONE
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b", marginBottom: 4 }}>📍 {m.label}</div>
                    <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.4 }}>{m.summary}</div>
                    <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 6 }}>Radius: {radius}m · Verified by Authority</div>
                  </div>
                </Popup>
              </Circle>
            );
          })}

        {/* Render Amenities */}
        {amenities.map((amenity) => {
          const distMeters = distanceMeters(lat, lng, amenity.lat, amenity.lng);
          const distStr = distMeters < 1000 ? `${Math.round(distMeters)} m` : `${(distMeters / 1000).toFixed(1)} km`;
          
          let emoji = "📍";
          
          if (amenity.type === "hospital") {
            emoji = "🏥";
          } else if (amenity.type === "police") {
            emoji = "🚓";
          } else if (amenity.type === "hotel") {
            emoji = "🏨";
          }

          const icon = L.divIcon({
            html: `<div style="background-color: transparent; font-size: 20px; filter: drop-shadow(0 4px 3px rgb(0 0 0 / 0.3));" class="flex items-center justify-center">${emoji}</div>`,
            className: "bg-transparent border-none",
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });

          return (
            <Marker key={amenity.id} position={[amenity.lat, amenity.lng]} icon={icon}>
              <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", padding: "2px" }}>
                  <div style={{ fontWeight: 800, fontSize: "13px", color: "#1e293b", marginBottom: "2px" }}>
                    {amenity.name}
                  </div>
                  <div style={{ color: "#64748b", fontSize: "11px", fontWeight: 600 }}>
                    Distance: <span style={{ color: "#0ea5e9" }}>{distStr} from you</span>
                  </div>
                </div>
              </Tooltip>
            </Marker>
          );
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
        <FitThreatBounds userLat={lat} userLng={lng} pins={threatMarkers} />
      </MapContainer>
    </div>
  );
}
