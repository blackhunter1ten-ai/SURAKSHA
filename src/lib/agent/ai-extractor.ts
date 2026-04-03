/**
 * ai-extractor.ts — OpenAI GPT-4o-mini Incident Extraction
 * Sends article text to GPT and extracts structured incident JSON.
 */

export interface ExtractedIncident {
  title: string;
  category: string;
  risk_type: string;
  severity: "low" | "medium" | "high" | "critical";
  summary: string;
  location: {
    place: string;
    district: string;
    state: string;
    country: string;
    coordinates: { lat: number | null; lng: number | null };
  };
  published_at: string;
  affected_people: string | null;
  risk_indicators: string[];
  source_url: string;
  source_name: string;
  source_type: string;
}

const SYSTEM_PROMPT = `You are SURAKSHA, an AI Risk Intelligence Agent for a tourist safety platform in India.
You analyze news articles and extract structured safety incident data.

For each article, extract incidents matching these categories:
- crime, murder, assault, robbery, kidnapping
- riot, protest, unrest, communal_violence
- road_accident, traffic_congestion
- flood, landslide, earthquake, cyclone, natural_disaster
- fire, explosion
- travel_alert, emergency, curfew

Return a JSON array of incidents. Each incident must have:
{
  "title": "short descriptive title",
  "category": "one of the categories above",
  "risk_type": "specific sub-type e.g. stabbing, chain-snatching, flash_flood",
  "severity": "low | medium | high | critical",
  "summary": "2-3 sentence summary of what happened",
  "location": {
    "place": "specific place/area name",
    "district": "district name",
    "state": "state name",
    "country": "India",
    "coordinates": { "lat": number_or_null, "lng": number_or_null }
  },
  "published_at": "ISO date if available, else empty string",
  "affected_people": "number or description if mentioned, else null",
  "risk_indicators": ["list", "of", "key", "risk", "factors"]
}

RULES:
- Only extract REAL incidents mentioned in the text. Never invent data.
- If coordinates are not explicitly mentioned, try to estimate from the place name. If unsure, use null.
- Assign severity based on: critical=deaths/major destruction, high=serious injuries/large protest, medium=minor incidents, low=warnings/advisories.
- If the article contains NO safety incidents, return an empty array [].
- Return ONLY valid JSON array, no markdown fences, no explanation.`;

interface ArticleInput {
  url: string;
  title: string;
  text: string;
  sourceName: string;
  sourceType: string;
}

export async function extractIncidentsAI(
  articles: ArticleInput[],
): Promise<ExtractedIncident[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.warn("[ai-extractor] OPENAI_API_KEY not set — skipping AI extraction");
    return [];
  }

  // Batch articles into chunks of 3 to manage token usage
  const BATCH_SIZE = 3;
  const allIncidents: ExtractedIncident[] = [];

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);
    const articlesText = batch
      .map(
        (a, idx) =>
          `--- ARTICLE ${idx + 1} ---\nSource: ${a.sourceName} (${a.sourceType})\nURL: ${a.url}\nTitle: ${a.title}\n\n${a.text}`,
      )
      .join("\n\n");

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
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `Analyze the following ${batch.length} article(s) and extract all safety incidents:\n\n${articlesText}`,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
          max_tokens: 2000,
        }),
      });

      if (!res.ok) {
        console.warn(`[ai-extractor] OpenAI HTTP ${res.status}`);
        continue;
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const raw = data.choices?.[0]?.message?.content;
      if (!raw) continue;

      // Parse — handle both { incidents: [...] } and direct [...] format
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        console.warn("[ai-extractor] Invalid JSON from OpenAI");
        continue;
      }

      let incidents: ExtractedIncident[] = [];
      if (Array.isArray(parsed)) {
        incidents = parsed;
      } else if (typeof parsed === "object" && parsed !== null) {
        const obj = parsed as Record<string, unknown>;
        if (Array.isArray(obj.incidents)) incidents = obj.incidents;
        else if (Array.isArray(obj.data)) incidents = obj.data;
        else if (Array.isArray(obj.results)) incidents = obj.results;
      }

      // Attach source info
      for (const inc of incidents) {
        if (!inc.source_url) {
          // Match to the most relevant article
          const match = batch.find(
            (a) =>
              inc.title?.toLowerCase().includes(a.title.toLowerCase().slice(0, 20)) ||
              a.text.toLowerCase().includes(inc.location?.place?.toLowerCase() ?? ""),
          ) ?? batch[0];
          inc.source_url = match.url;
          inc.source_name = match.sourceName;
          inc.source_type = match.sourceType;
        }
      }

      allIncidents.push(...incidents);
    } catch (err) {
      console.warn("[ai-extractor] Batch failed:", err);
    }
  }

  return allIncidents;
}
