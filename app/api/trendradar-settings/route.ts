import { NextResponse } from "next/server";
import { getTrendRadarSettings, writeTrendRadarSettings } from "@/lib/trendradar-settings.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json(getTrendRadarSettings());
}

export async function PUT(request: Request) {
  try {
    const body = await request.json() as { schedule?: unknown; sources?: unknown };
    if (!Array.isArray(body.sources) || body.sources.length === 0) return NextResponse.json({ message: "At least one TrendRadar source is required." }, { status: 400 });
    return NextResponse.json(writeTrendRadarSettings({ schedule: body.schedule, sources: body.sources }));
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Could not save TrendRadar settings." }, { status: 400 });
  }
}
