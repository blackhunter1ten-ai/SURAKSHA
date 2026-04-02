import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionPayload } from "@/lib/auth-user";

const postSchema = z.object({
  lat: z.number().optional(),
  lng: z.number().optional(),
  accuracy: z.number().optional(),
  address: z.string().optional(),
  locationUnavailable: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await getSessionPayload();
  if (!session || session.role !== "TOURIST") {
    return NextResponse.json({ error: "Tourist login required" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    json = {};
  }
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { lat, lng, accuracy, address, locationUnavailable } = parsed.data;

  // Build Google Maps deep link if coordinates exist
  const mapsLink = lat != null && lng != null
    ? `https://maps.google.com/?q=${lat},${lng}`
    : null;

  // Create the emergency event
  const ev = await prisma.emergencyEvent.create({
    data: {
      userId: session.sub,
      lat: lat ?? null,
      lng: lng ?? null,
      accuracy: accuracy ?? null,
      address: address ?? null,
      locationUnavailable: locationUnavailable ?? false,
      stepsJson: JSON.stringify(["pending", "pending", "pending", "pending"]),
    },
  });

  // Update user status to EMERGENCY
  await prisma.user.update({
    where: { id: session.sub },
    data: { status: "EMERGENCY" },
  });

  // Log system activity
  await prisma.systemActivity.create({
    data: {
      message: "Emergency panic activated",
      kind: "warning",
      detail: `${session.name} — authorities notified${mapsLink ? ` | Location: ${mapsLink}` : " | Location unavailable"}`,
    },
  });

  // Look up the user's emergency contact info
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      emergencyContactName: true,
      emergencyContactPhone: true,
      emergencyContactRelation: true,
      name: true,
    },
  });

  // Attempt to find the emergency contact as a registered user (by phone)
  let contactNotified = false;
  let contactUserId: string | null = null;

  if (user?.emergencyContactPhone) {
    const contactUser = await prisma.user.findFirst({
      where: { phone: user.emergencyContactPhone },
      select: { id: true, name: true },
    });

    if (contactUser) {
      contactUserId = contactUser.id;

      // Create in-app notification for the emergency contact
      const notifData: Record<string, unknown> = {
        emergencyId: ev.id,
        triggeredBy: user.name,
        mapsLink,
        lat,
        lng,
        address: address ?? null,
      };

      await prisma.notification.create({
        data: {
          recipientId: contactUser.id,
          type: "SOS_ALERT",
          title: "🚨 EMERGENCY SOS ALERT",
          body: `${user.name} has triggered an emergency SOS!${mapsLink ? ` View location: ${mapsLink}` : " Location unavailable."}`,
          data: JSON.stringify(notifData),
        },
      });

      contactNotified = true;
    }
  }

  return NextResponse.json({
    ok: true,
    emergency: {
      id: ev.id,
      createdAt: ev.createdAt,
      lat: ev.lat,
      lng: ev.lng,
      accuracy: ev.accuracy,
      address: ev.address,
      locationUnavailable: ev.locationUnavailable,
      mapsLink,
      userName: user?.name ?? "A tourist",
    },
    emergencyContact: {
      name: user?.emergencyContactName ?? null,
      phone: user?.emergencyContactPhone ?? null,
      relation: user?.emergencyContactRelation ?? null,
      notified: contactNotified,
      contactUserId,
    },
  });
}

export async function GET() {
  const session = await getSessionPayload();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 401 });
  }

  const list = await prisma.emergencyEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({ emergencies: list });
}
