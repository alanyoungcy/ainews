import { NextResponse } from "next/server";
import { getTrendRadarFeed } from "@/lib/trendradar";
import { syncConfiguredRssFeeds } from "@/lib/rss-feeds";

export async function GET() {
  return NextResponse.json(getTrendRadarFeed());
}

export async function POST() {
  const result = await syncConfiguredRssFeeds(getTrendRadarFeed());
  return NextResponse.json({ ...result.feed, sync: result.summary });
}
