import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ status: "rendered", format: body.format ?? "svg", output: "/generated/operating-model.svg" });
}
