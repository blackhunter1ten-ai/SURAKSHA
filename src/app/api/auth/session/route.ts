import { NextResponse } from "next/server";
import { getSessionPayload } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ user: null });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        kycStatus: true,
        locationTrackingStatus: true,
        phone: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
      },
    });

    return NextResponse.json({ user: user ?? null, session });
  } catch (error: any) {
    console.error("SESSION ERROR:", error);
    return NextResponse.json({ error: "Failed to fetch session data" }, { status: 500 });
  }
}
