import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionPayload } from "@/lib/auth-user";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

export async function GET() {
  return NextResponse.json({ message: "FIR API working" });
}

export async function POST(req: NextRequest) {
  const session = await getSessionPayload();
  if (!session || session.role !== "TOURIST") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const incidentDate = formData.get("incidentDate") as string;
    const incidentTime = formData.get("incidentTime") as string;
    const incidentDateTimeStr = `${incidentDate}T${incidentTime}:00Z`;
    const incidentDateTime = new Date(incidentDateTimeStr);

    if (isNaN(incidentDateTime.getTime())) {
      return NextResponse.json({ error: "Invalid date/time" }, { status: 400 });
    }

    const formSchema = z.object({
      complainantName: z.string().min(1, "Name required"),
      complainantAddress: z.string().optional(),
      complainantContact: z.string().min(10).optional(),
      incidentType: z.enum(["THEFT", "ASSAULT", "CYBERCRIME", "HARASSMENT", "ROBBERY", "OTHER"]),
      incidentDate: z.string(),
      incidentTime: z.string(),
      location: z.string().min(1, "Location required"),
      description: z.string().min(20, "Description too short"),
      accusedDetails: z.string().optional(),
    });

    const data = formSchema.parse({
      complainantName: formData.get("complainantName"),
      complainantAddress: formData.get("complainantAddress") || undefined,
      complainantContact: formData.get("complainantContact") || undefined,
      incidentType: formData.get("incidentType"),
      incidentDate,
      incidentTime,
      location: formData.get("location"),
      description: formData.get("description"),
      accusedDetails: formData.get("accusedDetails"),
    });

    // Generate FIR number
    const year = new Date().getFullYear();
    const count = await prisma.fIR.count({
      where: {
        firNumber: {
          startsWith: `FIR-${year}`,
        },
      },
    });
    const seq = (count + 1).toString().padStart(4, "0");
    const firNumber = `FIR-${year}-${seq}`;

    // Handle evidence files
    const evidenceUrls: string[] = [];
    const files = formData.getAll("evidence") as File[];
    if (files.length > 0) {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "fir", firNumber);
      await fs.mkdir(uploadDir, { recursive: true });
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 5 * 1024 * 1024) continue; // 5MB limit
        const ext = path.extname(file.name);
        const filename = `${Date.now()}-${i + 1}${ext}`;
        const filepath = path.join(uploadDir, filename);
        const bytes = await file.arrayBuffer();
        await fs.writeFile(filepath, Buffer.from(bytes));
        evidenceUrls.push(`/uploads/fir/${firNumber}/${filename}`);
      }
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const fir = await prisma.fIR.create({
      data: {
        firNumber,
        userId: session.sub,
        complainantName: data.complainantName,
        complainantAddress: data.complainantAddress || null,
        complainantContact: data.complainantContact || null,
        incidentType: data.incidentType,
        incidentDateTime,
        location: data.location,
        description: data.description,
        accusedDetails: data.accusedDetails || null,
        evidenceUrls: evidenceUrls.length ? JSON.stringify(evidenceUrls) : null,
        otpCode: otp,
        otpSentAt: new Date(),
      },
    });

    await prisma.otp.create({
      data: {
        firId: fir.id,
        code: otp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    console.log(`OTP ${otp} sent for FIR ${firNumber} to user ${session.sub}`);

    return NextResponse.json({ success: true, firNumber, message: "FIR submitted, check OTP" });
  } catch (error: any) {
    console.error("FIR submission error:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to submit FIR" }, { status: 500 });
  }
}
