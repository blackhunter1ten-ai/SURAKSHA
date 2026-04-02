import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionPayload } from "@/lib/auth-user";

export async function GET() {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifications = await prisma.notification.findMany({
    where: { recipientId: session.sub },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const unreadCount = await prisma.notification.count({
    where: { recipientId: session.sub, read: false },
  });

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(req: Request) {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: { id?: string; markAllRead?: boolean } = {};
  try {
    json = await req.json();
  } catch {
    // empty
  }

  if (json.markAllRead) {
    await prisma.notification.updateMany({
      where: { recipientId: session.sub, read: false },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  }

  if (json.id) {
    await prisma.notification.update({
      where: { id: json.id },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Missing id or markAllRead" }, { status: 400 });
}
