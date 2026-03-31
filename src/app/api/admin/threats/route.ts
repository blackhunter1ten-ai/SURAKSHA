import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionPayload } from "@/lib/auth-user";

export async function GET() {
  const session = await getSessionPayload();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const threats = await prisma.threatZone.findMany({
      where: {
        status: { in: ["PENDING", "VERIFIED", "REJECTED"] },
      },
      include: {
        reportedBy: {
          select: { name: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ threats });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch threats" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getSessionPayload();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await req.json();
    const { id, status } = json as { id: string; status: string };

    if (!id || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const threat = await prisma.threatZone.update({
      where: { id },
      data: { status },
      include: {
        reportedBy: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, threat });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update threat" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getSessionPayload();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await req.json() as { id: string };
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await prisma.threatZone.delete({ where: { id } });
    return NextResponse.json({ success: true, deleted: id });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete threat" }, { status: 500 });
  }
}
