import { NextResponse } from "next/server";
import { getTrendRadarFeed, persistTrendRadarFeed, pruneTrendRadarFeed } from "@/lib/trendradar";
import { syncConfiguredRssFeeds } from "@/lib/rss-feeds";

export async function GET() {
  return NextResponse.json(getTrendRadarFeed());
}

export async function POST() {
  const result = await syncConfiguredRssFeeds(pruneTrendRadarFeed(getTrendRadarFeed()));
  const feed = pruneTrendRadarFeed(result.feed);
  persistTrendRadarFeed(feed);
  return NextResponse.json({ ...feed, sync: result.summary });
}
