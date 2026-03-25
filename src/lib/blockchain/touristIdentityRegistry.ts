/**
 * Blockchain helper — Tourist Identity Registry
 *
 * MOCK MODE (demo/hackathon): simulates on-chain calls and generates
 * deterministic but realistic-looking tx hashes and token IDs.
 *
 * For production:
 *   - set RPC_URL and AUTHORITY_PRIVATE_KEY env vars
 *   - deploy contracts/TouristIdentityRegistry.sol
 *   - set CONTRACT_ADDRESS env var
 *   - swap the mock implementations below for real ethers.js calls
 */

import crypto from "crypto";

// ─── Mock token counter (in-memory; resets on restart) ───
let mockTokenCounter = 100;

/**
 * Build the EIP-191 message that the tourist wallet must sign
 * to prove ownership before we issue an on-chain ID.
 */
export function buildTouristIdRequestMessage(params: {
  userId: string;
  holderAddress: string;
  requestTs: number;
}): string {
  return [
    "SURAKSHA Tourist ID Request",
    `User: ${params.userId}`,
    `Wallet: ${params.holderAddress}`,
    `Timestamp: ${params.requestTs}`,
  ].join("\n");
}

/**
 * Issue a tourist identity on-chain (or mock it for demo).
 *
 * Returns { mock, tokenId, txHash }.
 */
export async function issueTouristIdentity(params: {
  holder: string;
  kycDataHash: string;
  itinerary: string;
  emergencyContacts: string;
  validUntil: bigint;
}): Promise<{ mock: boolean; tokenId: number; txHash: string }> {
  // ── Production path (when env vars are set) ──
  // if (process.env.RPC_URL && process.env.AUTHORITY_PRIVATE_KEY && process.env.CONTRACT_ADDRESS) {
  //   const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  //   const signer = new ethers.Wallet(process.env.AUTHORITY_PRIVATE_KEY, provider);
  //   const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, ABI, signer);
  //   const tx = await contract.issueTouristIdentity(
  //     params.holder, params.kycDataHash, params.itinerary,
  //     params.emergencyContacts, params.validUntil
  //   );
  //   const receipt = await tx.wait();
  //   const tokenId = receipt.logs[0]?.args?.tokenId?.toNumber() ?? 0;
  //   return { mock: false, tokenId, txHash: tx.hash };
  // }

  // ── Mock path (demo) ──
  mockTokenCounter += 1;
  const tokenId = mockTokenCounter;

  // Deterministic but realistic tx hash
  const seed = `${params.holder}-${tokenId}-${Date.now()}`;
  const txHash = "0x" + crypto.createHash("sha256").update(seed).digest("hex");

  // Small delay to simulate network latency
  await new Promise((r) => setTimeout(r, 200));

  return { mock: true, tokenId, txHash };
}
