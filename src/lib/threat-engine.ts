/**
 * Threat Engine — Real API Edition
 * ─────────────────────────────────
 * Priority (base score):
 *   1. NewsAPI (NEWS_API_KEY)  + Twitter API v2 (TWITTER_BEARER_TOKEN)
 *   2. NewsAPI only            (if Twitter key missing / fails)
 *   3. Heuristic fallback      (always works, no key needed)
 * With lat/lng:
 *   OpenAI GPT-4o-mini (OPENAI_API_KEY) refines score + map pins; else heuristic pins only.
 *
 * Zones:  GREEN 0-30 | YELLOW 31-50 | ORANGE 51-70 | RED 71-100
 */

export type ThreatZoneLevel = "GREEN" | "YELLOW" | "ORANGE" | "RED";

/** Approximate hotspot for map pins (bearing + distance from user → lat/lng). */
export interface ThreatMarker {
  lat: number;
  lng: number;
  zone: ThreatZoneLevel;
  label: string;
  summary: string; // detailed description for the pin
  newsSource?: string; // news headline that triggered this threat
}

export interface ThreatResult {
  score: number;
  zone: ThreatZoneLevel;
  summary: string;
  sources?: string[]; // article/tweet titles used
  /** Map pins near the user; populated when lat/lng are passed to analyzeThreat. */
  markers?: ThreatMarker[];
}

// ── Zone classifier ────────────────────────────────────────────────────────
export function classifyZone(score: number): ThreatZoneLevel {
  if (score <= 30) return "GREEN";
  if (score <= 50) return "YELLOW";
  if (score <= 70) return "ORANGE";
  return "RED";
}

// ── Geo helpers: bearing (°) + distance (m) → second point ─────────────────
export function offsetByMeters(
  lat: number,
  lng: number,
  bearingDeg: number,
  distanceM: number,
): { lat: number; lng: number } {
  const R = 6378137;
  const brng = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distanceM / R) +
      Math.cos(lat1) * Math.sin(distanceM / R) * Math.cos(brng),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(distanceM / R) * Math.cos(lat1),
      Math.cos(distanceM / R) - Math.sin(lat1) * Math.sin(lat2),
    );
  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
}

/** Heuristic pins when OpenAI is unavailable — emphasizes RED/ORANGE near the user. */
export function generateFallbackMarkers(
  lat: number,
  lng: number,
  zone: ThreatZoneLevel,
  score: number,
): ThreatMarker[] {
  const out: ThreatMarker[] = [];
  const push = (bearing: number, dist: number, z: ThreatZoneLevel, label: string, summary: string) => {
    const p = offsetByMeters(lat, lng, bearing, dist);
    out.push({ lat: p.lat, lng: p.lng, zone: z, label, summary });
  };

  if (zone === "RED") {
    push(35, 320 + (score % 5) * 40, "RED", "Elevated risk — stay alert", "Heightened threat level in this sector based on recent signals.");
    push(155, 480 + (score % 7) * 35, "RED", "High-risk vicinity (indicative)", "Authorities suggest avoiding non-essential travel in this specific corridor.");
    push(280, 620 + (score % 6) * 30, "ORANGE", "Caution — avoid isolated spots", "Moderately elevated danger levels detected in surroundings.");
  } else if (zone === "ORANGE") {
    push(72, 400, "ORANGE", "Elevated incidents — remain cautious", "Reported activity indicates potential safety risks nearby.");
    push(220, 750, "YELLOW", "Monitor surroundings", "Stay aware of your environment while in this vicinity.");
  } else if (zone === "YELLOW") {
    push(180, 500, "YELLOW", "Minor signals — stay aware", "Slightly unusual patterns observed; standard vigilance advised.");
  }

  return out;
}

// ── OpenAI (ChatGPT) refinement + map pins ────────────────────────────────
async function fetchOpenAIThreatRefinement(
  locationName: string,
  lat: number,
  lng: number,
  preliminaryScore: number,
  preliminaryZone: ThreatZoneLevel,
  sourceHint: string,
  usedApis: string[],
  allSources: string[],
): Promise<{ score: number; summary: string; markers: ThreatMarker[] } | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const userPayload = `Location: ${locationName}
Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}
Preliminary risk score: ${preliminaryScore}/100 (zone ${preliminaryZone})
Context: ${sourceHint.slice(0, 1400)}

Return JSON only:
{
  "refinedScore": number,
  "summary": string,
  "markers": [
    { "bearingDeg": number, "distanceM": number, "label": string, "summary": "brief detail", "severity": "GREEN"|"YELLOW"|"ORANGE"|"RED" }
  ]
}
Rules: refinedScore 0-100, stay within ±18 of ${preliminaryScore} unless clearly justified.
markers: 0-5 items. bearingDeg is compass bearing from the user toward the hotspot; distanceM is meters (150-2200).
Include ORANGE/RED pins when risk is elevated; for low risk use 0-1 YELLOW/GREEN or empty.
These are approximate map aids, not exact incident coordinates.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are SURAKSHA, a tourist safety assistant. Reply with valid JSON only, no markdown fences.",
          },
          { role: "user", content: userPayload },
        ],
        response_format: { type: "json_object" },
        temperature: 0.35,
        max_tokens: 800,
      }),
    });

    if (!res.ok) {
      console.warn("[threat-engine] OpenAI HTTP:", res.status, await res.text());
      return null;
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw) as {
      refinedScore?: number;
      summary?: string;
      markers?: Array<{
        bearingDeg?: number;
        distanceM?: number;
        label?: string;
        summary?: string;
        severity?: string;
      }>;
    };

    const pre = preliminaryScore;
    let refined =
      typeof parsed.refinedScore === "number" && !Number.isNaN(parsed.refinedScore)
        ? parsed.refinedScore
        : pre;
    refined = Math.max(0, Math.min(100, Math.max(pre - 18, Math.min(pre + 18, refined))));
    refined = Math.round(refined);

    const markersOut: ThreatMarker[] = [];
    for (const m of parsed.markers ?? []) {
      const sev = m.severity as ThreatZoneLevel;
      if (!["GREEN", "YELLOW", "ORANGE", "RED"].includes(sev)) continue;
      const dist = Math.max(80, Math.min(2800, Number(m.distanceM) || 400));
      const bearing = ((Number(m.bearingDeg) || 0) % 360 + 360) % 360;
      const { lat: ml, lng: mg } = offsetByMeters(lat, lng, bearing, dist);
      markersOut.push({
        lat: ml,
        lng: mg,
        zone: sev,
        label: String(m.label || "Area note").slice(0, 140),
        summary: String(m.summary || "Detailed threat information for this location.").slice(0, 240),
      });
    }

    const z = classifyZone(refined);
    const summary =
      parsed.summary?.trim() ||
      buildSummary(locationName, refined, z, allSources, usedApis);

    return { score: refined, summary, markers: markersOut };
  } catch (e) {
    console.warn("[threat-engine] OpenAI failed:", e);
    return null;
  }
}

// ── Score-based TTL (hours) ────────────────────────────────────────────────
export function scoreToTTLHours(score: number): number {
  if (score <= 30) return 3;       // Green  — refresh quickly (low risk, 3 hours)
  if (score <= 50) return 168;     // Yellow — monitor signs (7 days)
  if (score <= 70) return 168;     // Orange — normal incident (7 days)
  return 48;                       // Red    — high severity / terrorist attack (2 days)
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyword scoring helpers
// ─────────────────────────────────────────────────────────────────────────────
const DANGER_KEYWORDS = [
  "crime", "murder", "robbery", "assault", "riot", "shooting", "stabbing",
  "theft", "kidnap", "terror", "bomb", "explosion", "attack", "violence",
  "rape", "gang", "drug", "trafficking", "unrest", "protest", "clash",
  "flood", "accident", "fire", "emergency", "curfew", "police", "arrest",
];
const SAFE_KEYWORDS = [
  "festival", "celebration", "tourism", "award", "victory", "inauguration",
  "peace", "summit", "concert", "parade", "sports", "development", "investment",
];

function scoreText(text: string): number {
  const lower = text.toLowerCase();
  let s = 0;
  for (const kw of DANGER_KEYWORDS) if (lower.includes(kw)) s += 12;
  for (const kw of SAFE_KEYWORDS)   if (lower.includes(kw)) s -= 6;
  return s;
}

// ─────────────────────────────────────────────────────────────────────────────
// NewsAPI
// ─────────────────────────────────────────────────────────────────────────────
interface NewsSignal { rawScore: number; titles: string[] }

async function fetchNewsSignals(locationName: string): Promise<NewsSignal | null> {
  const key = process.env.NEWS_API_KEY;
  if (!key) return null;

  const city = locationName.split(",")[0].trim();
  const query = encodeURIComponent(`"${city}" AND (crime OR theft OR attack OR incident OR protest OR riot)`);
  const url = `https://newsapi.org/v2/everything?q=${query}&sortBy=publishedAt&pageSize=10&language=en&apiKey=${key}`;

  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) {
      console.warn("[threat-engine] NewsAPI error:", res.status);
      return null;
    }
    const data = await res.json();
    const articles: Array<{ title: string; description: string | null }> =
      data.articles ?? [];

    const titles: string[] = [];
    let rawScore = 0;

    for (const a of articles) {
      const combined = `${a.title ?? ""} ${a.description ?? ""}`;
      rawScore += scoreText(combined);
      if (a.title) titles.push(a.title);
    }

    // Normalise: each article adds up to ~120 pts raw; clamp and scale
    const normalised = Math.min(100, Math.max(0, rawScore / Math.max(articles.length, 1)));
    console.log(`[threat-engine] NewsAPI — ${articles.length} articles, raw=${rawScore}, normalised=${normalised}`);
    return { rawScore: normalised, titles };
  } catch (err) {
    console.warn("[threat-engine] NewsAPI fetch failed:", err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Twitter / X API v2
// ─────────────────────────────────────────────────────────────────────────────
interface TwitterSignal { rawScore: number; titles: string[] }

async function fetchTwitterSignals(locationName: string): Promise<TwitterSignal | null> {
  const token = process.env.TWITTER_BEARER_TOKEN;
  if (!token) return null;

  const city = locationName.split(",")[0].trim();
  const query = encodeURIComponent(
    `(crime OR theft OR attack OR incident OR riot) "${city}" -is:retweet lang:en`,
  );
  const url = `https://api.twitter.com/2/tweets/search/recent?query=${query}&max_results=20&tweet.fields=text`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      console.warn("[threat-engine] Twitter API error:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const tweets: Array<{ text: string }> = data.data ?? [];

    const titles: string[] = [];
    let rawScore = 0;

    for (const t of tweets) {
      rawScore += scoreText(t.text);
      titles.push(t.text.slice(0, 80) + (t.text.length > 80 ? "…" : ""));
    }

    const normalised = Math.min(100, Math.max(0, rawScore / Math.max(tweets.length, 1)));
    console.log(`[threat-engine] Twitter — ${tweets.length} tweets, normalised=${normalised}`);
    return { rawScore: normalised, titles };
  } catch (err) {
    console.warn("[threat-engine] Twitter fetch failed:", err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Heuristic fallback (always works)
// ─────────────────────────────────────────────────────────────────────────────
const HIGH_RISK_LOCATION = ["border","slum","industrial","shanty","red light","conflict"];
const CAUTION_LOCATION   = ["market","bazaar","station","junction","highway","bus stand","railway"];
const SAFE_LOCATION      = ["resort","hotel","park","museum","hospital","university","mall","airport","tourist"];

function heuristicScore(locationName: string): number {
  const lower = locationName.toLowerCase();
  const hour  = new Date().getHours();
  let score   = 22;
  for (const kw of HIGH_RISK_LOCATION) if (lower.includes(kw)) score += 18;
  for (const kw of CAUTION_LOCATION)   if (lower.includes(kw)) score += 8;
  for (const kw of SAFE_LOCATION)      if (lower.includes(kw)) score -= 8;
  if (hour >= 22 || hour <= 4) score += 15;
  else if (hour >= 19)          score += 7;
  score += Math.round((Math.random() - 0.5) * 14);
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ─────────────────────────────────────────────────────────────────────────────
// Build human-readable summary
// ─────────────────────────────────────────────────────────────────────────────
function buildSummary(
  locationName: string,
  score: number,
  zone: string,
  sources: string[],
  usedApis: string[],
): string {
  const hour = new Date().getHours();
  const timeNote =
    hour >= 22 || hour <= 4 ? "Late-night hours elevate risk." :
    hour >= 19               ? "Evening — remain cautious."    : "";

  const zoneDesc: Record<string, string> = {
    GREEN:  "No significant threat signals detected nearby.",
    YELLOW: "Minor incidents reported in the vicinity. Stay aware.",
    ORANGE: "Elevated incidents detected — avoid isolated areas.",
    RED:    "High-risk signals detected. Avoid this area and alert authorities.",
  };

  const apiNote = usedApis.length
    ? `Data from: ${usedApis.join(" + ")}.`
    : "Estimated from location context.";

  const topSource = sources.length ? ` Latest: "${sources[0].slice(0, 80)}…"` : "";

  return `${zoneDesc[zone]} ${timeNote} ${apiNote}${topSource} Score: ${Math.round(score)}/100 for ${locationName.split(",")[0]}.`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────────────────────
export async function analyzeThreat(
  locationName: string,
  options?: { lat?: number; lng?: number },
): Promise<ThreatResult> {
  // Run news + twitter in parallel
  const [newsSignal, twitterSignal] = await Promise.all([
    fetchNewsSignals(locationName),
    fetchTwitterSignals(locationName),
  ]);

  const usedApis: string[] = [];
  const allSources: string[] = [];

  // Weighted composite score
  // News 60% | Twitter 40% | heuristic base if neither available
  let score: number;

  if (newsSignal || twitterSignal) {
    let weightedSum = 0;
    let totalWeight = 0;

    if (newsSignal) {
      weightedSum += newsSignal.rawScore * 0.6;
      totalWeight += 0.6;
      usedApis.push("NewsAPI");
      allSources.push(...newsSignal.titles.slice(0, 3));
    }
    if (twitterSignal) {
      weightedSum += twitterSignal.rawScore * 0.4;
      totalWeight += 0.4;
      usedApis.push("Twitter");
      allSources.push(...twitterSignal.titles.slice(0, 2));
    }

    score = totalWeight > 0 ? weightedSum / totalWeight : heuristicScore(locationName);

    // Time-of-day modifier (+10 late night)
    const hour = new Date().getHours();
    if (hour >= 22 || hour <= 4) score = Math.min(100, score + 10);
    score = Math.round(score);
  } else {
    // Full heuristic fallback
    score = heuristicScore(locationName);
  }

  let zone = classifyZone(score);
  let summary = buildSummary(locationName, score, zone, allSources, usedApis);

  const lat = options?.lat;
  const lng = options?.lng;
  let markers: ThreatMarker[] | undefined;

  if (lat !== undefined && lng !== undefined && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    const sourceHint = [
      ...allSources.slice(0, 5),
      `apis=${usedApis.join("+") || "heuristic"}`,
    ].join(" | ");

    const gpt = await fetchOpenAIThreatRefinement(
      locationName,
      lat,
      lng,
      score,
      zone,
      sourceHint,
      usedApis,
      allSources,
    );

    if (gpt) {
      score = gpt.score;
      zone = classifyZone(score);
      summary = gpt.summary;
      if (usedApis.length && !summary.includes("Data from:")) {
        summary = `${summary} Data from: ${usedApis.join(" + ")}.`;
      }
      markers = gpt.markers;
    }

    const needsPins = zone === "RED" || zone === "ORANGE" || zone === "YELLOW";
    if (needsPins && (!markers || markers.length === 0)) {
      markers = generateFallbackMarkers(lat, lng, zone, score);
    } else if (!markers) {
      markers = [];
    }
  }

  return { score, zone, summary, sources: allSources, markers };
}
