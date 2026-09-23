import { NextResponse } from "next/server";

type OcrOverlay = { id: string; label: string; value: string; x: number; y: number; width: number; kind: "headline" | "summary" | "pov" | "metric" | "source" };

export async function POST(request: Request) {
  try {
    const body = await request.json() as { textPlan?: { headline?: string; summary?: string; perspective?: string }; metrics?: string[]; source?: string };
    const plan = body.textPlan ?? {};
    const metrics = Array.isArray(body.metrics) ? body.metrics : [];
    const overlays: OcrOverlay[] = [
      { id: "headline", label: "Headline", value: plan.headline ?? "", x: 7, y: 8, width: 70, kind: "headline" },
      { id: "summary", label: "Summary", value: plan.summary ?? "", x: 7, y: 34, width: 42, kind: "summary" },
      { id: "pov", label: "Capco PoV", value: plan.perspective ?? "", x: 7, y: 56, width: 48, kind: "pov" },
      ...metrics.map((value, index) => ({ id: `metric-${index}`, label: `Metric ${index + 1}`, value, x: 62, y: 38 + index * 12, width: 30, kind: "metric" as const })),
      { id: "source", label: "Source", value: body.source ?? "TrendRadar source", x: 7, y: 92, width: 50, kind: "source" },
    ];
    return NextResponse.json({ status: "ready", engine: "source-grounded-ocr-overlay", overlays });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "OCR detection failed" }, { status: 400 });
  }
}
