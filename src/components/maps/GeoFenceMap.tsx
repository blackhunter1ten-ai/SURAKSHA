"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface GeoFenceMapFence {
  id: string;
  type: "circle" | "polygon";
  centerLat?: number | null;
  centerLng?: number | null;
  radius?: number | null;
  vertices?: string | null; // JSON of [{lat,lng}]
  zone: string;
  name: string;
  active: boolean;
}

interface Props {
  fences: GeoFenceMapFence[];
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  /** Optional click handler for placing a new fence center */
  onMapClick?: (latLng: { lat: number; lng: number }) => void;
}

const ZONE_COLORS: Record<string, string> = {
  RED: "#ef4444",
  ORANGE: "#f97316",
  YELLOW: "#eab308",
};

export default function GeoFenceMap({
  fences,
  center = { lat: 28.6139, lng: 77.209 },
  zoom = 13,
  height = "400px",
  onMapClick,
}: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialise Leaflet map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom,
      zoomControl: true,
      attributionControl: false,
    });

    // Use CartoDB Dark Matter for admin aesthetic
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 19,
        subdomains: "abcd",
      },
    ).addTo(map);

    layerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Map click handler
    if (onMapClick) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render fence overlays when fences change
  useEffect(() => {
    if (!layerGroupRef.current) return;
    layerGroupRef.current.clearLayers();

    for (const fence of fences) {
      if (!fence.active) continue;

      const color = ZONE_COLORS[fence.zone] || "#ef4444";

      if (fence.type === "circle" && fence.centerLat && fence.centerLng && fence.radius) {
        const circle = L.circle([fence.centerLat, fence.centerLng], {
          radius: fence.radius,
          color,
          fillColor: color,
          fillOpacity: 0.15,
          weight: 2,
          dashArray: "6 4",
        });

        circle.bindPopup(
          `<div style="font-family:monospace;font-size:12px">
            <strong style="color:${color}">${fence.zone} ZONE</strong><br/>
            <strong>${fence.name}</strong><br/>
            Radius: ${fence.radius}m
          </div>`,
        );

        layerGroupRef.current.addLayer(circle);

        // Center marker
        const marker = L.circleMarker([fence.centerLat, fence.centerLng], {
          radius: 5,
          color,
          fillColor: color,
          fillOpacity: 1,
          weight: 2,
        });
        layerGroupRef.current.addLayer(marker);
      } else if (fence.type === "polygon" && fence.vertices) {
        let vertices: { lat: number; lng: number }[] = [];
        try {
          vertices = JSON.parse(fence.vertices);
        } catch {
          continue;
        }

        if (vertices.length < 3) continue;

        const latLngs: L.LatLngExpression[] = vertices.map((v) => [v.lat, v.lng]);

        const polygon = L.polygon(latLngs, {
          color,
          fillColor: color,
          fillOpacity: 0.15,
          weight: 2,
          dashArray: "6 4",
        });

        polygon.bindPopup(
          `<div style="font-family:monospace;font-size:12px">
            <strong style="color:${color}">${fence.zone} ZONE</strong><br/>
            <strong>${fence.name}</strong><br/>
            Vertices: ${vertices.length}
          </div>`,
        );

        layerGroupRef.current.addLayer(polygon);

        // Vertex markers
        for (const v of vertices) {
          const vm = L.circleMarker([v.lat, v.lng], {
            radius: 4,
            color,
            fillColor: color,
            fillOpacity: 1,
            weight: 1,
          });
          layerGroupRef.current.addLayer(vm);
        }
      }
    }
  }, [fences]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%" }}
      className="rounded-xl overflow-hidden border border-slate-200 dark:border-[#2A303C]"
    />
  );
}
