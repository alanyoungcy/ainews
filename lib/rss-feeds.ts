import { pruneTrendRadarFeed, type TrendRadarFeed, type TrendRadarItem } from "@/lib/trendradar";
import { getTrendRadarSettings } from "@/lib/trendradar-settings.server";
import type { TrendRadarSource } from "@/lib/trendradar-settings";

type RssSource = TrendRadarSource;
type FeedSyncSummary = { added: number; successful: string[]; failed: string[]; attempted: number };

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ").trim();
}

function tagValue(block: string, tag: string) {
  const match = block.match(new RegExp(`<[^>]*${tag}[^>]*>([\\s\\S]*?)<\\/[^>]*${tag}>`, "i"));
  return match ? decodeXml(match[1]) : null;
}

function linkValue(block: string) {
  const atom = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)?.[1];
  return atom || tagValue(block, "link") || tagValue(block, "guid");
}

function parseItems(xml: string, source: RssSource): TrendRadarItem[] {
  const blocks = xml.match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi) ?? [];
  return blocks.map((block, index) => {
    const title = tagValue(block, "title") || "Untitled RSS item";
    const url = linkValue(block);
    const publishedAt = tagValue(block, "pubDate") || tagValue(block, "published") || tagValue(block, "updated");
    const summary = tagValue(block, "description") || tagValue(block, "summary") || tagValue(block, "content:encoded");
    return {
      id: `rss-live-${source.id}-${index}-${hash(`${title}|${url ?? ""}`)}`,
      kind: "rss" as const,
      title,
      sourceId: source.id,
      source: source.name,
      rank: null,
      url,
      publishedAt,
      summary,
      author: tagValue(block, "author") || tagValue(block, "creator"),
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      crawlCount: 1,
    };
  }).filter((item) => item.title && !/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/u.test(`${item.title} ${item.summary ?? ""}`));
}

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) result = Math.imul(result ^ value.charCodeAt(index), 16777619);
  return (result >>> 0).toString(16);
}

async function fetchSource(source: RssSource) {
  const response = await fetch(source.url, { headers: { accept: "application/rss+xml, application/atom+xml, text/xml", "user-agent": "Capco-AI-News/1.0" }, signal: AbortSignal.timeout(12000), cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return parseItems(await response.text(), source);
}

export async function syncConfiguredRssFeeds(baseFeed: TrendRadarFeed) {
  baseFeed = pruneTrendRadarFeed(baseFeed);
  const rssSources = getTrendRadarSettings().sources.filter((source) => source.enabled);
  const results = await Promise.allSettled(rssSources.map(async (source) => ({ source, items: await fetchSource(source) })));
  const successful: string[] = [];
  const failed: string[] = [];
  const liveItems: TrendRadarItem[] = [];
  results.forEach((result, index) => {
    const source = rssSources[index];
    if (result.status === "fulfilled") { successful.push(source.name); liveItems.push(...result.value.items); }
    else failed.push(`${source.name}: ${result.reason instanceof Error ? result.reason.message : "unavailable"}`);
  });

  // Configured RSS sources are replaced with their live snapshot below, so only
  // compare new items against non-configured TrendRadar records.
  const existingUrls = new Set(baseFeed.items.filter((item) => item.kind !== "rss" || !rssSources.some((source) => source.id === item.sourceId)).map((item) => item.url).filter(Boolean));
  const dedupedLive = liveItems.filter((item) => !existingUrls.has(item.url));
  const items = [...baseFeed.items.filter((item) => item.kind !== "rss" || !rssSources.some((source) => source.id === item.sourceId)), ...dedupedLive];
  const rssItems = items.filter((item) => item.kind === "rss");
  const feed: TrendRadarFeed = pruneTrendRadarFeed({
    ...baseFeed,
    source: {
      ...baseFeed.source,
      workflow: "TrendRadar + configured English RSS",
      totalItems: items.length,
      rssItems: rssItems.length,
      rssFeedCount: new Set(rssItems.map((item) => item.sourceId)).size,
      syncedAt: new Date().toISOString(),
    },
    items,
  });
  return { feed, summary: { added: dedupedLive.length, successful, failed, attempted: rssSources.length } satisfies FeedSyncSummary };
}
