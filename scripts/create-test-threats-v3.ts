import { PrismaClient } from "@prisma/client";
import { scoreToTTLHours } from "../src/lib/threat-engine";

const prisma = new PrismaClient();

async function main() {
  const baseLat = 30.2785;
  const baseLng = 78.0020;
  const now = Date.now();

  const threats = [
    {
      lat: baseLat + 0.003,
      lng: baseLng - 0.002,
      location: "North Transit Hub (Protest)",
      score: 75,
      zone: "RED",
      summary: "HIGH RISK: A violent protest has erupted near the main transit hub causing property damage. Avoid the area.",
      status: "PENDING",
      expiresAt: new Date(now + scoreToTTLHours(75) * 60 * 60 * 1000)
    },
    {
      lat: baseLat - 0.004,
      lng: baseLng + 0.003,
      location: "South Avenue (Suspicious Package)",
      score: 65,
      zone: "ORANGE",
      summary: "ELEVATED RISK: Bomb squad investigating a suspicious package. Road closures in effect.",
      status: "PENDING",
      expiresAt: new Date(now + scoreToTTLHours(65) * 60 * 60 * 1000)
    },
    {
      lat: baseLat + 0.001,
      lng: baseLng + 0.004,
      location: "East Plaza (Pickpocketing Ring)",
      score: 45,
      zone: "YELLOW",
      summary: "MODERATE RISK: Reports of an organized pickpocketing ring targeting tourists in this plaza this afternoon.",
      status: "PENDING",
      expiresAt: new Date(now + scoreToTTLHours(45) * 60 * 60 * 1000)
    }
  ];

  for (const t of threats) {
    await prisma.threatZone.create({ data: t as any });
  }

  console.log("3 more static dummy threats (RED, ORANGE, YELLOW) inserted into the database!");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
