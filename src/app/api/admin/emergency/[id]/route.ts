import { NextResponse } from "next/server";
import { getSessionPayload } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getSessionPayload();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const emergency = await prisma.emergencyEvent.update({
      where: { id: params.id },
      data: { resolved: true },
      select: { id: true, resolved: true, userId: true },
    });

    // If this user has no other active emergencies, revert their status to SAFE
    const pendingCount = await prisma.emergencyEvent.count({
      where: { userId: emergency.userId, resolved: false },
    });

    if (pendingCount === 0) {
      await prisma.user.update({
        where: { id: emergency.userId },
        data: { status: "SAFE" },
      });
    }

    return NextResponse.json({ emergency });
  } catch (error: any) {
    console.error("RESOLVE EMERGENCY ERROR:", error);
    return NextResponse.json(
      { error: "Failed to resolve emergency" },
      { status: 500 },
    );
  }
}
