import { NextResponse } from "next/server";
import { getTrendRadarFeed } from "@/lib/trendradar";
import { generateWeeklyBrief } from "@/lib/weekly-intelligence";

export async function POST() {
  const feed = getTrendRadarFeed();
  const result = await generateWeeklyBrief(feed);
  return NextResponse.json(result);
}
