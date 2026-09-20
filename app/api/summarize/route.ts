import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ status: "drafted", audience: body.audience ?? "consultant", modelVersion: "demo-grounded-0.1" });
}
