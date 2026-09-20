import { NextResponse } from "next/server";
import { edition, stories } from "@/lib/demo-data";

export async function GET() {
  return NextResponse.json({ edition, stories });
}
