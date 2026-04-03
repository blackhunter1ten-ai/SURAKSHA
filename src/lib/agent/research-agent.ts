/**
 * research-agent.ts — Main Orchestrator
 * Chains: Search → Filter → Scrape → AI Extract → Deduplicate → Score → Zone Recommend
 */

import { searchWeb } from "./search";
import { filterTrustedSources, TRUSTED_SOURCES } from "./filter";
import { scrapeArticles } from "./scraper";
import { extractIncidentsAI } from "./ai-extractor";
import { deduplicateIncidents } from "./deduplicator";
import { scoreIncidents, type ScoredIncident } from "./scorer";
import { generateZoneRecommendations, type ZoneRecommendation } from "./zone-engine";

// ── Output Types (matching user's JSON schema) ──────────────────────────────

export interface AgentOutput {
  query_region: string;
  generated_at: string;
  status: "success" | "partial" | "error";
  summary: {
    total_sources_checked: number;
    total_trusted_sources_used: number;
    total_incidents_found: number;
    high_priority_incidents: number;
  };
  incidents: AgentIncident[];
  recommended_zones: ZoneRecommendation[];
  notes: string[];
}

export interface AgentIncident {
  incident_id: string;
  title: string;
  category: string;
  risk_type: string;
  severity: string;
  risk_level: string;
  summary: string;
  location: {
    place: string;
    district: string;
    state: string;
    country: string;
    coordinates: { lat: number | null; lng: number | null };
  };
  published_at: string;
  source: {
    name: string;
    type: string;
    url: string;
    trust_score: number;
  };
  supporting_sources: { name: string; url: string; published_at: string }[];
  confidence_score: number;
  zone_recommendation: {
    recommended: boolean;
    zone_name: string;
    reason: string;
    suggested_risk_level: string;
    admin_action: string;
  };
}

// ── Main Agent Function ──────────────────────────────────────────────────────

export async function runResearchAgent(
  city: string,
  state: string,
): Promise<AgentOutput> {
  const notes: string[] = [];
  const startTime = Date.now();

  try {
    // 1. Search the web
    notes.push(`Searching for safety incidents in ${city}, ${state}...`);
    const searchResults = await searchWeb(city, state);
    notes.push(`Found ${searchResults.length} search results`);

    // 2. Filter trusted sources only
    const trusted = filterTrustedSources(searchResults);
    notes.push(`${trusted.length} results from trusted sources (${searchResults.length - trusted.length} untrusted filtered out)`);

    if (trusted.length === 0) {
      return {
        query_region: `${city}, ${state}`,
        generated_at: new Date().toISOString(),
        status: "partial",
        summary: {
          total_sources_checked: searchResults.length,
          total_trusted_sources_used: 0,
          total_incidents_found: 0,
          high_priority_incidents: 0,
        },
        incidents: [],
        recommended_zones: [],
        notes: [...notes, "No trusted sources found. Try a different region or check Serper API key."],
      };
    }

    // 3. Scrape articles
    notes.push(`Scraping ${trusted.length} articles...`);
    const scraped = await scrapeArticles(
      trusted.map((t) => ({ url: t.link, title: t.title })),
      5,
    );
    notes.push(`Successfully scraped ${scraped.length} of ${trusted.length} articles`);

    // 4. AI extraction
    notes.push("Running AI analysis on scraped articles...");
    const articleInputs = scraped.map((s) => {
      const src = trusted.find((t) => t.link === s.url);
      return {
        url: s.url,
        title: s.title,
        text: s.text,
        sourceName: src?.source.name ?? "Unknown",
        sourceType: src?.source.type ?? "news",
      };
    });

    const extracted = await extractIncidentsAI(articleInputs);
    notes.push(`AI extracted ${extracted.length} raw incidents`);

    // 5. Deduplicate
    const deduplicated = deduplicateIncidents(extracted);
    notes.push(`After deduplication: ${deduplicated.length} unique incidents (${extracted.length - deduplicated.length} duplicates merged)`);

    // 6. Score
    const trustScores: Record<string, number> = {};
    for (const src of TRUSTED_SOURCES) {
      trustScores[src.name] = src.trustScore;
    }
    const scored = scoreIncidents(deduplicated, trustScores);

    // 7. Zone recommendations
    const zones = generateZoneRecommendations(scored);
    notes.push(`Generated ${zones.length} zone recommendation(s)`);

    // 8. Build final output
    const highPriority = scored.filter(
      (i) => i.risk_level === "HIGH RISK" || i.risk_level === "CRITICAL",
    ).length;

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    notes.push(`Agent completed in ${elapsed}s`);

    return {
      query_region: `${city}, ${state}`,
      generated_at: new Date().toISOString(),
      status: "success",
      summary: {
        total_sources_checked: searchResults.length,
        total_trusted_sources_used: trusted.length,
        total_incidents_found: scored.length,
        high_priority_incidents: highPriority,
      },
      incidents: scored.map((inc) => formatIncident(inc, zones)),
      recommended_zones: zones,
      notes,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      query_region: `${city}, ${state}`,
      generated_at: new Date().toISOString(),
      status: "error",
      summary: {
        total_sources_checked: 0,
        total_trusted_sources_used: 0,
        total_incidents_found: 0,
        high_priority_incidents: 0,
      },
      incidents: [],
      recommended_zones: [],
      notes: [...notes, `Agent error: ${msg}`],
    };
  }
}

/** Format a scored incident into the output schema */
function formatIncident(
  inc: ScoredIncident,
  zones: ZoneRecommendation[],
): AgentIncident {
  // Find matching zone recommendation
  const matchingZone = zones.find((z) =>
    z.supporting_incident_ids.includes(inc.incident_id),
  );

  return {
    incident_id: inc.incident_id,
    title: inc.title ?? "",
    category: inc.category ?? "",
    risk_type: inc.risk_type ?? inc.category ?? "",
    severity: inc.severity ?? "medium",
    risk_level: inc.risk_level ?? "CAUTION",
    summary: inc.summary ?? "",
    location: {
      place: inc.location?.place ?? "",
      district: inc.location?.district ?? "",
      state: inc.location?.state ?? "",
      country: inc.location?.country ?? "India",
      coordinates: {
        lat: inc.location?.coordinates?.lat ?? null,
        lng: inc.location?.coordinates?.lng ?? null,
      },
    },
    published_at: inc.published_at ?? "",
    source: {
      name: inc.source_name ?? "Unknown",
      type: inc.source_type ?? "news",
      url: inc.source_url ?? "",
      trust_score: inc.trust_score ?? 70,
    },
    supporting_sources: inc.supporting_sources ?? [],
    confidence_score: inc.confidence_score ?? 50,
    zone_recommendation: {
      recommended: !!matchingZone,
      zone_name: matchingZone?.zone_name ?? "",
      reason: matchingZone?.reason ?? "",
      suggested_risk_level: matchingZone?.suggested_risk_level ?? "",
      admin_action: matchingZone?.admin_action ?? "monitor",
    },
  };
}
