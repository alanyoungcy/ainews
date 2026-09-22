import { NextResponse } from "next/server";
import { generateInfographicArtwork } from "@/lib/infographic";
import { infographicMemoryKey, readInfographicMemory, writeInfographicMemory } from "@/lib/infographic-memory.server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const payload = { brief: body.brief ?? null, story: body.story ?? null, archetype: body.archetype ?? "3-Tier Architecture Framework", prompt: body.prompt ?? "", seed: body.seed ?? "auto" };
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
