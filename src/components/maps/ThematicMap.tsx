"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polygon, CircleMarker } from "react-leaflet";
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

function UpdateMapCenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

function parseVertices(j: string | null | undefined): {lat: number; lng: number}[] {
  if (!j) return [];
  try {
    return JSON.parse(j);
  } catch {
    return [];
  }
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

        {fences.map((fence, i) => {
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
                <Popup>
                  <div style={{ fontFamily: "monospace", fontSize: "12px" }}>
                    <strong style={{ color }}>{fence.zone} ZONE</strong><br />
                    <strong>{fence.name}</strong><br />
                    Radius: {fence.radius}m
                    {fence.description && <div style={{marginTop: "8px", opacity: 0.8}}>{fence.description}</div>}
                  </div>
                </Popup>
              </Circle>
            );
          } else if (fence.type === "polygon" && fence.vertices) {
            const vertices = parseVertices(fence.vertices);
            if (vertices.length < 3) return null;
            const latLngs: L.LatLngExpression[] = vertices.map((v) => [v.lat, v.lng]);
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
                <Popup>
                  <div style={{ fontFamily: "monospace", fontSize: "12px" }}>
                    <strong style={{ color }}>{fence.zone} ZONE</strong><br />
                    <strong>{fence.name}</strong><br />
                    {fence.description && <div style={{marginTop: "8px", opacity: 0.8}}>{fence.description}</div>}
                  </div>
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
