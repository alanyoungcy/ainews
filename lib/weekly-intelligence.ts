import type { TrendRadarFeed, TrendRadarItem } from "@/lib/trendradar";

export type WeeklyStory = {
  title: string;
  source: string;
  url: string | null;
  fact: string;
  capcoImplication: string;
  confidence: number;
};

export type WeeklyBrief = {
  headline: string;
  thesis: string;
  capcoPerspective: string;
  stories: WeeklyStory[];
  actions: string[];
  infographic: {
    title: string;
    subtitle: string;
    visualDirection: string;
    sections: string[];
  };
};

export type WeeklyBriefResult = {
  brief: WeeklyBrief;
  meta: {
    provider: "openai-compatible" | "fallback";
    model: string;
    groundedItems: number;
    groundedSources: number;
    generatedAt: string;
    providerError?: string;
  };
};

const AI_KEYWORDS = /\b(ai|artificial intelligence|agentic|agent|agents|model|models|llm|inference|gpu|robot|automation|openai|anthropic|google ai|google ai studio|machine learning|neural|weights|generative|synthetic|nvidia|oracle|stepfun)\b|人工智能|大模型|生成式|机器人|英伟达|甲骨文.*AI/i;
const NOISE_KEYWORDS = /\b(jim cramer|mortgage|credit card|cd rates|social security|dividend|wheat|corn|gold price|bitcoin|ethereum|travel company|stock target|analyst sets|chapter 7|walmart|kroger|tesla|visa|mastercard)\b/i;

function candidateScore(item: TrendRadarItem) {
  const text = `${item.title} ${item.summary ?? ""}`;
  let score = 0;
  if (AI_KEYWORDS.test(text)) score += 10;
  if (item.kind === "rss") score += 4;
  if (item.source.toLowerCase().includes("hacker news")) score += 1;
  if (item.kind === "hotlist" && item.rank) score += Math.max(0, 5 - item.rank / 25);
  if (NOISE_KEYWORDS.test(text)) score -= 12;
  return score;
}

export function selectWeeklyCandidates(feed: TrendRadarFeed, limit = 18): TrendRadarItem[] {
  const selected = [...feed.items]
    .filter((item) => {
      const text = `${item.title} ${item.summary ?? ""}`;
      return AI_KEYWORDS.test(text) && !NOISE_KEYWORDS.test(text);
    })
    .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index)
    .sort((a, b) => candidateScore(b) - candidateScore(a) || (a.rank ?? 9999) - (b.rank ?? 9999))
    .slice(0, limit);
  return selected.length ? selected : feed.items.slice(0, limit);
}

export function buildFallbackBrief(feed: TrendRadarFeed): WeeklyBriefResult {
  const candidates = selectWeeklyCandidates(feed, 5);
  const stories = candidates.map((item, index) => ({
    title: item.title,
    source: item.source,
    url: item.url,
    fact: item.summary || `TrendRadar ranked this signal ${item.rank ? `at #${item.rank}` : "among the current feed"}.`,
    capcoImplication: index === 0
      ? "Help clients separate the visible model announcement from the operating change it creates: controls, ownership, and measurable workflow impact."
      : "Use this as a prompt to test where the client’s operating model, risk posture, or customer experience needs to adapt next.",
    confidence: item.kind === "rss" ? 82 : 72,
  }));
  const primary = stories[0]?.title ?? "AI signals from TrendRadar";
  return {
    brief: {
      headline: "The AI story is becoming an operating model story",
      thesis: `This week’s TrendRadar feed clusters around the decisions behind AI adoption, with ${feed.source.rssItems} RSS items and ${feed.source.hotListItems} ranked signals available for review.`,
      capcoPerspective: "For Capco, the useful question is where a new AI capability changes a client’s decision rights, controls, and customer promise. The weekly communication should make that shift concrete enough to act on.",
      stories,
      actions: [
        "Frame the leading signal as a change to work, ownership, or risk rather than a model announcement.",
        "Pressure-test the client’s approval and exception paths before recommending an agentic use case.",
        "Carry the source link and confidence label into the editorial review before publication.",
      ],
      infographic: {
        title: "From signal to governed action",
        subtitle: `A Capco perspective on ${primary.toLowerCase()}`,
        visualDirection: "Dark editorial systems map with an orange human-decision path, cool blue automated steps, and generous blank zones for deterministic copy overlays.",
        sections: ["Signal", "Interpretation", "Decision rights", "Control points", "Client action"],
      },
    },
    meta: {
      provider: "fallback",
      model: "local-grounded-fallback",
      groundedItems: feed.items.length,
      groundedSources: new Set(feed.items.map((item) => item.sourceId)).size,
      generatedAt: new Date().toISOString(),
    },
  };
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text.match(/\{[\s\S]*\}/)?.[0];
  if (!candidate) throw new Error("Model response did not contain a JSON object");
  return JSON.parse(candidate);
}

export async function generateWeeklyBrief(feed: TrendRadarFeed): Promise<WeeklyBriefResult> {
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.AI_API_BASE || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.AI_MODEL || "gpt-4o-mini";
  if (!apiKey) return buildFallbackBrief(feed);

  const candidates = selectWeeklyCandidates(feed);
  const prompt = {
    audience: "Capco consultants and executives",
    requirement: "Create a grounded weekly AI news communication with a clear Capco perspective. Separate facts from implications. Use only the supplied items. Return JSON only.",
    schema: {
      headline: "string",
      thesis: "string",
      capcoPerspective: "string",
      stories: [{ title: "string", source: "string", url: "string|null", fact: "string", capcoImplication: "string", confidence: "number 0-100" }],
      actions: ["string"],
      infographic: { title: "string", subtitle: "string", visualDirection: "string", sections: ["string"] },
    },
    sources: candidates.map((item) => ({ id: item.id, kind: item.kind, title: item.title, source: item.source, url: item.url, rank: item.rank, summary: item.summary })),
  };

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a senior Capco editorial strategist. Be precise, practical, and explicit about what is reported fact versus advisory interpretation." },
          { role: "user", content: JSON.stringify(prompt) },
        ],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI provider returned no content");
    const brief = extractJson(content) as WeeklyBrief;
    return {
      brief,
      meta: { provider: "openai-compatible", model, groundedItems: candidates.length, groundedSources: new Set(candidates.map((item) => item.sourceId)).size, generatedAt: new Date().toISOString() },
    };
  } catch (error) {
    const fallback = buildFallbackBrief(feed);
    const providerError = error instanceof Error
      ? /timeout|abort/i.test(error.message)
        ? `AI provider timed out after 8 seconds at ${baseUrl}.`
        : /fetch failed|network|resolve|connect/i.test(error.message)
          ? `Could not reach the AI provider at ${baseUrl}.`
          : error.message.slice(0, 160)
      : "AI provider request failed";
    return {
      ...fallback,
      meta: {
        ...fallback.meta,
        providerError,
      },
    };
  }
}
