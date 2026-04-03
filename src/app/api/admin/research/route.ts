/**
 * POST /api/admin/research — Run Research Agent
 * Admin-only. Accepts { city, state } and returns full structured JSON.
 */

import { NextResponse } from "next/server";
import { getSessionPayload } from "@/lib/auth-user";
import { runResearchAgent } from "@/lib/agent/research-agent";

export async function POST(req: Request) {
  const session = await getSessionPayload();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { city?: string; state?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const city = body.city?.trim();
  const state = body.state?.trim();

  if (!city) {
    return NextResponse.json({ error: "Missing city" }, { status: 400 });
  }

  try {
    const result = await runResearchAgent(city, state ?? "");
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Agent failed: ${msg}`, status: "error" },
      { status: 500 },
    );
  }
}
