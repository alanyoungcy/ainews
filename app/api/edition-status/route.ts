import { NextResponse } from "next/server";
import { getEditionStatus, markEditionSent } from "@/lib/edition-status.server";

export async function GET() {
  return NextResponse.json(getEditionStatus());
}

export async function POST() {
  return NextResponse.json(markEditionSent());
}
