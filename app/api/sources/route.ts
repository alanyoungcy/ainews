import { NextResponse } from "next/server";
import { sources } from "@/lib/demo-data";

export async function GET() {
  return NextResponse.json({ sources });
}

export async function POST(request: Request) {
  const payload = await request.json();
  return NextResponse.json({ source: { ...payload, status: "Pending first fetch", enabled: true } }, { status: 201 });
}
