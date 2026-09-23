import type { WeeklyBrief } from "@/lib/weekly-intelligence";

export const CAPCO_INFOGRAPHIC_STYLE_TEMPLATE = [
  "Capco editorial system: premium institutional consulting visual, dark teal/ink/navy foundation with white and pale-mint type.",
  "Use a disciplined modular grid with thin hairline dividers, framed data cells, compact uppercase labels, and one dominant explanatory structure.",
  "Choose one visual grammar that fits the archetype: radial governance map, treemap, ring, contour field, dotted particle system, flowing ribbon, or three-tier operating path.",
  "Use restrained Capco gold, aqua, mint, violet, or magenta accents as signal colours; keep gradients directional and controlled.",
  "Reserve a quiet upper-left or central-left region and a clear footer band for deterministic overlays, provenance, legal clearance, and watermarking.",
  "The visual should feel like a data-led executive infographic or strategic advisory cover, not a generic futuristic banking illustration.",
].join(" ");

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
  layout?: string;
  visualStyle?: string;
  prompt?: string;
  seed?: string;
  referenceImage?: string | null;
  includeText?: boolean;
  textPlan?: {
    headline?: string;
    summary?: string;
    perspective?: string;
    sections?: string[];
  };
};

export function buildInfographicPrompt(options: WeeklyBrief | InfographicArtworkOptions | null | undefined) {
  const config: InfographicArtworkOptions = options && "infographic" in options
    ? { brief: options as WeeklyBrief }
    : (options as InfographicArtworkOptions | null | undefined) ?? {};
  const brief = config.brief;
  const story = config.story;
  const archetype = config.archetype ?? "3-Tier Architecture Framework";
  const layout = config.layout ?? archetype;
  const visualStyle = config.visualStyle ?? "Editorial data grid";
  const title = brief?.infographic.title ?? "From signal to governed action";
  const subtitle = brief?.infographic.subtitle ?? "A weekly Capco perspective on AI adoption";
  const sections = brief?.infographic.sections?.join(" → ") ?? "Signal → Interpretation → Decision rights → Control points → Client action";
  const textPlan = config.textPlan ?? {
    headline: title,
    summary: story?.fact ?? subtitle,
    perspective: story?.capcoImplication ?? brief?.capcoPerspective ?? "Make the operating change and decision explicit.",
    sections: brief?.infographic.sections ?? ["Signal", "Interpretation", "Decision rights", "Control points", "Client action"],
  };
  return [
    "Use case: productivity-visual",
    "Asset type: complete editorial infographic poster for a weekly Capco AI intelligence communication",
    `Primary request: create a finished, information-bearing infographic for the theme \"${title}\" with the subtitle \"${subtitle}\".`,
    `Confirmed source story: \"${story?.title ?? title}\" from ${story?.source ?? "TrendRadar source set"}.`,
    `Grounded fact to express visually: \"${story?.fact ?? "AI capability is changing the operating model around decision rights and controls."}\".`,
    `Capco perspective: \"${story?.capcoImplication ?? brief?.capcoPerspective ?? "Make the operating change, controls, and client decision explicit."}\".`,
    `Selected visual template: ${visualStyle}. Selected layout: ${layout}. Build the composition according to that visual language and layout, with five distinct information zones: ${sections}.`,
    `Consultant art direction: ${config.prompt ?? ""}`,
    `Deterministic seed reference: ${config.seed ?? "auto"}.`,
    config.referenceImage ? "A consultant supplied a visual reference image. Match its composition, palette, and information hierarchy while keeping the approved story text and Capco branding." : "No external reference image was supplied; follow the selected template and layout.",
    `Capco style template: ${CAPCO_INFOGRAPHIC_STYLE_TEMPLATE}`,
    `Render text inside the infographic: headline \"${textPlan.headline ?? title}\"; summary \"${textPlan.summary ?? subtitle}\"; perspective label and copy \"${textPlan.perspective ?? "Capco perspective"}\"; section labels ${textPlan.sections?.join(", ") ?? sections}. Use large, high-contrast editorial typography and keep all text legible. Do not replace the selected story with invented facts.`,
    config.includeText === false ? "Text rendering may be minimal because the caller requested an image-only variant." : "This is not a backdrop-only request: the output must visibly communicate the selected story with headline, labeled sections, summary, and source-aware footer text.",
    "Avoid: neon rainbow gradients, generic futuristic cityscapes, glossy 3D blobs, stock photography, illegible microtype, rounded SaaS card grids, and decorative noise.",
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
