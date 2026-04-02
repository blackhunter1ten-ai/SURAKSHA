import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const DEMO_PASSWORD = "rohan#1234";
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  await prisma.user.upsert({
    where: { email: "admin@aarambchain.gov" },
    update: { passwordHash },
    create: {
      email: "admin@aarambchain.gov",
      passwordHash,
      name: "Authority Admin",
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "john@demo.com" },
    update: { passwordHash },
    create: {
      email: "john@demo.com",
      passwordHash,
      name: "John Smith",
      role: "TOURIST",
      lat: 28.6129,
      lng: 77.2295,
      address: "Tourist Information Center, Rajpath, India Gate, New Delhi, India",
      status: "SAFE",
      kycStatus: "Completed",
      locationTrackingStatus: "Pending",
    },
  });

  await prisma.user.upsert({
    where: { email: "maria@demo.com" },
    update: { passwordHash },
    create: {
      email: "maria@demo.com",
      passwordHash,
      name: "Maria Garcia",
      role: "TOURIST",
      lat: 40.758,
      lng: -73.9855,
      address: "Visitor Rest Area, New York, USA",
      status: "SAFE",
      kycStatus: "Processing",
      locationTrackingStatus: "Pending",
    },
  });

  await prisma.user.upsert({
    where: { email: "alex@demo.com" },
    update: { passwordHash },
    create: {
      email: "alex@demo.com",
      passwordHash,
      name: "Alex Kumar",
      role: "TOURIST",
      lat: 28.55,
      lng: 77.2,
      address: "Connaught Place, New Delhi",
      status: "WARNING",
      kycStatus: "Complete",
      locationTrackingStatus: "Complete",
    },
  });

  await prisma.user.upsert({
    where: { email: "sam@demo.com" },
    update: { passwordHash },
    create: {
      email: "sam@demo.com",
      passwordHash,
      name: "Sam Lee",
      role: "TOURIST",
      lat: 28.62,
      lng: 77.21,
      address: "Restricted zone approach, Delhi",
      status: "EMERGENCY",
      kycStatus: "Complete",
      locationTrackingStatus: "Complete",
    },
  });



  const actCount = await prisma.systemActivity.count();
  if (actCount === 0) {
    await prisma.systemActivity.createMany({
      data: [
        {
          message: "Tourist ID verified",
          kind: "success",
          detail: "John Doe — Checkpoint A",
        },
        {
          message: "Geo-fence warning",
          kind: "warning",
          detail: "Tourist approaching restricted area",
        },
        {
          message: "Health data received",
          kind: "info",
          detail: "IoT band — Normal vitals",
        },
      ],
    });

    // Seed demo FIRs
    const john = await prisma.user.findUnique({ where: { email: "john@demo.com" } });
    if (john) {
      await prisma.fIR.create({
        data: {
          firNumber: "FIR-2024-0001",
          userId: john.id,
          complainantName: john.name,
          complainantContact: "+1-555-0123",
          incidentType: "THEFT",
          incidentDateTime: new Date("2024-10-01T14:30:00Z"),
          location: "Connaught Place, Delhi",
          description: "Wallet stolen while shopping. Suspect fled on bike.",
          accusedDetails: "Male, 30s, black shirt",
          status: "PENDING",
        },
      });
    }
  }

  // ── Seed demo Geo-Fences ──────────────────────────────────
  const fenceCount = await prisma.geoFence.count();
  if (fenceCount === 0) {
    await prisma.geoFence.createMany({
      data: [
        {
          name: "India Gate Restricted Perimeter",
          type: "circle",
          centerLat: 28.6129,
          centerLng: 77.2295,
          radius: 500,
          zone: "RED",
          active: true,
          description: "High-security zone around India Gate memorial. Tourists must stay outside this perimeter after 10 PM.",
        },
        {
          name: "Connaught Place Market Zone",
          type: "circle",
          centerLat: 28.6315,
          centerLng: 77.2167,
          radius: 800,
          zone: "ORANGE",
          active: true,
          description: "Elevated pickpocketing risk in Connaught Place inner circle. Stay alert and watch belongings.",
        },
        {
          name: "Red Fort Security Buffer",
          type: "circle",
          centerLat: 28.6562,
          centerLng: 77.2410,
          radius: 350,
          zone: "YELLOW",
          active: true,
          description: "Security buffer around Red Fort. Photography restrictions apply after sunset.",
        },
        {
          name: "Chandni Chowk Narrow Lanes",
          type: "polygon",
          vertices: JSON.stringify([
            { lat: 28.6560, lng: 77.2280 },
            { lat: 28.6580, lng: 77.2340 },
            { lat: 28.6540, lng: 77.2360 },
            { lat: 28.6520, lng: 77.2300 },
          ]),
          zone: "ORANGE",
          active: true,
          description: "Congested market area with very narrow lanes. Risk of getting lost. Keep GPS tracking on.",
        },
      ],
    });
    console.log("  ✅ Seeded 4 demo geo-fences");
  }
}

main()

  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
