import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionPayload } from "@/lib/auth-user";
import { analyzeThreat, scoreToTTLHours } from "@/lib/threat-engine";

const bodySchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

const CACHE_RADIUS_DEG = 0.005; // ~500 m — tighter cache for accuracy

// POST /api/threat-score
export async function POST(req: Request) {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  let json: unknown;
  try { json = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { lat, lng } = parsed.data;
  const now = new Date();

  // ── 1. Cache check: Look for an active VERIFIED threat first (~500 m) ──
  const cachedVerified = await prisma.threatZone.findFirst({
    where: {
      lat:       { gte: lat - CACHE_RADIUS_DEG, lte: lat + CACHE_RADIUS_DEG },
      lng:       { gte: lng - CACHE_RADIUS_DEG, lte: lng + CACHE_RADIUS_DEG },
      expiresAt: { gt: now },
      status:    "VERIFIED",
    },
    orderBy: { createdAt: "desc" },
  });

  if (cachedVerified) {
    return NextResponse.json({
      score:     cachedVerified.score,
      zone:      cachedVerified.zone,
      location:  cachedVerified.location,
      summary:   cachedVerified.summary,
      expiresAt: cachedVerified.expiresAt,
      cached:    true,
      markers:   [],
    });
  }

  // ── 2. Reverse geocode via Nominatim ──────────────────────────────────────
  let locationName = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  try {
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "User-Agent": "Suraksha-Safety-App/1.0" } },
    );
    if (geoRes.ok) {
      const geoData = await geoRes.json();
      locationName = geoData.display_name?.split(",").slice(0, 3).join(", ") ?? locationName;
    }
  } catch {
    console.warn("[threat-score] Nominatim failed, using coordinates");
  }

  // ── 3. AI + real API threat analysis ────────────────────────────────────
  const { score, zone, summary, markers } = await analyzeThreat(locationName, {
    lat,
    lng,
  });

  // ── 4. Dynamic TTL based on threat score ─────────────────────────────────
  const ttlHours = scoreToTTLHours(score);
  const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

  // ── 5. Persist to DB with deduplication for PENDING status ────────────────
  if ((zone === "RED" || zone === "ORANGE") && session.sub) {
    const recentPending = await prisma.threatZone.findFirst({
      where: {
        lat: { gte: lat - CACHE_RADIUS_DEG, lte: lat + CACHE_RADIUS_DEG },
        lng: { gte: lng - CACHE_RADIUS_DEG, lte: lng + CACHE_RADIUS_DEG },
        expiresAt: { gt: now },
        status: "PENDING",
      },
    });

    if (!recentPending) {
      await prisma.threatZone.create({
        data: { 
          lat, lng, location: locationName, score, zone, summary, 
          status: "PENDING", reportedByUserId: session.sub, expiresAt 
        },
      });
    }

    // Return YELLOW safely for unverified threats
    return NextResponse.json({
      score: 50, zone: "YELLOW",
      location: locationName,
      summary: "Potential threat detected in this area. Sent to authorities for verification.",
      expiresAt, ttlHours, cached: false, markers: [],
    });
  }

  console.log(`[threat-score] ${zone} (${score}) for "${locationName}" — expires in ${ttlHours}h`);

  return NextResponse.json({
    score,
    zone,
    location: locationName,
    summary,
    expiresAt,
    ttlHours,
    cached: false,
    markers: markers ?? [],
  });
}
