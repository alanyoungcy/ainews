import { NextResponse } from "next/server";
import { getTrendRadarFeed } from "@/lib/trendradar";
import { rankWithJev } from "@/lib/jev-triage.server";

export async function POST() {
  try {
    const feed = getTrendRadarFeed();
    const result = await rankWithJev(feed.items);
    return NextResponse.json({ ...result, syncedAt: feed.source.syncedAt, totalItems: feed.source.totalItems, uniqueItems: result.dedupe.uniqueItemIds.length, duplicateCount: result.dedupe.duplicateCount });
  } catch (error) {
    return NextResponse.json({ status: "error", message: error instanceof Error ? error.message : "Jev triage ranking failed" }, { status: 502 });
  }
}
