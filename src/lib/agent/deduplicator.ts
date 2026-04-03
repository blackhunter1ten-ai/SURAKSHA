/**
 * deduplicator.ts — Merge duplicate incident reports
 * Same event = same location + category + approximate time → merge sources.
 */

import type { ExtractedIncident } from "./ai-extractor";

export interface DeduplicatedIncident extends ExtractedIncident {
  supporting_sources: { name: string; url: string; published_at: string }[];
  source_count: number;
}

/** Normalize location string for comparison */
function normLocation(inc: ExtractedIncident): string {
  const parts = [
    inc.location?.place ?? "",
    inc.location?.district ?? "",
    inc.location?.state ?? "",
  ]
    .map((s) => s.toLowerCase().trim())
    .filter(Boolean);
  return parts.join("|");
}

/** Check if two incidents are about the same event */
function isSameEvent(a: ExtractedIncident, b: ExtractedIncident): boolean {
  // Same category
  if (a.category !== b.category) return false;

  // Same location (fuzzy)
  const locA = normLocation(a);
  const locB = normLocation(b);

  // Check if locations share significant overlap
  const partsA = locA.split("|");
  const partsB = locB.split("|");
  const overlap = partsA.filter((p) => p && partsB.some((q) => q.includes(p) || p.includes(q)));
  if (overlap.length === 0) return false;

  // Check time proximity (within 48 hours)
  if (a.published_at && b.published_at) {
    const timeA = new Date(a.published_at).getTime();
    const timeB = new Date(b.published_at).getTime();
    if (!isNaN(timeA) && !isNaN(timeB)) {
      const diffHrs = Math.abs(timeA - timeB) / 3_600_000;
      if (diffHrs > 48) return false;
    }
  }

  // Check title similarity (simple word overlap)
  const wordsA = new Set(a.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
  const wordsB = new Set(b.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
  const commonWords = Array.from(wordsA).filter((w) => wordsB.has(w));
  const similarTitle = commonWords.length >= Math.min(2, Math.min(wordsA.size, wordsB.size));

  return similarTitle || overlap.length >= 2;
}

/** Deduplicate incidents — merge same events, track supporting sources */
export function deduplicateIncidents(
  incidents: ExtractedIncident[],
): DeduplicatedIncident[] {
  const merged: DeduplicatedIncident[] = [];

  for (const inc of incidents) {
    // Find existing merged incident that matches
    const existing = merged.find((m) => isSameEvent(m, inc));

    if (existing) {
      // Add as supporting source
      existing.supporting_sources.push({
        name: inc.source_name ?? "Unknown",
        url: inc.source_url ?? "",
        published_at: inc.published_at ?? "",
      });
      existing.source_count++;

      // Upgrade severity if the new source says it's worse
      const severityRank: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
      if ((severityRank[inc.severity] ?? 0) > (severityRank[existing.severity] ?? 0)) {
        existing.severity = inc.severity;
      }

      // Merge risk indicators
      for (const ri of inc.risk_indicators ?? []) {
        if (!existing.risk_indicators.includes(ri)) {
          existing.risk_indicators.push(ri);
        }
      }

      // Use better coordinates if available
      if (
        inc.location?.coordinates?.lat != null &&
        existing.location?.coordinates?.lat == null
      ) {
        existing.location.coordinates = inc.location.coordinates;
      }
    } else {
      // New unique incident
      merged.push({
        ...inc,
        supporting_sources: [
          {
            name: inc.source_name ?? "Unknown",
            url: inc.source_url ?? "",
            published_at: inc.published_at ?? "",
          },
        ],
        source_count: 1,
      });
    }
  }

  return merged;
}
