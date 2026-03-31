import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionPayload } from "@/lib/auth-user";
import { classifyZone, scoreToTTLHours } from "@/lib/threat-engine";

const bodySchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

const CACHE_RADIUS_DEG = 0.015; // ~1.5 km — news threats cover a wider area

const DANGER_KEYWORDS = [
  "crime", "murder", "robbery", "assault", "riot", "shooting", "stabbing",
  "theft", "kidnap", "terror", "bomb", "explosion", "attack", "violence",
  "rape", "gang", "drug", "trafficking", "unrest", "protest", "clash",
  "flood", "accident", "fire", "emergency", "curfew", "arrest", "loot",
  "dacoity", "hijack", "abduct", "molest", "arson", "vandalism",
];
const SAFE_KEYWORDS = [
  "festival", "celebration", "tourism", "award", "victory", "peace",
  "inauguration", "concert", "parade", "sports", "development",
];

function scoreText(text: string): number {
  const lower = text.toLowerCase();
  let s = 0;
  for (const kw of DANGER_KEYWORDS) if (lower.includes(kw)) s += 14;
  for (const kw of SAFE_KEYWORDS)   if (lower.includes(kw)) s -= 5;
  return s;
}

interface NewsArticle {
  title: string;
  description: string | null;
  url: string;
  publishedAt: string;
  source: { name: string };
}

// POST /api/news-threat
// Takes user lat/lng, reverse geocodes to city, fetches NewsAPI,
// filters dangerous articles, creates PENDING threats with news headline
export async function POST(req: Request) {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  let json: unknown;
  try { json = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { lat, lng } = parsed.data;
  const now = new Date();

  // 1. Lazy cleanup — remove expired threats
  try {
    await (prisma.threatZone as any).deleteMany({ where: { expiresAt: { lte: now } } });
  } catch (_) {}

  // 2. Reverse geocode to get city name
  let cityName = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  let fullLocation = cityName;
  try {
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "User-Agent": "Suraksha-Safety-App/1.0" } },
    );
    if (geoRes.ok) {
      const geoData = await geoRes.json() as {
        display_name?: string;
        address?: { city?: string; town?: string; village?: string; state?: string; country?: string };
      };
      fullLocation = geoData.display_name?.split(",").slice(0, 3).join(", ") ?? cityName;
      cityName =
        geoData.address?.city ??
        geoData.address?.town ??
        geoData.address?.village ??
        fullLocation.split(",")[0].trim();
    }
  } catch {
    console.warn("[news-threat] Nominatim failed, using coordinates");
  }

  // 3. Fetch NewsAPI (with Mock Fallback for Hackathon Demo)
  const newsKey = process.env.NEWS_API_KEY;
  let articles: NewsArticle[] = [];

  if (!newsKey || newsKey === "") {
    console.warn("[news-threat] NEWS_API_KEY missing. Generating mock headlines for demo...");
    articles = [
      {
        title: `Localized protest reported near Rajpur Road crossing, Dehradun`,
        description: "Small gathering causing traffic disruptions near the main Rajpur Road intersection. Local authorities suggest taking alternate routes.",
        url: "#",
        publishedAt: now.toISOString(),
        source: { name: "Dehradun City News" }
      },
      {
        title: `Spike in petty theft reported in Paltan Bazaar commercial district`,
        description: "Police have issued a warning to tourists in the Paltan Bazaar area after reports of coordinated pickpocketing today.",
        url: "#",
        publishedAt: now.toISOString(),
        source: { name: "UK Police Alert" }
      }
    ];
  } else {
    const query = encodeURIComponent(
      `"${cityName}" AND (crime OR theft OR attack OR incident OR protest OR riot OR explosion OR robbery OR murder OR bomb)`,
    );
    const newsUrl = `https://newsapi.org/v2/everything?q=${query}&sortBy=publishedAt&pageSize=20&language=en&apiKey=${newsKey}`;

    try {
      const newsRes = await fetch(newsUrl, { cache: "no-store" });
      if (!newsRes.ok) throw new Error("NewsAPI failed");
      const newsData = await newsRes.json();
      articles = (newsData.articles ?? []) as NewsArticle[];
    } catch (err) {
      console.warn("[news-threat] NewsAPI fetch failed, no fallback provided.");
      return NextResponse.json({ error: "Failed to reach NewsAPI" }, { status: 502 });
    }
  }

  // 4. Score each article and keep only dangerous ones
  const dangerous = articles
    .map((a) => {
      const combined = `${a.title ?? ""} ${a.description ?? ""}`;
      const score = scoreText(combined);
      return { ...a, score };
    })
    .filter((a) => a.score >= 14) // at least one danger keyword
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // max 5 threats per call

  if (dangerous.length === 0) {
    return NextResponse.json({
      ok: true,
      message: `No dangerous news found near ${cityName} right now.`,
      created: 0,
      articles: [],
    });
  }

  // 5. For each dangerous article, create a PENDING threat if none exists nearby
  const created: { location: string; zone: string; headline: string }[] = [];

  for (const article of dangerous) {
    // Deduplicate: skip if PENDING or VERIFIED threat already exists in radius
    const existing = await (prisma.threatZone as any).findFirst({
      where: {
        lat: { gte: lat - CACHE_RADIUS_DEG, lte: lat + CACHE_RADIUS_DEG },
        lng: { gte: lng - CACHE_RADIUS_DEG, lte: lng + CACHE_RADIUS_DEG },
        status: { in: ["PENDING", "VERIFIED"] },
        newsSource: article.title, // exact headline dedup
      },
    });
    if (existing) continue;

    // Map score (0–100+ raw) to threat score (0-100)
    const threatScore = Math.min(100, Math.max(30, article.score));
    const zone = classifyZone(threatScore);
    const ttlHours = scoreToTTLHours(threatScore);
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

    const summary = `📰 ${article.title}. Source: ${article.source.name}. ${article.description?.slice(0, 200) ?? ""}`.trim();

    await (prisma.threatZone as any).create({
      data: {
        lat,
        lng,
        location: fullLocation,
        score: threatScore,
        zone,
        summary,
        status: "PENDING",
        reportedByUserId: session.sub,
        newsSource: article.title,
        expiresAt,
      },
    });

    created.push({ location: fullLocation, zone, headline: article.title });
    console.log(`[news-threat] Created ${zone} threat: "${article.title}"`);
  }

  return NextResponse.json({
    ok: true,
    city: cityName,
    created: created.length,
    threats: created,
    message: created.length > 0
      ? `${created.length} news-based threat(s) sent to admin for verification.`
      : "All recent news threats already reported. No duplicates created.",
  });
}
