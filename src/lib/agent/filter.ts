/**
 * filter.ts — Trusted Source Registry & Filtering
 * Only allows articles from verified Indian news / government sources.
 */

import type { SearchResult } from "./search";

export interface TrustedSource {
  name: string;
  domains: string[];
  type: "news" | "government" | "police" | "weather" | "disaster" | "traffic";
  trustScore: number; // 0-100
}

export const TRUSTED_SOURCES: TrustedSource[] = [
  // Government & Official
  { name: "PIB (Press Information Bureau)", domains: ["pib.gov.in"], type: "government", trustScore: 95 },
  { name: "IMD (India Meteorological Dept)", domains: ["mausam.imd.gov.in", "imd.gov.in"], type: "weather", trustScore: 95 },
  { name: "NDRF", domains: ["ndrf.gov.in"], type: "disaster", trustScore: 95 },
  { name: "NDMA", domains: ["ndma.gov.in"], type: "disaster", trustScore: 94 },
  { name: "MHA (Ministry of Home Affairs)", domains: ["mha.gov.in"], type: "government", trustScore: 95 },
  { name: "India.gov.in", domains: ["india.gov.in"], type: "government", trustScore: 93 },

  // Police portals
  { name: "Delhi Police", domains: ["delhipolice.gov.in"], type: "police", trustScore: 90 },
  { name: "UP Police", domains: ["uppolice.gov.in"], type: "police", trustScore: 90 },
  { name: "Uttarakhand Police", domains: ["police.uk.gov.in", "uttarakhandpolice.uk.gov.in"], type: "police", trustScore: 90 },
  { name: "Maharashtra Police", domains: ["mahapolice.gov.in"], type: "police", trustScore: 90 },

  // Tier-1 News
  { name: "ANI", domains: ["aninews.in"], type: "news", trustScore: 92 },
  { name: "DD News", domains: ["ddnews.gov.in"], type: "news", trustScore: 90 },
  { name: "NDTV", domains: ["ndtv.com"], type: "news", trustScore: 90 },
  { name: "The Hindu", domains: ["thehindu.com"], type: "news", trustScore: 88 },
  { name: "Indian Express", domains: ["indianexpress.com"], type: "news", trustScore: 88 },
  { name: "Times of India", domains: ["timesofindia.indiatimes.com", "toi.in"], type: "news", trustScore: 85 },
  { name: "Hindustan Times", domains: ["hindustantimes.com"], type: "news", trustScore: 85 },
  { name: "India Today", domains: ["indiatoday.in"], type: "news", trustScore: 82 },
  { name: "Deccan Herald", domains: ["deccanherald.com"], type: "news", trustScore: 80 },
  { name: "The Wire", domains: ["thewire.in"], type: "news", trustScore: 78 },
  { name: "Scroll.in", domains: ["scroll.in"], type: "news", trustScore: 78 },
  { name: "News18", domains: ["news18.com"], type: "news", trustScore: 78 },
  { name: "Zee News", domains: ["zeenews.india.com"], type: "news", trustScore: 76 },
  { name: "Mint", domains: ["livemint.com"], type: "news", trustScore: 82 },
  { name: "Tribune India", domains: ["tribuneindia.com"], type: "news", trustScore: 80 },
  { name: "Firstpost", domains: ["firstpost.com"], type: "news", trustScore: 76 },

  // Traffic
  { name: "Traffic Police", domains: ["trafficpolicedelhi.nic.in"], type: "traffic", trustScore: 88 },
];

/** Extract hostname from URL */
function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Match a URL to a trusted source */
export function matchTrustedSource(url: string): TrustedSource | null {
  const domain = extractDomain(url);
  if (!domain) return null;

  for (const src of TRUSTED_SOURCES) {
    for (const d of src.domains) {
      if (domain === d || domain.endsWith("." + d)) {
        return src;
      }
    }
  }
  return null;
}

export interface FilteredResult {
  title: string;
  link: string;
  snippet: string;
  date?: string;
  source: TrustedSource;
}

/** Filter search results — keep only trusted sources */
export function filterTrustedSources(results: SearchResult[]): FilteredResult[] {
  const filtered: FilteredResult[] = [];

  for (const r of results) {
    const src = matchTrustedSource(r.link);
    if (src) {
      filtered.push({
        title: r.title,
        link: r.link,
        snippet: r.snippet,
        date: r.date,
        source: src,
      });
    }
  }

  // Sort by trust score desc
  filtered.sort((a, b) => b.source.trustScore - a.source.trustScore);
  return filtered;
}
