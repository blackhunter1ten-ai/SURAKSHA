import { PrismaClient } from "@prisma/client";
import { scoreToTTLHours } from "../src/lib/threat-engine";

const prisma = new PrismaClient();

async function main() {
  const baseLat = 30.2785;
  const baseLng = 78.0020;
  const now = Date.now();

  // 1. Red threat
  const redTTL = scoreToTTLHours(85);
  await prisma.threatZone.create({
    data: {
      lat: baseLat + 0.001,
      lng: baseLng + 0.001,
      location: "City Square (Terrorist Incident)",
      score: 85,
      zone: "RED",
      summary: "HIGH RISK: Suspected terrorist attack or severe violent disruption detected in this highly populated precinct. Avoid the area immediately.",
      status: "PENDING",
      expiresAt: new Date(now + redTTL * 60 * 60 * 1000)
    }
  });

  // 2. Orange threat
  const orangeTTL = scoreToTTLHours(65);
  await prisma.threatZone.create({
    data: {
      lat: baseLat - 0.0015,
      lng: baseLng - 0.002,
      location: "Local Alleyway (Robbery)",
      score: 65,
      zone: "ORANGE",
      summary: "ELEVATED RISK: A string of armed robberies and muggings has been reported in this corridor over the last few hours. Remain vigilant.",
      status: "PENDING",
      expiresAt: new Date(now + orangeTTL * 60 * 60 * 1000)
    }
  });

  console.log("Both RED and ORANGE simulated threats successfully inserted into the database!");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
