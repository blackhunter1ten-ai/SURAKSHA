/**
 * scorer.ts — Confidence & Risk Level Scoring
 * Calculates confidence_score and risk_level for each incident.
 */

import type { DeduplicatedIncident } from "./deduplicator";

export type RiskLevel = "SAFE" | "CAUTION" | "WARNING" | "HIGH RISK" | "CRITICAL";

export interface ScoredIncident extends DeduplicatedIncident {
  incident_id: string;
  confidence_score: number;     // 0-100
  risk_level: RiskLevel;
  trust_score: number;          // from source
}

let idCounter = 0;

function generateId(): string {
  idCounter++;
  return `INC-${Date.now().toString(36).toUpperCase()}-${String(idCounter).padStart(3, "0")}`;
}

/** Calculate hours since publication */
function hoursSincePublished(dateStr: string | undefined): number {
  if (!dateStr) return 72; // assume old if unknown
  const ms = Date.now() - new Date(dateStr).getTime();
  if (isNaN(ms)) return 72;
  return Math.max(0, ms / 3_600_000);
}

/** Recency multiplier — newer = higher */
function recencyFactor(hours: number): number {
  if (hours < 6) return 1.0;
  if (hours < 24) return 0.9;
  if (hours < 48) return 0.8;
  if (hours < 72) return 0.65;
  if (hours < 168) return 0.5; // > 3 days
  return 0.3; // > 1 week
}

/** Severity base score */
function severityBase(severity: string): number {
  switch (severity) {
    case "critical": return 90;
    case "high": return 70;
    case "medium": return 45;
    case "low": return 20;
    default: return 30;
  }
}

/** Source count multiplier */
function sourceMultiplier(count: number): number {
  if (count >= 4) return 1.3;
  if (count >= 3) return 1.2;
  if (count >= 2) return 1.1;
  return 1.0;
}

/** Assign risk level based on confidence score */
function assignRiskLevel(confidence: number, severity: string, sourceCount: number): RiskLevel {
  // Multi-source + high severity → escalate
  if (severity === "critical" && sourceCount >= 2) return "CRITICAL";
  if (severity === "critical") return "HIGH RISK";
  if (severity === "high" && sourceCount >= 2) return "HIGH RISK";
  if (confidence >= 80) return "HIGH RISK";
  if (confidence >= 60) return "WARNING";
  if (confidence >= 40) return "CAUTION";
  return "SAFE";
}

/** Score all incidents */
export function scoreIncidents(
  incidents: DeduplicatedIncident[],
  sourceTrustScores: Record<string, number>,
): ScoredIncident[] {
  idCounter = 0;

  return incidents.map((inc) => {
    const trustScore = sourceTrustScores[inc.source_name ?? ""] ?? 70;
    const hours = hoursSincePublished(inc.published_at);
    const recency = recencyFactor(hours);
    const base = severityBase(inc.severity);
    const sourceMult = sourceMultiplier(inc.source_count);

    // Confidence = weighted combination
    // 40% severity + 25% trust + 20% recency + 15% multi-source
    const confidence = Math.round(
      Math.min(100, Math.max(0,
        base * 0.4 +
        trustScore * 0.25 +
        recency * 100 * 0.20 +
        Math.min(100, inc.source_count * 25) * 0.15
      ) * sourceMult),
    );

    const riskLevel = assignRiskLevel(confidence, inc.severity, inc.source_count);

    return {
      ...inc,
      incident_id: generateId(),
      confidence_score: confidence,
      risk_level: riskLevel,
      trust_score: trustScore,
    };
  });
}
