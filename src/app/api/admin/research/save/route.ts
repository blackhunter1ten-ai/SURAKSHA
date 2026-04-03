/**
 * POST /api/admin/research/save — Save selected incidents to ThreatZone DB
 * Admin-only. Accepts array of incidents and creates ThreatZone records.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionPayload } from "@/lib/auth-user";
import { scoreToTTLHours } from "@/lib/threat-engine";

interface IncidentToSave {
  title: string;
  category: string;
  severity: string;
  summary: string;
  risk_level: string;
  confidence_score: number;
  location: {
    place: string;
    district: string;
    state: string;
    coordinates: { lat: number | null; lng: number | null };
  };
  source: {
    name: string;
    url: string;
  };
}

/** Map risk_level to existing zone codes */
function riskToZone(riskLevel: string): string {
  switch (riskLevel) {
    case "CRITICAL":
    case "HIGH RISK":
      return "RED";
    case "WARNING":
      return "ORANGE";
    case "CAUTION":
      return "YELLOW";
    default:
      return "GREEN";
  }
}

/** Map severity to 0-100 score */
function severityToScore(severity: string, confidence: number): number {
  const base: Record<string, number> = {
    critical: 85,
    high: 70,
    medium: 50,
    low: 25,
  };
  const s = base[severity] ?? 40;
  // Blend with confidence
  return Math.round(s * 0.7 + confidence * 0.3);
}

export async function POST(req: Request) {
  const session = await getSessionPayload();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { incidents?: IncidentToSave[] } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const incidents = body.incidents;
  if (!incidents || incidents.length === 0) {
    return NextResponse.json({ error: "No incidents provided" }, { status: 400 });
  }

  const created: string[] = [];
  const errors: string[] = [];

  for (const inc of incidents) {
    try {
      const score = severityToScore(inc.severity, inc.confidence_score);
      const zone = riskToZone(inc.risk_level);
      const ttlHours = scoreToTTLHours(score);

      const locationName = [inc.location?.place, inc.location?.district, inc.location?.state]
        .filter(Boolean)
        .join(", ");

      await prisma.threatZone.create({
        data: {
          lat: inc.location?.coordinates?.lat ?? 0,
          lng: inc.location?.coordinates?.lng ?? 0,
          location: locationName || inc.title,
          score,
          zone,
          summary: `[Agent] ${inc.summary}`,
          expiresAt: new Date(Date.now() + ttlHours * 3_600_000),
          status: "PENDING", // Admin must verify
          newsSource: inc.source?.url
            ? `${inc.source.name}: ${inc.source.url}`
            : inc.source?.name ?? null,
        },
      });

      created.push(inc.title);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Failed to save "${inc.title}": ${msg}`);
    }
  }

  return NextResponse.json({
    success: true,
    created: created.length,
    errors: errors.length > 0 ? errors : undefined,
    message: `${created.length} incident(s) saved as PENDING ThreatZones.`,
  });
}
