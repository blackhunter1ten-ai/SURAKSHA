import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { supabase } from "@/lib/supabase";

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
  citizenship: z.enum(["Indian Citizen", "Foreign Citizen"]),
  aadhaarNumber: z.string().transform((v) => v.replace(/\s/g, "")).refine((v) => v.length >= 6, "Identification number must be at least 6 characters"),
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

    // Check if email already exists in our DB
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    // 1. Create Supabase Auth user — this sends a verification email automatically
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/verify`,
        data: { name },
      },
    });

    if (authError) {
      console.error("Supabase signUp error:", authError);
      // If user already exists in Supabase auth, still proceed (they might be re-registering)
      if (!authError.message.toLowerCase().includes("already registered")) {
        return NextResponse.json({ error: "Failed to create account: " + authError.message }, { status: 500 });
      }
    }

    const passwordHash = await hashPassword(password);

    // 2. Create user in our Prisma database (emailVerified = false until they click the email link)
    await prisma.user.create({
      data: {
        name,
        email,
        phone: phone.replace(/[\-\s]/g, ""),
        alternativePhone: alternativePhone.replace(/[\-\s]/g, ""),
        address,
        passwordHash,
        role: "TOURIST",
        emergencyContactName,
        emergencyContactPhone: emergencyContactPhone.replace(/[\-\s]/g, ""),
        emergencyContactRelation,
        citizenship,
        aadhaarNumber,
        emailVerified: false,
      },
    });

    // 3. Return success — user must verify email before they can log in
    return NextResponse.json({
      ok: true,
      requiresVerification: true,
      message: "Account created! Please check your email and click the verification link to activate your account.",
    });
  } catch (error: any) {
    console.error("REGISTER ERROR:", error);
    return NextResponse.json({ error: "Server Error: " + error.message }, { status: 500 });
  }
}
