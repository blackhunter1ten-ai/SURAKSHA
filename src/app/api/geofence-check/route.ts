import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  checkGeoFences,
  type GeoFence,
  type GeoPoint,
} from "@/lib/geofence-engine";

// ── POST /api/geofence-check ────────────────────────────────────────────────
// Client sends { lat, lng } → returns all active fences with inside/outside state
//
// Response shape:
// {
//   results: {
//     [fenceId]: {
//       inside: boolean,
//       name: string,
//       zone: string,
//       type: string,
//       description: string | null
//     }
//   }
// }

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const lat = parseFloat(body.lat);
    const lng = parseFloat(body.lng);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
    }

    const userLocation: GeoPoint = { lat, lng };

    // Fetch all active geo-fences from DB
    const dbFences = await prisma.geoFence.findMany({
      where: { active: true },
    });

    // Convert DB records to engine-compatible format
    const engineFences: GeoFence[] = dbFences.map((f) => {
      if (f.type === "circle") {
        return {
          id: f.id,
          name: f.name,
          type: "circle" as const,
          center: { lat: f.centerLat!, lng: f.centerLng! },
          radius: f.radius!,
          zone: f.zone as "RED" | "ORANGE" | "YELLOW",
          description: f.description ?? undefined,
        };
      }
      // polygon
      let vertices: GeoPoint[] = [];
      try {
        vertices = JSON.parse(f.vertices || "[]");
      } catch {
        vertices = [];
      }
      return {
        id: f.id,
        name: f.name,
        type: "polygon" as const,
        vertices,
        zone: f.zone as "RED" | "ORANGE" | "YELLOW",
        description: f.description ?? undefined,
      };
    });

    // Run stateless geo-fence check
    const rawResults = checkGeoFences(userLocation, engineFences);

    // Shape response for client consumption
    const results: Record<
      string,
      {
        inside: boolean;
        name: string;
        zone: string;
        type: string;
        description: string | null;
      }
    > = {};

    for (const [id, check] of Object.entries(rawResults)) {
      results[id] = {
        inside: check.inside,
        name: check.fence.name,
        zone: check.fence.zone,
        type: check.fence.type,
        description: check.fence.description ?? null,
      };
    }

    return NextResponse.json({ results });
  } catch (e) {
    console.error("[geofence-check] error:", e);
    return NextResponse.json({ error: "Failed to check geo-fences" }, { status: 500 });
  }
}
