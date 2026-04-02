import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionPayload } from "@/lib/auth-user";

export async function POST(req: Request) {
  const session = await getSessionPayload();
  if (!session || session.role !== "TOURIST") {
    return NextResponse.json({ error: "Tourist login required" }, { status: 401 });
  }

  let json: { emergencyId?: string } = {};
  try {
    json = await req.json();
  } catch {
    // empty
  }

  if (!json.emergencyId) {
    return NextResponse.json({ error: "Missing emergencyId" }, { status: 400 });
  }

  // Get the emergency event details
  const emergency = await prisma.emergencyEvent.findUnique({
    where: { id: json.emergencyId },
    include: { user: { select: { name: true, phone: true } } },
  });

  if (!emergency) {
    return NextResponse.json({ error: "Emergency not found" }, { status: 404 });
  }

  // Build Google Maps link
  const mapsLink =
    emergency.lat != null && emergency.lng != null
      ? `https://maps.google.com/?q=${emergency.lat},${emergency.lng}`
      : null;

  // Find all admin users
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  if (admins.length === 0) {
    return NextResponse.json({ ok: true, notifiedAdmins: 0 });
  }

  // Create a notification for each admin
  const notifData = JSON.stringify({
    emergencyId: emergency.id,
    triggeredBy: emergency.user.name,
    phone: emergency.user.phone,
    lat: emergency.lat,
    lng: emergency.lng,
    address: emergency.address,
    mapsLink,
  });

  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      recipientId: admin.id,
      type: "SOS_ALERT",
      title: "🚨 CRITICAL SOS — Immediate Response Required",
      body: `${emergency.user.name} has triggered an emergency SOS!${mapsLink ? ` Location: ${mapsLink}` : " Location unavailable."} Respond immediately.`,
      data: notifData,
    })),
  });

  // Also create a system activity for the admin event stream
  await prisma.systemActivity.create({
    data: {
      message: "Admin SOS notification dispatched",
      kind: "warning",
      detail: `All ${admins.length} administrators notified about ${emergency.user.name}'s emergency`,
    },
  });

  return NextResponse.json({ ok: true, notifiedAdmins: admins.length });
}
