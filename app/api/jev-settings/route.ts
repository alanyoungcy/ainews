import { NextResponse } from "next/server";
import { getJevSettings, writeJevSettings } from "@/lib/jev-settings.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json(getJevSettings());
}

export async function PUT(request: Request) {
  try {
    const body = await request.json() as { criteria?: unknown };
    if (!Array.isArray(body.criteria) || body.criteria.length === 0) {
      return NextResponse.json({ message: "At least one Jev criterion is required." }, { status: 400 });
    }
    return NextResponse.json(writeJevSettings(body.criteria));
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Could not save Jev settings." }, { status: 400 });
  }
}
