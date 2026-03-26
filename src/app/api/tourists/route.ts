import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionPayload } from "@/lib/auth-user";

export async function GET() {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role === "ADMIN") {
    const tourists = await prisma.user.findMany({
      where: { role: "TOURIST" },
      select: {
        id: true,
        name: true,
        email: true,
        lat: true,
        lng: true,
        address: true,
        status: true,
        kycStatus: true,
        locationTrackingStatus: true,
        phone: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        updatedAt: true,
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ tourists });
  }

  const self = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      name: true,
      email: true,
      lat: true,
      lng: true,
      address: true,
      status: true,
      kycStatus: true,
      locationTrackingStatus: true,
      phone: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ tourists: self ? [self] : [] });
}
