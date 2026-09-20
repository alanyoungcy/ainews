import { NextResponse } from "next/server";
import { getTrendRadarFeed } from "@/lib/trendradar";

export async function GET() {
  return NextResponse.json(getTrendRadarFeed());
}
