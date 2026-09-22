import { NextResponse } from "next/server";
import { getTrendRadarFeed } from "@/lib/trendradar";
import { getWeeklyBrief } from "@/lib/weekly-intelligence-cache.server";

export async function POST(request: Request) {
  const feed = getTrendRadarFeed();
  let force = false;
  try {
    const body = await request.json() as { force?: boolean };
    force = body.force === true;
  } catch {
    // Empty POST bodies are valid for the initial preload request.
  }
  const result = await getWeeklyBrief(feed, { force });
  return NextResponse.json(result);
}
