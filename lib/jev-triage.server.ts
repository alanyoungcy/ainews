import fs from "node:fs";
import path from "node:path";
import type { TrendRadarItem } from "@/lib/trendradar";

export type JevDimension = {
  score: number;
  confidence: number;
  source: "jev" | "fallback";
};

export type JevTriageScore = {
  itemId: string;
  recency: JevDimension;
  aiRelevance: JevDimension;
  hypeTrend: JevDimension;
  capcoImpact: JevDimension;
  composite: number;
  model: string;
};

type ScoreAnswer = { score?: number; confidence?: number };
type JevResponse = { model?: string; answers?: Record<string, ScoreAnswer> };
type CacheFile = { key: string; generatedAt: string; scores: JevTriageScore[] };

const CAPCO_CONTEXT = "Capco is a technology consultancy specialising in financial services and energy. Relevant capabilities include banking and payments, capital markets, wealth and asset management, data office, technology, AI, operating-model transformation, risk, resilience, and work in regulated and scrutinised sectors. Prioritise practical client impact over generic technology novelty.";
const WEIGHTS = { recency: 0.45, aiRelevance: 0.25, hypeTrend: 0.15, capcoImpact: 0.15 } as const;
const AI_TERMS = /\b(ai|artificial intelligence|agentic|agent|agents|model|models|llm|inference|gpu|robot|automation|openai|anthropic|generative|synthetic|nvidia|machine learning|neural)\b/i;
const CAPCO_TERMS = /\b(bank|banking|wealth|asset management|capital markets|payments|insurance|risk|regulat|compliance|cyber|resilien|data office|technology|transformation|operations|client experience|financial services)\b/i;
const TREND_TERMS = /\b(breakthrough|launch|launched|record|surge|adoption|funding|investment|partnership|acquisition|trend|viral|benchmark|first|new|latest|update)\b/i;

function cachePath() {
  return path.join(process.cwd(), "data", "trendradar", "jev-triage.json");
}

function hashKey(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function feedKey(items: TrendRadarItem[]) {
  return hashKey(items.map((item) => [item.id, item.publishedAt, item.lastSeenAt, item.rank].join("|")).join("\n"));
}

function readCache(key: string) {
  try {
    const cache = JSON.parse(fs.readFileSync(cachePath(), "utf8")) as CacheFile;
    return cache.key === key ? cache : null;
  } catch {
    return null;
  }
}

function writeCache(cache: CacheFile) {
  try {
    const filePath = cachePath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(cache), "utf8");
  } catch {
    // Read-only hosted filesystems still get the live Jev response.
  }
}

function deterministicDimension(score: number): JevDimension {
  return { score: Math.max(0, Math.min(100, Math.round(score))), confidence: 0.35, source: "fallback" };
}

function fallbackScore(item: TrendRadarItem): JevTriageScore {
  const text = `${item.title} ${item.summary ?? ""}`;
  const published = item.publishedAt ? new Date(item.publishedAt).getTime() : 0;
  const ageHours = published ? Math.max(0, (Date.now() - published) / 3_600_000) : 96;
  const recency = ageHours <= 6 ? 100 : ageHours <= 24 ? 88 : ageHours <= 72 ? 70 : ageHours <= 168 ? 48 : 20;
  const ai = AI_TERMS.test(text) ? 92 : 18;
  const hype = Math.min(100, (item.rank ? Math.max(0, 100 - item.rank * 2) : 35) + (TREND_TERMS.test(text) ? 28 : 0));
  const impact = CAPCO_TERMS.test(text) ? 88 : 28;
  const dimensions = { recency: deterministicDimension(recency), aiRelevance: deterministicDimension(ai), hypeTrend: deterministicDimension(hype), capcoImpact: deterministicDimension(impact) };
  return { itemId: item.id, ...dimensions, composite: Math.round(recency * WEIGHTS.recency + ai * WEIGHTS.aiRelevance + hype * WEIGHTS.hypeTrend + impact * WEIGHTS.capcoImpact), model: "local-triage-fallback" };
}

function scoreTo100(answer: ScoreAnswer | undefined, fallback: JevDimension, levels = 5): JevDimension {
  const raw = Number(answer?.score);
  if (!Number.isFinite(raw)) return fallback;
  return { score: Math.round(Math.max(0, Math.min(100, raw / (levels - 1) * 100)),), confidence: Number(answer?.confidence ?? 0), source: "jev" };
}

async function scoreWithJev(item: TrendRadarItem): Promise<JevTriageScore> {
  const fallback = fallbackScore(item);
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) return fallback;
  const base = (process.env.TYPESAFE_API_BASE ?? "https://api.typesafe.ai/v1").replace(/\/$/, "");
  const state = {
    story: { title: item.title, source: item.source, summary: item.summary, publishedAt: item.publishedAt, firstSeenAt: item.firstSeenAt, lastSeenAt: item.lastSeenAt, rank: item.rank, kind: item.kind },
    capcoContext: CAPCO_CONTEXT,
    today: new Date().toISOString(),
  };
  try {
    const response = await fetch(`${base}/systemone`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "jev-latest",
        state,
        questions: {
          recency: { type: "score", instructions: "How current is this story for a weekly editorial triage? Use the supplied publication and observation timestamps; a story published within 24 hours is highest, then 2-3 days, 4-7 days, 8-30 days, or older/unknown.", criteria: ["Older than 30 days or no usable date", "8–30 days old", "4–7 days old", "2–3 days old", "Published or observed within the last 24 hours"] },
          aiRelevance: { type: "score", instructions: "How directly is this story about AI or an AI-enabled capability? Do not reward a generic technology story unless AI is central.", criteria: ["No meaningful AI connection", "AI is incidental or speculative", "AI is one material part of the story", "AI is central and clearly evidenced", "AI is the primary subject and directly useful to an AI news edition"] },
          hypeTrend: { type: "score", instructions: "How strong is the current hype or trend signal? Consider explicit momentum, launches, adoption, funding, benchmarks, partnerships, ranking, and recurrence, while discounting empty hype.", criteria: ["No visible momentum", "Weak or isolated signal", "Some evidence of momentum", "Strong current trend signal", "Exceptional momentum with multiple concrete indicators"] },
          capcoImpact: { type: "score", instructions: "How directly could this matter to Capco clients and propositions? Use Capco’s financial-services, banking and payments, capital-markets, wealth, data, technology, AI, operating-model, risk, resilience, and regulated-sector context. Reward practical client impact.", criteria: ["No meaningful Capco or client relevance", "Indirect relevance to technology or general business", "Relevant to one financial-services or transformation concern", "Directly relevant to a Capco client decision or regulated operating model", "Immediate, material impact across a priority Capco financial-services domain"] },
        },
      }),
      signal: AbortSignal.timeout(Number(process.env.TYPESAFE_TIMEOUT_MS ?? 20000)),
    });
    if (!response.ok) return fallback;
    const payload = await response.json() as JevResponse;
    const recency = scoreTo100(payload.answers?.recency, fallback.recency);
    const aiRelevance = scoreTo100(payload.answers?.aiRelevance, fallback.aiRelevance);
    const hypeTrend = scoreTo100(payload.answers?.hypeTrend, fallback.hypeTrend);
    const capcoImpact = scoreTo100(payload.answers?.capcoImpact, fallback.capcoImpact);
    const composite = Math.round(recency.score * WEIGHTS.recency + aiRelevance.score * WEIGHTS.aiRelevance + hypeTrend.score * WEIGHTS.hypeTrend + capcoImpact.score * WEIGHTS.capcoImpact);
    return { itemId: item.id, recency, aiRelevance, hypeTrend, capcoImpact, composite, model: payload.model ?? "jev-latest" };
  } catch {
    return fallback;
  }
}

export async function rankWithJev(items: TrendRadarItem[], limit = 32) {
  const key = feedKey(items);
  const cached = readCache(key);
  if (cached) return { scores: cached.scores, cached: true, model: cached.scores[0]?.model ?? "jev-latest" };
  const candidates = [...items].sort((a, b) => fallbackScore(b).composite - fallbackScore(a).composite).slice(0, limit);
  const scores: JevTriageScore[] = [];
  for (let index = 0; index < candidates.length; index += 6) {
    const batch = await Promise.all(candidates.slice(index, index + 6).map(scoreWithJev));
    scores.push(...batch);
  }
  scores.sort((a, b) => b.composite - a.composite);
  writeCache({ key, generatedAt: new Date().toISOString(), scores });
  return { scores, cached: false, model: scores[0]?.model ?? "local-triage-fallback" };
}
