import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ── GET /api/admin/geofences — List all geo-fences ──────────────────────────
export async function GET() {
  try {
    const fences = await prisma.geoFence.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ fences });
  } catch (e) {
    console.error("[geofences] GET error:", e);
    return NextResponse.json({ error: "Failed to fetch geo-fences" }, { status: 500 });
  }
}

// ── POST /api/admin/geofences — Create new geo-fence ────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, type, centerLat, centerLng, radius, vertices, zone, description } = body;

    // Validation
    if (!name || !type) {
      return NextResponse.json({ error: "name and type are required" }, { status: 400 });
    }

    if (type === "circle") {
      if (centerLat == null || centerLng == null || radius == null) {
        return NextResponse.json(
          { error: "Circle fences require centerLat, centerLng, and radius" },
          { status: 400 },
        );
      }
      if (radius <= 0 || radius > 50000) {
        return NextResponse.json(
          { error: "Radius must be between 1 and 50000 meters" },
          { status: 400 },
        );
      }
    } else if (type === "polygon") {
      if (!vertices) {
        return NextResponse.json(
          { error: "Polygon fences require vertices array" },
          { status: 400 },
        );
      }
      // Validate vertices is a valid JSON array of {lat,lng}
      let parsed: unknown;
      try {
        parsed = typeof vertices === "string" ? JSON.parse(vertices) : vertices;
      } catch {
        return NextResponse.json({ error: "Invalid vertices JSON" }, { status: 400 });
      }
      if (!Array.isArray(parsed) || parsed.length < 3) {
        return NextResponse.json(
          { error: "Polygon must have at least 3 vertices" },
          { status: 400 },
        );
      }
    } else {
      return NextResponse.json({ error: "type must be 'circle' or 'polygon'" }, { status: 400 });
    }

    const validZones = ["RED", "ORANGE", "YELLOW"];
    const safeZone = validZones.includes(zone) ? zone : "RED";

    const fence = await prisma.geoFence.create({
      data: {
        name,
        type,
        centerLat: type === "circle" ? parseFloat(centerLat) : null,
        centerLng: type === "circle" ? parseFloat(centerLng) : null,
        radius: type === "circle" ? parseFloat(radius) : null,
        vertices:
          type === "polygon"
            ? typeof vertices === "string"
              ? vertices
              : JSON.stringify(vertices)
            : null,
        zone: safeZone,
        description: description || null,
        active: true,
      },
    });

    return NextResponse.json({ success: true, fence }, { status: 201 });
  } catch (e) {
    console.error("[geofences] POST error:", e);
    return NextResponse.json({ error: "Failed to create geo-fence" }, { status: 500 });
  }
}

// ── PATCH /api/admin/geofences — Update geo-fence ───────────────────────────
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, active, name, zone, description } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (active !== undefined) data.active = Boolean(active);
    if (name !== undefined) data.name = String(name);
    if (zone !== undefined && ["RED", "ORANGE", "YELLOW"].includes(zone)) data.zone = zone;
    if (description !== undefined) data.description = description || null;

    const fence = await prisma.geoFence.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, fence });
  } catch (e) {
    console.error("[geofences] PATCH error:", e);
    return NextResponse.json({ error: "Failed to update geo-fence" }, { status: 500 });
  }
}

// ── DELETE /api/admin/geofences — Remove geo-fence ──────────────────────────
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await prisma.geoFence.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[geofences] DELETE error:", e);
    return NextResponse.json({ error: "Failed to delete geo-fence" }, { status: 500 });
  }
}
