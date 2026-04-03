/**
 * scraper.ts — Article Scraping with Cheerio
 * Fetches article HTML and extracts clean text content.
 */

import * as cheerio from "cheerio";

export interface ScrapedArticle {
  url: string;
  title: string;
  text: string;         // cleaned article body
  publishedDate: string | null;
  scrapedAt: string;
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const TIMEOUT_MS = 8000;
const MAX_TEXT_LENGTH = 4000; // limit for AI extraction cost control

/** Scrape a single article URL */
export async function scrapeArticle(url: string, fallbackTitle?: string): Promise<ScrapedArticle | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-IN,en;q=0.9",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[scraper] HTTP ${res.status} for ${url}`);
      return null;
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return null;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Remove noise elements
    $("script, style, noscript, iframe, nav, header, footer, aside, .ad, .ads, .advertisement, .social-share, .comments, .related-articles, [class*=sidebar], [class*=cookie], [class*=popup]").remove();

    // Extract title
    const title =
      $("article h1").first().text().trim() ||
      $("h1").first().text().trim() ||
      $('meta[property="og:title"]').attr("content")?.trim() ||
      $("title").text().trim() ||
      fallbackTitle ||
      "";

    // Extract publish date
    const publishedDate =
      $('meta[property="article:published_time"]').attr("content") ||
      $('meta[name="publish-date"]').attr("content") ||
      $('meta[name="date"]').attr("content") ||
      $("time").first().attr("datetime") ||
      null;

    // Extract body text — prioritize article tags, then fall back to paragraphs
    let text = "";

    const articleEl = $("article, [class*=article-body], [class*=story-body], [class*=article-content], .story_details, .article__content, .td-post-content");
    if (articleEl.length > 0) {
      text = articleEl
        .find("p")
        .map((_, el) => $(el).text().trim())
        .get()
        .filter((t) => t.length > 30)
        .join("\n\n");
    }

    // Fallback: all paragraphs
    if (text.length < 100) {
      text = $("p")
        .map((_, el) => $(el).text().trim())
        .get()
        .filter((t) => t.length > 30)
        .join("\n\n");
    }

    if (text.length < 50) {
      // Last resort: use snippet
      return null;
    }

    // Truncate to control AI costs
    if (text.length > MAX_TEXT_LENGTH) {
      text = text.slice(0, MAX_TEXT_LENGTH) + "…";
    }

    return {
      url,
      title,
      text,
      publishedDate: publishedDate ? new Date(publishedDate).toISOString() : null,
      scrapedAt: new Date().toISOString(),
    };
  } catch (err) {
    // Gracefully skip blocked/timeout sites
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("abort")) {
      console.warn(`[scraper] Timeout for ${url}`);
    } else {
      console.warn(`[scraper] Failed ${url}:`, message);
    }
    return null;
  }
}

/** Scrape multiple articles in parallel with concurrency limit */
export async function scrapeArticles(
  urls: { url: string; title?: string }[],
  concurrency = 5,
): Promise<ScrapedArticle[]> {
  const results: ScrapedArticle[] = [];
  const queue = [...urls];

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      const article = await scrapeArticle(item.url, item.title);
      if (article) results.push(article);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, () => worker());
  await Promise.all(workers);

  return results;
}
