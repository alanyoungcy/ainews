import fs from "node:fs";
import path from "node:path";
import type { TrendRadarFeed } from "@/lib/trendradar";
import { generateWeeklyBrief, type WeeklyBriefResult } from "@/lib/weekly-intelligence";

type BriefCacheEntry = {
  key: string;
  result: WeeklyBriefResult;
  expiresAt: number;
};

type BriefState = {
  cache: BriefCacheEntry | null;
  inFlight: { key: string; promise: Promise<WeeklyBriefResult> } | null;
};

const BRIEF_CACHE_TTL_MS = Number(process.env.AI_BRIEF_CACHE_TTL_MS ?? 15 * 60 * 1000);
const sharedBriefState = ((globalThis as typeof globalThis & { __capcoWeeklyBriefState?: BriefState }).__capcoWeeklyBriefState ??= { cache: null, inFlight: null });

function feedCacheKey(feed: TrendRadarFeed) {
  const first = feed.items[0]?.id ?? "empty";
  const last = feed.items[feed.items.length - 1]?.id ?? "empty";
  return [feed.source.syncedAt ?? "unsynced", feed.source.totalItems, feed.source.rssItems, first, last].join(":");
}

function persistedBriefPath() {
  return path.join(process.cwd(), "data", "trendradar", "weekly-brief.json");
}

function readPersistedBrief(key: string, now: number) {
  try {
    const entry = JSON.parse(fs.readFileSync(persistedBriefPath(), "utf8")) as BriefCacheEntry;
    if (entry.key !== key || entry.expiresAt <= now || !entry.result?.brief) return null;
    sharedBriefState.cache = entry;
    return entry.result;
  } catch {
    return null;
  }
}

function persistBrief(entry: BriefCacheEntry) {
  try {
    const filePath = persistedBriefPath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(entry), "utf8");
  } catch {
    // Some hosted runtimes have a read-only filesystem; memory caching still works there.
  }
}

export async function getWeeklyBrief(feed: TrendRadarFeed, options: { force?: boolean } = {}) {
  const key = feedCacheKey(feed);
  const now = Date.now();
  if (!options.force) {
    const persisted = readPersistedBrief(key, now);
    if (persisted) return persisted;
  }
  if (!options.force && sharedBriefState.cache && sharedBriefState.cache.key === key && sharedBriefState.cache.expiresAt > now) return sharedBriefState.cache.result;
  if (!options.force && sharedBriefState.inFlight?.key === key) return sharedBriefState.inFlight.promise;

  const promise = generateWeeklyBrief(feed).then((result) => {
    const isFallback = result.meta.provider === "fallback";
    sharedBriefState.cache = { key, result, expiresAt: Date.now() + (isFallback ? Math.min(BRIEF_CACHE_TTL_MS, 60_000) : BRIEF_CACHE_TTL_MS) };
    persistBrief(sharedBriefState.cache);
    return result;
  }).finally(() => {
    if (sharedBriefState.inFlight?.promise === promise) sharedBriefState.inFlight = null;
  });
  sharedBriefState.inFlight = { key, promise };
  return promise;
}
