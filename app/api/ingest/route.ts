import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ status: "queued", message: "Source ingestion queued for the next run." });
}
