import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const lat = 30.2785;
  const lng = 78.0020;
  const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours

  await prisma.threatZone.create({
    data: {
      lat,
      lng,
      location: "Near Your Exact Location (Test Event)",
      score: 85,
      zone: "RED",
      summary: "SIMULATED THREAT: Suspected riot activity detected near your vicinity. Please remain indoors. [This is a demonstration threat sent directly to Police Admin for Verification]",
      status: "PENDING",
      expiresAt
    }
  });

  console.log("Simulated dummy threat successfully inserted into the database!");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
