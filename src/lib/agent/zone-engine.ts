/**
 * zone-engine.ts — Zone Recommendation Engine
 * Groups scored incidents by area and recommends admin zones.
 */

import type { ScoredIncident, RiskLevel } from "./scorer";

export interface ZoneRecommendation {
  zone_name: string;
  location: string;
  district: string;
  state: string;
  primary_threat: string;
  supporting_incident_ids: string[];
  confidence_score: number;
  suggested_risk_level: RiskLevel;
  reason: string;
  admin_action: "review" | "create_zone" | "urgent_review" | "monitor";
}

/** Normalize location key for grouping */
function locationKey(inc: ScoredIncident): string {
  return [
    (inc.location?.district ?? "").toLowerCase().trim(),
    (inc.location?.state ?? "").toLowerCase().trim(),
  ]
    .filter(Boolean)
    .join("|") || "unknown";
}

/** Generate zone recommendations from scored incidents */
export function generateZoneRecommendations(
  incidents: ScoredIncident[],
): ZoneRecommendation[] {
  // Group by district+state
  const groups = new Map<string, ScoredIncident[]>();

  for (const inc of incidents) {
    const key = locationKey(inc);
    const arr = groups.get(key) ?? [];
    arr.push(inc);
    groups.set(key, arr);
  }

  const recommendations: ZoneRecommendation[] = [];

  for (const [, group] of Array.from(groups)) {
    if (group.length === 0) continue;

    // Pick the highest severity incident as the primary
    const sorted = [...group].sort((a, b) => b.confidence_score - a.confidence_score);
    const primary = sorted[0];

    // Calculate aggregate confidence
    const avgConfidence = Math.round(
      group.reduce((sum: number, inc: ScoredIncident) => sum + inc.confidence_score, 0) / group.length,
    );

    // Boost confidence for clusters (multiple incidents in same area = pattern)
    const clusterBoost = Math.min(15, (group.length - 1) * 5);
    const finalConfidence = Math.min(100, avgConfidence + clusterBoost);

    // Determine risk level
    let riskLevel: RiskLevel;
    const hasCritical = group.some((i: ScoredIncident) => i.severity === "critical");
    const hasHigh = group.some((i: ScoredIncident) => i.severity === "high");
    const multiSource = group.reduce((s: number, i: ScoredIncident) => s + i.source_count, 0) >= 3;

    if (hasCritical && multiSource) riskLevel = "CRITICAL";
    else if (hasCritical || (hasHigh && multiSource)) riskLevel = "HIGH RISK";
    else if (hasHigh || finalConfidence >= 65) riskLevel = "WARNING";
    else if (finalConfidence >= 40) riskLevel = "CAUTION";
    else riskLevel = "SAFE";

    // Determine admin action
    let adminAction: ZoneRecommendation["admin_action"];
    if (riskLevel === "CRITICAL") adminAction = "urgent_review";
    else if (riskLevel === "HIGH RISK") adminAction = "create_zone";
    else if (riskLevel === "WARNING") adminAction = "review";
    else adminAction = "monitor";

    // Categories in this zone
    const categories = Array.from(new Set(group.map((i: ScoredIncident) => i.category)));

    // Build reason
    const reason = buildReason(group, categories, riskLevel);

    // Zone name
    const zoneName = `${primary.location?.district || primary.location?.place || "Unknown"} — ${primary.category.replace(/_/g, " ").toUpperCase()}`;

    recommendations.push({
      zone_name: zoneName,
      location: primary.location?.place ?? "",
      district: primary.location?.district ?? "",
      state: primary.location?.state ?? "",
      primary_threat: primary.category,
      supporting_incident_ids: group.map((i: ScoredIncident) => i.incident_id),
      confidence_score: finalConfidence,
      suggested_risk_level: riskLevel,
      reason,
      admin_action: adminAction,
    });
  }

  // Sort by confidence desc
  recommendations.sort((a, b) => b.confidence_score - a.confidence_score);
  return recommendations;
}

function buildReason(
  group: ScoredIncident[],
  categories: string[],
  riskLevel: RiskLevel,
): string {
  const totalSources = group.reduce((s, i) => s + i.source_count, 0);
  const incidentCount = group.length;
  const catList = categories.map((c) => c.replace(/_/g, " ")).join(", ");

  if (riskLevel === "CRITICAL") {
    return `CRITICAL: ${incidentCount} severe incident(s) — ${catList}. Confirmed by ${totalSources} trusted source(s). Immediate admin action recommended.`;
  }
  if (riskLevel === "HIGH RISK") {
    return `HIGH RISK: ${incidentCount} incident(s) involving ${catList}. Backed by ${totalSources} source(s). Zone creation strongly recommended.`;
  }
  if (riskLevel === "WARNING") {
    return `WARNING: ${incidentCount} reported incident(s) — ${catList}. ${totalSources} source(s) confirm. Admin should review for potential zone creation.`;
  }
  return `MONITOR: ${incidentCount} low-severity indicator(s) — ${catList}. ${totalSources} source(s). Keep under observation.`;
}
