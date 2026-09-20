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
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as TrendRadarFeed;
  } catch {
    return fallbackFeed;
  }
}

export function getTrendRadarStatus(feed: TrendRadarFeed) {
  if (!feed.source.syncedAt) {
    return { label: "Awaiting first sync", tone: "orange" as const };
  }
  return { label: `${feed.source.totalItems} items synced`, tone: "green" as const };
}
