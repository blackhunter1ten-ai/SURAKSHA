import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionPayload } from "@/lib/auth-user";

const postSchema = z.object({
  lat: z.number().optional(),
  lng: z.number().optional(),
  accuracy: z.number().optional(),
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

  const ev = await prisma.emergencyEvent.create({
    data: {
      userId: session.sub,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      accuracy: parsed.data.accuracy,
      stepsJson: JSON.stringify(["pending", "pending", "pending", "pending"]),
    },
  });

  await prisma.user.update({
    where: { id: session.sub },
    data: { status: "EMERGENCY" },
  });

  await prisma.systemActivity.create({
    data: {
      message: "Emergency panic activated",
      kind: "warning",
      detail: `${session.name} — authorities notified`,
    },
  });

  return NextResponse.json({
    ok: true,
    emergency: { id: ev.id, createdAt: ev.createdAt },
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
