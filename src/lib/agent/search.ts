/**
 * search.ts — Serper.dev Web Search
 * Searches Google via Serper API for safety/crime incidents in a target region.
 */

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  date?: string;
  source?: string;
}

const SAFETY_QUERIES = [
  "crime incident",
  "murder assault violence",
  "riot protest unrest",
  "road accident traffic",
  "flood landslide disaster",
  "fire emergency alert",
];

export async function searchWeb(
  city: string,
  state: string,
): Promise<SearchResult[]> {
  const key = process.env.SERPER_API_KEY;
  if (!key) {
    console.warn("[research-agent] SERPER_API_KEY not set — using fallback");
    return fallbackSearch(city, state);
  }

  const allResults: SearchResult[] = [];

  // Run multiple safety-focused queries in parallel
  const queries = SAFETY_QUERIES.map(
    (q) => `${city} ${state} ${q} India recent`,
  );

  const fetches = queries.map(async (query) => {
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: query,
          gl: "in",
          hl: "en",
          num: 8,
          tbs: "qdr:w", // last week
        }),
      });

      if (!res.ok) {
        console.warn(`[search] Serper error ${res.status} for "${query}"`);
        return [];
      }

      const data = (await res.json()) as {
        organic?: Array<{
          title?: string;
          link?: string;
          snippet?: string;
          date?: string;
          source?: string;
        }>;
      };

      return (data.organic ?? []).map((r) => ({
        title: r.title ?? "",
        link: r.link ?? "",
        snippet: r.snippet ?? "",
        date: r.date,
        source: r.source,
      }));
    } catch (err) {
      console.warn(`[search] Failed for "${query}":`, err);
      return [];
    }
  });

  const results = await Promise.all(fetches);
  for (const batch of results) {
    allResults.push(...batch);
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  return allResults.filter((r) => {
    if (!r.link || seen.has(r.link)) return false;
    seen.add(r.link);
    return true;
  });
}

/** Fallback: use NewsAPI if available, else return empty */
async function fallbackSearch(
  city: string,
  state: string,
): Promise<SearchResult[]> {
  const newsKey = process.env.NEWS_API_KEY;
  if (!newsKey) return [];

  try {
    const query = encodeURIComponent(
      `"${city}" AND (crime OR theft OR attack OR incident OR protest OR riot OR flood OR accident OR fire)`,
    );
    const url = `https://newsapi.org/v2/everything?q=${query}&sortBy=publishedAt&pageSize=20&language=en&apiKey=${newsKey}`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    return (data.articles ?? []).map(
      (a: { title?: string; url?: string; description?: string; publishedAt?: string; source?: { name?: string } }) => ({
        title: a.title ?? "",
        link: a.url ?? "",
        snippet: a.description ?? "",
        date: a.publishedAt,
        source: a.source?.name,
      }),
    );
  } catch {
    return [];
  }
}
