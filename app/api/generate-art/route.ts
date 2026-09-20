import { NextResponse } from "next/server";
import { generateInfographicArtwork } from "@/lib/infographic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    return NextResponse.json(await generateInfographicArtwork(body.brief));
  } catch (error) {
    return NextResponse.json({ status: "error", message: error instanceof Error ? error.message : "Artwork generation failed" }, { status: 502 });
  }
}
