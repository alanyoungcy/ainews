import type { WeeklyBrief } from "@/lib/weekly-intelligence";

export type InfographicStory = {
  title: string;
  source: string;
  fact: string;
  capcoImplication: string;
  url?: string | null;
};

export type InfographicArtworkOptions = {
  brief?: WeeklyBrief | null;
  story?: InfographicStory | null;
  archetype?: string;
  prompt?: string;
  seed?: string;
};

export function buildInfographicPrompt(options: WeeklyBrief | InfographicArtworkOptions | null | undefined) {
  const config: InfographicArtworkOptions = options && "infographic" in options
    ? { brief: options as WeeklyBrief }
    : (options as InfographicArtworkOptions | null | undefined) ?? {};
  const brief = config.brief;
  const story = config.story;
  const archetype = config.archetype ?? "3-Tier Architecture Framework";
  const title = brief?.infographic.title ?? "From signal to governed action";
  const subtitle = brief?.infographic.subtitle ?? "A weekly Capco perspective on AI adoption";
  const sections = brief?.infographic.sections?.join(" → ") ?? "Signal → Interpretation → Decision rights → Control points → Client action";
  return [
    "Use case: productivity-visual",
    "Asset type: editorial background artwork for a weekly Capco AI intelligence infographic",
    `Primary request: create an abstract systems illustration for the theme \"${title}\" with the subtitle \"${subtitle}\".`,
    `Confirmed source story: \"${story?.title ?? title}\" from ${story?.source ?? "TrendRadar source set"}.`,
    `Grounded fact to express visually: \"${story?.fact ?? "AI capability is changing the operating model around decision rights and controls."}\".`,
    `Capco perspective: \"${story?.capcoImplication ?? brief?.capcoPerspective ?? "Make the operating change, controls, and client decision explicit."}\".`,
    `Composition archetype: ${archetype}. Build a confident left-to-right operating flow with five distinct visual zones: ${sections}.`,
    `Consultant art direction: ${config.prompt ?? ""}`,
    `Deterministic seed reference: ${config.seed ?? "auto"}.`,
    "Style: premium editorial consulting, dark navy foundation, warm orange human decision path, restrained cobalt blue automated activity, subtle green completion cues, thin technical lines, generous negative space for deterministic text overlays.",
    "Constraints: no words, letters, numbers, logos, fake charts, labels, or watermarks; leave quiet low-detail zones for exact typography; artwork must feel useful as a background for SVG overlays.",
    "Avoid: neon gradients, generic futuristic cityscapes, glossy 3D blobs, stock photography, illegible UI text, and decorative noise.",
  ].join("\n");
}

export async function generateInfographicArtwork(options: WeeklyBrief | InfographicArtworkOptions | null = null) {
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.AI_API_BASE || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.AI_IMAGE_MODEL || "gpt-image-1";
  const prompt = buildInfographicPrompt(options);
  if (!apiKey) return { status: "awaiting_provider" as const, provider: "none" as const, model, prompt, output: null };

  const response = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, prompt, size: "1536x1024", quality: "high", n: 1 }),
    signal: AbortSignal.timeout(Number(process.env.AI_IMAGE_TIMEOUT_MS ?? 120000)),
  });
  if (!response.ok) throw new Error(`Image provider returned ${response.status}`);
  const payload = await response.json() as { data?: Array<{ url?: string; b64_json?: string }> };
  const image = payload.data?.[0];
  return { status: "generated" as const, provider: "openai-compatible" as const, model, prompt, output: image?.url ?? (image?.b64_json ? `data:image/png;base64,${image.b64_json}` : null) };
}
