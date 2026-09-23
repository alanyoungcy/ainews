import { NextResponse } from "next/server";
import { readEditorialHandoff, writeEditorialHandoff, type EditorialHandoffStage } from "@/lib/editorial-handoff.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isStage(value: unknown): value is EditorialHandoffStage {
  return value === "stage02" || value === "stage03";
}

export async function GET(request: Request) {
  const stage = new URL(request.url).searchParams.get("stage");
  return NextResponse.json(isStage(stage) ? { stage, handoff: readEditorialHandoff(stage) } : { handoff: readEditorialHandoff() }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { stage?: unknown; handoff?: unknown };
    if (!isStage(body.stage) || !body.handoff || typeof body.handoff !== "object") {
      return NextResponse.json({ message: "A stage02 or stage03 handoff is required." }, { status: 400 });
    }
    writeEditorialHandoff(body.stage, body.handoff);
    return NextResponse.json({ ok: true, stage: body.stage, handoff: body.handoff }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Could not save editorial handoff." }, { status: 400 });
  }
}
