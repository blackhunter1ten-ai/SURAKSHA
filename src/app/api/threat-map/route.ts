import { NextResponse } from "next/server";
import { analyzeThreat, scoreToTTLHours } from "@/lib/threat-engine";
import { getSessionPayload } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

const CACHE_RADIUS_DEG = 0.005;

// GET /api/threat-map?lat=&lng=
// Public/User: threat score + ChatGPT/heuristic map pins.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  let locationName = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  try {
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "User-Agent": "Suraksha-Safety-App/1.0" } },
    );
    if (geoRes.ok) {
      const geoData = (await geoRes.json()) as { display_name?: string };
      locationName =
        geoData.display_name?.split(",").slice(0, 3).join(", ") ?? locationName;
    }
  } catch {
    // keep coordinates label
  }

  const session = await getSessionPayload();
  const now = new Date();

  // Lazy cleanup: actively remove expired threats from the database
  try {
    await prisma.threatZone.deleteMany({
      where: { expiresAt: { lte: now } },
    });
  } catch (e) {
    // silently fail cleanup if db is locked
  }

  // 1. Fetch ALL VERIFIED threats within a wider radius (e.g. ~5km bounding box) to render multiple map pins
  const CACHE_RADIUS_LARGE = 0.045;
  const verifiedThreats = await prisma.threatZone.findMany({
    where: {
      lat: { gte: lat - CACHE_RADIUS_LARGE, lte: lat + CACHE_RADIUS_LARGE },
      lng: { gte: lng - CACHE_RADIUS_LARGE, lte: lng + CACHE_RADIUS_LARGE },
      expiresAt: { gt: now },
      status: "VERIFIED",
    },
    orderBy: { score: "desc" },
  });

  if (verifiedThreats.length > 0) {
    const highestThreat = verifiedThreats[0]; // Take the most severe threat as the overall score summary
    return NextResponse.json({
      score: highestThreat.score,
      zone: highestThreat.zone,
      summary: highestThreat.summary,
      markers: verifiedThreats.map(t => ({
        lat: t.lat,
        lng: t.lng,
        zone: t.zone as "RED" | "ORANGE" | "YELLOW" | "GREEN",
        label: t.location || "Verified Danger Zone",
        summary: t.summary,
        newsSource: (t as any).newsSource ?? undefined,
      })),
      location: highestThreat.location,
    });
  }

  // 2. Perform live AI threat analysis
  const result = await analyzeThreat(locationName, { lat, lng });

  // 3. If threat is elevated and user is logged in, log it for admin verification
  if ((result.zone === "RED" || result.zone === "ORANGE") && session?.sub) {
    const recentPending = await prisma.threatZone.findFirst({
      where: {
        lat: { gte: lat - CACHE_RADIUS_DEG, lte: lat + CACHE_RADIUS_DEG },
        lng: { gte: lng - CACHE_RADIUS_DEG, lte: lng + CACHE_RADIUS_DEG },
        expiresAt: { gt: now },
        status: "PENDING",
      },
    });

    if (!recentPending) {
      const ttlHours = scoreToTTLHours(result.score);
      const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);
      await prisma.threatZone.create({
        data: {
          lat,
          lng,
          location: locationName,
          score: result.score,
          zone: result.zone,
          summary: result.summary,
          status: "PENDING",
          reportedByUserId: session.sub,
          expiresAt,
        },
      });
    }

    // Mask to YELLOW to hide from user until admin verifies
    return NextResponse.json({
      score: 50,
      zone: "YELLOW",
      summary: "Potential threat detected in this area. Sent to authorities for verification. Please remain cautious.",
      markers: [],
      location: locationName,
    });
  }

  return NextResponse.json({
    score: result.score,
    zone: result.zone,
    summary: result.summary,
    markers: result.markers ?? [],
    location: locationName,
  });
}
