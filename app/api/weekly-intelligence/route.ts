import { NextResponse } from "next/server";
import { buildFallbackBrief } from "@/lib/weekly-intelligence";
import { getTrendRadarFeed } from "@/lib/trendradar";
import { getWeeklyBrief } from "@/lib/weekly-intelligence-cache.server";

export async function POST(request: Request) {
  const feed = getTrendRadarFeed();
  let force = false;
  let selectedIds: string[] = [];
  try {
    const body = await request.json() as { force?: boolean; selectedIds?: string[] };
    force = body.force === true;
    selectedIds = Array.isArray(body.selectedIds) ? body.selectedIds.filter((id): id is string => typeof id === "string") : [];
  } catch {
    // Empty POST bodies are valid for the initial preload request.
  }
  try {
    const result = await getWeeklyBrief(feed, { force, selectedIds });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    const fallback = buildFallbackBrief(feed, selectedIds);
    fallback.meta.providerError = error instanceof Error ? error.message.slice(0, 160) : "Brief service failed";
    return NextResponse.json(fallback, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}
