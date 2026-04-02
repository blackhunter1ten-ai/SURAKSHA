import { NextResponse } from "next/server";
import { getSessionPayload } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSessionPayload();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const firs = await prisma.fIR.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firNumber: true,
        complainantName: true,
        complainantContact: true,
        incidentType: true,
        incidentDateTime: true,
        location: true,
        description: true,
        accusedDetails: true,
        evidenceUrls: true,
        evidenceNotes: true,
        severity: true,
        status: true,
        adminNotes: true,
        rejectionReason: true,
        createdAt: true,
        verifiedAt: true,
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });

    return NextResponse.json({ firs });
  } catch (error: any) {
    console.error("ADMIN FIRS GET ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch incident reports" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getSessionPayload();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { firId, status, adminNotes, rejectionReason } = body;
    const VALID = ["PENDING", "APPROVED", "REJECTED", "INVESTIGATING", "RESOLVED", "CLOSED"];
    
    if (!firId || !status || !VALID.includes(status)) {
      return NextResponse.json(
        { error: "Invalid firId or status" },
        { status: 400 },
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = { status };
    
    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }
    
    if (status === "REJECTED" && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    if (status === "APPROVED") {
      updateData.verifiedAt = new Date();
    }

    const fir = await prisma.fIR.update({
      where: { id: firId },
      data: updateData,
      select: { id: true, firNumber: true, status: true, userId: true, complainantName: true, incidentType: true },
    });

    // ── Create Notification for the user ──────────────────────
    const notificationTitle = 
      status === "APPROVED" ? "✅ Report Approved" :
      status === "REJECTED" ? "❌ Report Needs Attention" :
      status === "INVESTIGATING" ? "🔍 Report Under Investigation" :
      status === "RESOLVED" ? "✅ Report Resolved" :
      status === "CLOSED" ? "📁 Report Closed" :
      "📋 Report Status Updated";

    const notificationBody =
      status === "APPROVED"
        ? `Your incident report ${fir.firNumber} has been verified and approved by authorities.`
        : status === "REJECTED"
          ? `Your incident report ${fir.firNumber} needs additional information. ${rejectionReason ? `Reason: ${rejectionReason}` : "Please contact support."}`
          : status === "INVESTIGATING"
            ? `Your incident report ${fir.firNumber} is now being actively investigated.`
            : status === "RESOLVED"
              ? `Your incident report ${fir.firNumber} has been resolved.`
              : `Your incident report ${fir.firNumber} status has been updated to ${status}.`;

    await prisma.notification.create({
      data: {
        recipientId: fir.userId,
        type: "SYSTEM",
        title: notificationTitle,
        body: notificationBody,
        data: JSON.stringify({
          firNumber: fir.firNumber,
          firId: fir.id,
          newStatus: status,
          adminNotes: adminNotes || null,
        }),
      },
    });

    // ── Log system activity ───────────────────────────────────
    await prisma.systemActivity.create({
      data: {
        message: `Incident report ${fir.firNumber} ${status.toLowerCase()}`,
        kind: status === "REJECTED" ? "warning" : "success",
        detail: `${fir.incidentType} — ${fir.complainantName}${adminNotes ? ` | Admin: ${adminNotes}` : ""}`,
      },
    });

    return NextResponse.json({ fir });
  } catch (error: any) {
    console.error("ADMIN FIR UPDATE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to update incident report" },
      { status: 500 },
    );
  }
}
