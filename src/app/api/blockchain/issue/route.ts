import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionPayload } from "@/lib/auth-user";
import {
  buildTouristIdRequestMessage,
  issueTouristIdentity,
} from "@/lib/blockchain/touristIdentityRegistry";

const bodySchema = z.object({
  holderAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "holderAddress must be an Ethereum address"),
  signature: z.string().min(10),
  requestTs: z.number().int(),
  kycDataHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "kycDataHash must be bytes32"),
  itinerary: z.string().max(200).default("Demo itinerary"),
  emergencyContacts: z.string().max(500).default("[]"),
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
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { holderAddress, signature, requestTs, kycDataHash, itinerary, emergencyContacts } =
    parsed.data;

  // Prevent replay: accept only requests from the last 5 min.
  const now = Date.now();
  const ageMs = Math.abs(now - requestTs);
  if (ageMs > 5 * 60 * 1000) {
    return NextResponse.json({ error: "Request expired" }, { status: 400 });
  }

  // Verify wallet signature (skip full verification in mock mode — accept as valid for demo).
  // In production, use: const recovered = ethers.verifyMessage(message, signature);
  const _message = buildTouristIdRequestMessage({
    userId: session.sub,
    holderAddress,
    requestTs,
  });
  void _message; // used in production for ethers.verifyMessage
  void signature;

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, did: true, blockchainIdStatus: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.blockchainIdStatus === "Complete") {
    return NextResponse.json({
      ok: true,
      alreadyComplete: true,
      did: user.did ?? null,
    });
  }

  // 30-day ID validity (time-bound).
  const validUntil = BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60);

  const issue = await issueTouristIdentity({
    holder: holderAddress,
    kycDataHash,
    itinerary,
    emergencyContacts,
    validUntil,
  });

  const did = `DID:eth:${holderAddress}`;

  await prisma.user.update({
    where: { id: session.sub },
    data: {
      did,
      blockchainIdStatus: "Complete",
    },
  });

  await prisma.blockchainActivity.create({
    data: {
      hash: issue.txHash,
      label: `Tourist ID anchored (tokenId: ${issue.tokenId})`,
      touristDid: did,
    },
  });

  return NextResponse.json({
    ok: true,
    mock: issue.mock,
    tokenId: issue.tokenId,
    txHash: issue.txHash,
    did,
  });
}
