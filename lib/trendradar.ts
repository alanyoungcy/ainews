import fs from "node:fs";
import path from "node:path";

export type TrendRadarItem = {
  id: string;
  kind: "hotlist" | "rss";
  title: string;
  sourceId: string;
  source: string;
  rank: number | null;
  url: string | null;
  publishedAt: string | null;
  summary: string | null;
  author: string | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  crawlCount: number;
};

export type TrendRadarFeed = {
  schemaVersion: number;
  source: {
    repository: string;
    workflow: string;
    databaseDate: string | null;
    crawlTime: string | null;
    totalItems: number;
    hotListItems: number;
    rssItems: number;
    platformCount: number;
    rssFeedCount: number;
    syncedAt: string | null;
  };
  items: TrendRadarItem[];
};

export const TREND_RADAR_RETENTION_DAYS = 14;
const TREND_RADAR_RETENTION_MS = TREND_RADAR_RETENTION_DAYS * 24 * 60 * 60 * 1000;

const fallbackFeed: TrendRadarFeed = {
  schemaVersion: 1,
  source: {
    repository: "https://github.com/alanyoungcy/trendradar-capco",
    workflow: "Get Hot News",
    databaseDate: null,
    crawlTime: null,
    totalItems: 0,
    hotListItems: 0,
    rssItems: 0,
    platformCount: 0,
    rssFeedCount: 0,
    syncedAt: null,
  },
  items: [],
};

export function getTrendRadarFeed(): TrendRadarFeed {
  try {
    const filePath = path.join(process.cwd(), "data", "trendradar", "latest.json");
    const feed = JSON.parse(fs.readFileSync(filePath, "utf8")) as TrendRadarFeed;
    const pruned = pruneTrendRadarFeed(feed);
    const filtered = filterTrendRadarLanguage(pruned);
    const sourceCountsStale = feed.source.totalItems !== filtered.source.totalItems || feed.source.hotListItems !== filtered.source.hotListItems || feed.source.rssItems !== filtered.source.rssItems || feed.source.platformCount !== filtered.source.platformCount || feed.source.rssFeedCount !== filtered.source.rssFeedCount;
    if (pruned.items.length !== feed.items.length || filtered.items.length !== pruned.items.length || sourceCountsStale) {
      persistTrendRadarFeed(filtered);
    }
    return filtered;
  } catch {
    return fallbackFeed;
  }
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function effectiveItemDate(item: TrendRadarItem, snapshotDate: Date | null) {
  return parseDate(item.publishedAt) ?? parseDate(item.lastSeenAt) ?? parseDate(item.firstSeenAt) ?? snapshotDate;
}

function recalculateSource(feed: TrendRadarFeed, items: TrendRadarItem[]): TrendRadarFeed {
  const hotListItems = items.filter((item) => item.kind === "hotlist").length;
  const rssItems = items.filter((item) => item.kind === "rss").length;
  return {
    ...feed,
    source: {
      ...feed.source,
      totalItems: items.length,
      hotListItems,
      rssItems,
      platformCount: new Set(items.filter((item) => item.kind === "hotlist").map((item) => item.sourceId)).size,
      rssFeedCount: new Set(items.filter((item) => item.kind === "rss").map((item) => item.sourceId)).size,
    },
    items,
  };
}

export function pruneTrendRadarFeed(feed: TrendRadarFeed, now = new Date()): TrendRadarFeed {
  const snapshotDate = parseDate(feed.source.syncedAt);
  // A stale repository snapshot should never repopulate the workspace with old news.
  if (!snapshotDate || now.getTime() - snapshotDate.getTime() > TREND_RADAR_RETENTION_MS) {
    return recalculateSource(feed, []);
  }
  const cutoff = now.getTime() - TREND_RADAR_RETENTION_MS;
  const items = feed.items.filter((item) => {
    const date = effectiveItemDate(item, snapshotDate);
    return date ? date.getTime() >= cutoff : snapshotDate.getTime() >= cutoff;
  });
  return recalculateSource(feed, items);
}

export function persistTrendRadarFeed(feed: TrendRadarFeed) {
  try {
    const filePath = path.join(process.cwd(), "data", "trendradar", "latest.json");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(feed, null, 2), "utf8");
  } catch {
    // Read-only deployments can still use the pruned in-memory feed.
  }
}

function containsCjk(value: string | null | undefined) {
  return /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/u.test(value ?? "");
}

export function filterTrendRadarLanguage(feed: TrendRadarFeed): TrendRadarFeed {
  const language = (process.env.TREND_RADAR_LANGUAGE ?? "en").toLowerCase();
  if (language !== "en" && language !== "english") return recalculateSource(feed, feed.items);

  const items = feed.items.filter((item) => !containsCjk(item.title) && !containsCjk(item.summary) && !containsCjk(item.source));
  return recalculateSource(feed, items);
}

export function getTrendRadarStatus(feed: TrendRadarFeed) {
  if (!feed.source.syncedAt) {
    return { label: "Awaiting first sync", tone: "orange" as const };
  }
  return { label: `${feed.source.totalItems} items synced`, tone: "green" as const };
}
