import type { WeeklyBrief } from "@/lib/weekly-intelligence";

export function buildInfographicPrompt(brief?: WeeklyBrief | null) {
  const title = brief?.infographic.title ?? "From signal to governed action";
  const subtitle = brief?.infographic.subtitle ?? "A weekly Capco perspective on AI adoption";
  const sections = brief?.infographic.sections?.join(" → ") ?? "Signal → Interpretation → Decision rights → Control points → Client action";
  return [
    "Use case: productivity-visual",
    "Asset type: editorial background artwork for a weekly Capco AI intelligence infographic",
    `Primary request: create an abstract systems illustration for the theme \"${title}\" with the subtitle \"${subtitle}\".`,
    `Composition: a confident left-to-right operating flow with five distinct visual zones: ${sections}.`,
    "Style: premium editorial consulting, dark navy foundation, warm orange human decision path, restrained cobalt blue automated activity, subtle green completion cues, thin technical lines, generous negative space for deterministic text overlays.",
    "Constraints: no words, letters, numbers, logos, fake charts, labels, or watermarks; leave quiet low-detail zones for exact typography; artwork must feel useful as a background for SVG overlays.",
    "Avoid: neon gradients, generic futuristic cityscapes, glossy 3D blobs, stock photography, illegible UI text, and decorative noise.",
  ].join("\n");
}

export async function generateInfographicArtwork(brief?: WeeklyBrief | null) {
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.AI_API_BASE || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.AI_IMAGE_MODEL || "gpt-image-1";
  const prompt = buildInfographicPrompt(brief);
  if (!apiKey) return { status: "awaiting_provider" as const, provider: "none" as const, model, prompt, output: null };

  const response = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, prompt, size: "1536x1024", quality: "high", n: 1 }),
  });
  if (!response.ok) throw new Error(`Image provider returned ${response.status}`);
  const payload = await response.json() as { data?: Array<{ url?: string; b64_json?: string }> };
  const image = payload.data?.[0];
  return { status: "generated" as const, provider: "openai-compatible" as const, model, prompt, output: image?.url ?? (image?.b64_json ? `data:image/png;base64,${image.b64_json}` : null) };
}
