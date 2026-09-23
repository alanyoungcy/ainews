import { NextResponse } from "next/server";
import { generateInfographicArtwork } from "@/lib/infographic";
import { infographicMemoryKey, readInfographicMemory, readLatestInfographicMemory, writeInfographicMemory } from "@/lib/infographic-memory.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const latest = readLatestInfographicMemory();
  return NextResponse.json(latest ?? { status: "empty", output: null }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const payload = {
      brief: body.brief ?? null,
      story: body.story ?? null,
      archetype: body.archetype ?? "3-Tier Architecture Framework",
      layout: body.layout ?? body.archetype ?? "3-Tier Architecture Framework",
      visualStyle: body.visualStyle ?? "Editorial data grid",
      prompt: body.prompt ?? "",
      seed: body.seed ?? "auto",
      referenceImage: body.referenceImage ?? null,
      includeText: body.includeText === true,
      textPlan: body.textPlan ?? null,
    };
    const key = infographicMemoryKey(payload);
    const cached = readInfographicMemory(key);
    if (cached) return NextResponse.json({ ...cached, cached: true, statusMessage: "Reused the saved visual memory for this confirmed story and visual spec." });
    const result = await generateInfographicArtwork(payload);
    const serializable = { ...result, memoryKey: key } as Record<string, unknown>;
    if (result.status === "generated" && result.output) writeInfographicMemory(key, serializable);
    return NextResponse.json({ ...serializable, cached: false });
  } catch (error) {
    return NextResponse.json({ status: "error", message: error instanceof Error ? error.message : "Artwork generation failed" }, { status: 502 });
  }
}
