import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { signToken } from "@/lib/jwt-sign";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

// Allow optional space or hyphen after the country code
const indianPhoneRegex = /^(\+91[\-\s]?|91[\-\s]?)?[6-9]\d{9}$/;

const bodySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(indianPhoneRegex, "Enter a valid Indian mobile number"),
  alternativePhone: z.string().regex(indianPhoneRegex, "Enter a valid Indian mobile number"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  emergencyContactName: z.string().min(2, "Contact name is required"),
  emergencyContactPhone: z.string().regex(indianPhoneRegex, "Enter a valid Indian mobile number"),
  emergencyContactRelation: z.string().min(2, "Relation is required"),
  citizenship: z.string().refine((val) => val === "Indian Citizen", "Only Indian Citizens are currently supported"),
  aadhaarNumber: z.string().regex(/^\d{12}$/, "Aadhaar must be a 12-digit number"),
  consentLocation: z.boolean().refine((val) => val === true, "You must consent to location tracking"),
  consentCredentials: z.boolean().refine((val) => val === true, "You must consent to data storage"),
});

export async function POST(req: Request) {
  try {
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      const firstError = (parsed as any).error?.errors?.[0];
      return NextResponse.json({ error: firstError?.message ?? "Invalid input" }, { status: 400 });
    }

    const {
      name,
      email,
      phone,
      alternativePhone,
      address,
      password,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      citizenship,
      aadhaarNumber,
    } = parsed.data;

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone.replace(/[\-\s]/g, ""), // strip spaces/hyphens
        alternativePhone: alternativePhone.replace(/[\-\s]/g, ""),
        address,
        passwordHash,
        role: "TOURIST",
        emergencyContactName,
        emergencyContactPhone: emergencyContactPhone.replace(/[\-\s]/g, ""),
        emergencyContactRelation,
        citizenship,
        aadhaarNumber,
      },
    });

    // Auto-login after registration
    const token = await signToken({
      sub: user.id,
      role: "TOURIST",
      email: user.email,
      name: user.name,
    });

    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  } catch (error: any) {
    console.error("REGISTER ERROR:", error);
    return NextResponse.json({ error: "Server Error: " + error.message }, { status: 500 });
  }
}
