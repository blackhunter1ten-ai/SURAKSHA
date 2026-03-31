import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

async function main() {
  const baseLat = 30.264230;
  const baseLng = 77.999058;
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const MIN_DISTANCE_FROM_CURRENT_METERS = 300;

  const threats = [
    {
      lat: baseLat + 0.015,
      lng: baseLng + 0.010,
      location: "Rajpur Road Market (Armed Robbery)",
      score: 78,
      zone: "RED",
      summary: "HIGH RISK: Armed gang carrying weapons sighted in the busy Rajpur Road market area. Multiple shopkeepers reported threats. Avoid immediately.",
      status: "PENDING",
      expiresAt: new Date(now + 48 * 60 * 60 * 1000),
    },
    {
      lat: baseLat - 0.014,
      lng: baseLng + 0.012,
      location: "Clock Tower Chowk (Crowd Stampede Risk)",
      score: 72,
      zone: "RED",
      summary: "HIGH RISK: Dangerously overcrowded religious procession at Clock Tower. Risk of stampede. Police cordon in effect. Tourists advised to stay away.",
      status: "PENDING",
      expiresAt: new Date(now + 48 * 60 * 60 * 1000),
    },
    {
      lat: baseLat + 0.010,
      lng: baseLng - 0.015,
      location: "Paltan Bazaar (Pickpocket Hotspot)",
      score: 62,
      zone: "ORANGE",
      summary: "ELEVATED RISK: Multiple tourist wallets and mobile phones stolen at Paltan Bazaar this afternoon. Organized gang operating in the area.",
      status: "PENDING",
      expiresAt: new Date(now + 7 * DAY),
    },
    {
      lat: baseLat - 0.015,
      lng: baseLng - 0.010,
      location: "Haridwar Bypass Road (Vehicle Theft)",
      score: 58,
      zone: "ORANGE",
      summary: "ELEVATED RISK: Spike in tourist vehicle break-ins on Haridwar Bypass. Travel in convoy after dark. Report suspicious activity to local police.",
      status: "PENDING",
      expiresAt: new Date(now + 7 * DAY),
    },
    {
      lat: baseLat + 0.018,
      lng: baseLng + 0.000,
      location: "Forest Trail (Wildlife Alert)",
      score: 55,
      zone: "ORANGE",
      summary: "ELEVATED RISK: Wild elephant spotted 500m off the main forest trail near the waterfall trek route. Forest department has issued alert.",
      status: "PENDING",
      expiresAt: new Date(now + 7 * DAY),
    },
  ];

  for (let index = 0; index < threats.length; index++) {
    const t = threats[index];
    let dist = distanceMeters(baseLat, baseLng, t.lat, t.lng);

    // Ensure every threat marker is meaningfully different from the current/base location.
    if (dist < MIN_DISTANCE_FROM_CURRENT_METERS) {
      const nudge = 0.003 + index * 0.0004;
      t.lat = baseLat + nudge;
      t.lng = baseLng - nudge;
      dist = distanceMeters(baseLat, baseLng, t.lat, t.lng);
    }

    if (dist < MIN_DISTANCE_FROM_CURRENT_METERS) {
      throw new Error(
        `Threat coordinate still too close to current location: ${t.location} (${dist.toFixed(1)}m)`
      );
    }

    await (prisma.threatZone as any).create({ data: t });
    console.log(`  ✓ Created: ${t.zone} — ${t.location}`);
  }

  console.log(`\n✅ ${threats.length} more threat zones added to the database!`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
