import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionPayload } from "@/lib/auth-user";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

export async function GET() {
  return NextResponse.json({ message: "Incident Report API working" });
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
      complainantContact: z.string().optional(),
      incidentType: z.enum(["THEFT", "ASSAULT", "CYBERCRIME", "HARASSMENT", "ROBBERY", "OTHER"]),
      incidentDate: z.string(),
      incidentTime: z.string(),
      location: z.string().min(1, "Location required"),
      description: z.string().min(20, "Description too short"),
      accusedDetails: z.string().optional(),
      severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
      evidenceNotes: z.string().optional(),
    });

    const data = formSchema.parse({
      complainantName: formData.get("complainantName"),
      complainantContact: formData.get("complainantContact") || undefined,
      incidentType: formData.get("incidentType"),
      incidentDate,
      incidentTime,
      location: formData.get("location"),
      description: formData.get("description"),
      accusedDetails: formData.get("accusedDetails"),
      severity: formData.get("severity") || undefined,
      evidenceNotes: formData.get("evidenceNotes") || undefined,
    });

    // Evidence is COMPULSORY
    const files = formData.getAll("evidence") as File[];
    if (files.length === 0 || (files.length === 1 && files[0].size === 0)) {
      return NextResponse.json(
        { error: "Digital evidence is required. Please upload at least one photo, video, or document." },
        { status: 400 }
      );
    }

    // Check total size (50MB max)
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Total evidence size exceeds 50MB limit." },
        { status: 400 }
      );
    }

    // Generate IR number (IR-01, IR-02, ...)
    const count = await prisma.fIR.count();
    const seq = (count + 1).toString().padStart(2, "0");
    const firNumber = `IR-${seq}`;

    // Handle evidence files
    const evidenceUrls: string[] = [];
    const uploadDir = path.join(process.cwd(), "public", "uploads", "fir", firNumber);
    await fs.mkdir(uploadDir, { recursive: true });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size === 0) continue;
      if (file.size > 50 * 1024 * 1024) continue; // skip any single file over 50MB
      const ext = path.extname(file.name) || ".bin";
      const filename = `${Date.now()}-${i + 1}${ext}`;
      const filepath = path.join(uploadDir, filename);
      const bytes = await file.arrayBuffer();
      await fs.writeFile(filepath, Buffer.from(bytes));
      evidenceUrls.push(`/uploads/fir/${firNumber}/${filename}`);
    }

    if (evidenceUrls.length === 0) {
      return NextResponse.json(
        { error: "Failed to process evidence files. Please try again." },
        { status: 400 }
      );
    }

    const fir = await prisma.fIR.create({
      data: {
        firNumber,
        userId: session.sub,
        complainantName: data.complainantName,
        complainantAddress: null,
        complainantContact: data.complainantContact || null,
        incidentType: data.incidentType,
        incidentDateTime,
        location: data.location,
        description: data.description,
        accusedDetails: data.accusedDetails || null,
        evidenceUrls: JSON.stringify(evidenceUrls),
        evidenceNotes: data.evidenceNotes || null,
        severity: data.severity || "MEDIUM",
        status: "PENDING",
      },
    });

    console.log(`[incident] Report ${firNumber} submitted by user ${session.sub} with ${evidenceUrls.length} evidence files`);

    return NextResponse.json({ success: true, firNumber, message: "Incident report submitted successfully" });
  } catch (error: any) {
    console.error("Incident report submission error:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to submit incident report" }, { status: 500 });
  }
}
