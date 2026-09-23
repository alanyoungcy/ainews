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

export type JevDedupeResult = {
  uniqueItems: TrendRadarItem[];
  uniqueItemIds: string[];
  duplicateItemIds: string[];
  duplicateGroups: string[][];
  duplicateCount: number;
  model: string;
};

type ScoreAnswer = { score?: number; confidence?: number };
type JevResponse = { model?: string; answers?: Record<string, ScoreAnswer> };
type CacheFile = { key: string; generatedAt: string; scores: JevTriageScore[]; dedupe?: JevDedupeResult };

const CAPCO_CONTEXT = "Capco is a technology consultancy specialising in financial services and energy. Relevant capabilities include banking and payments, capital markets, wealth and asset management, data office, technology, AI, operating-model transformation, risk, resilience, and work in regulated and scrutinised sectors. Prioritise practical client impact over generic technology novelty.";
const WEIGHTS = { recency: 0.45, aiRelevance: 0.25, hypeTrend: 0.15, capcoImpact: 0.15 } as const;
const AI_TERMS = /\b(ai|artificial intelligence|agentic|agent|agents|model|models|llm|inference|gpu|robot|automation|openai|anthropic|generative|synthetic|nvidia|machine learning|neural)\b/i;
const CAPCO_TERMS = /\b(bank|banking|wealth|asset management|capital markets|payments|insurance|risk|regulat|compliance|cyber|resilien|data office|technology|transformation|operations|client experience|financial services)\b/i;
const TREND_TERMS = /\b(breakthrough|launch|launched|record|surge|adoption|funding|investment|partnership|acquisition|trend|viral|benchmark|first|new|latest|update)\b/i;
const COMMON_WORDS = new Set(["about", "after", "and", "from", "into", "news", "over", "that", "the", "this", "with"]);

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

function normalizeUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    url.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref", "output"].forEach((key) => url.searchParams.delete(key));
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return value.trim().toLowerCase().replace(/\/$/, "");
  }
}

function storyText(item: TrendRadarItem) {
  return `${item.title} ${item.summary ?? ""}`.toLowerCase();
}

function storyTokens(item: TrendRadarItem) {
  return new Set(storyText(item).replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((token) => token.length > 2 && !COMMON_WORDS.has(token)));
}

function tokenSimilarity(a: TrendRadarItem, b: TrendRadarItem) {
  const left = storyTokens(a);
  const right = storyTokens(b);
  if (!left.size || !right.size) return 0;
  const intersection = [...left].filter((token) => right.has(token)).length;
  return intersection / (left.size + right.size - intersection);
}

function publishedTime(item: TrendRadarItem) {
  const value = item.publishedAt ? Date.parse(item.publishedAt) : 0;
  return Number.isFinite(value) ? value : 0;
}

function canonicalStory(items: TrendRadarItem[]) {
  return [...items].sort((a, b) => {
    const rankA = a.rank ?? 9999;
    const rankB = b.rank ?? 9999;
    return (a.kind === "hotlist" ? -1 : 0) - (b.kind === "hotlist" ? -1 : 0) || rankA - rankB || publishedTime(b) - publishedTime(a) || (b.summary?.length ?? 0) - (a.summary?.length ?? 0);
  })[0];
}

function fallbackDuplicate(a: TrendRadarItem, b: TrendRadarItem) {
  const urlA = normalizeUrl(a.url);
  const urlB = normalizeUrl(b.url);
  if (urlA && urlB && urlA === urlB) return true;
  const similarity = tokenSimilarity(a, b);
  return similarity >= 0.78 || (similarity >= 0.62 && a.sourceId === b.sourceId);
}

async function askJevForDuplicates(pairs: Array<[TrendRadarItem, TrendRadarItem]>) {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey || !pairs.length) return new Map<number, boolean>();
  const base = (process.env.TYPESAFE_API_BASE ?? "https://api.typesafe.ai/v1").replace(/\/$/, "");
  const questions = Object.fromEntries(pairs.map(([left, right], index) => [`pair_${index}`, {
    type: "noul",
    instructions: {
      pair: { first: { title: left.title, source: left.source, summary: left.summary }, second: { title: right.title, source: right.source, summary: right.summary } },
      question: "Do these two records describe the same underlying news event or announcement, even if the wording and publisher differ? Ignore shared topic alone; require the same concrete event, release, study, company action, or claim.",
    },
    criteria: { true: "Same underlying news event or announcement; one should be deduplicated.", false: "Different events, merely related topics, or recurring coverage without the same concrete event." },
  }]));
  try {
    const response = await fetch(`${base}/systemone`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "jev-latest", state: { purpose: "semantic news deduplication" }, questions }),
      signal: AbortSignal.timeout(Number(process.env.TYPESAFE_DEDUPE_TIMEOUT_MS ?? process.env.TYPESAFE_TIMEOUT_MS ?? 20000)),
    });
    if (!response.ok) return new Map<number, boolean>();
    const payload = await response.json() as { answers?: Record<string, { noul?: number }> };
    return new Map(pairs.map((_, index) => [index, Number(payload.answers?.[`pair_${index}`]?.noul ?? 0) >= 0.78]));
  } catch {
    return new Map<number, boolean>();
  }
}

async function deduplicateStories(items: TrendRadarItem[]): Promise<JevDedupeResult> {
  const groups: TrendRadarItem[][] = [];
  const byUrl = new Map<string, TrendRadarItem[]>();
  const ungrouped: TrendRadarItem[] = [];
  for (const item of items) {
    const key = normalizeUrl(item.url);
    if (key) byUrl.set(key, [...(byUrl.get(key) ?? []), item]);
    else ungrouped.push(item);
  }
  for (const group of byUrl.values()) groups.push(group);
  const representatives = [...groups.map((group) => canonicalStory(group)), ...ungrouped];
  const candidatePairs: Array<[TrendRadarItem, TrendRadarItem]> = [];
  const deterministicPairs: Array<[TrendRadarItem, TrendRadarItem]> = [];
  for (let leftIndex = 0; leftIndex < representatives.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < representatives.length; rightIndex += 1) {
      const left = representatives[leftIndex];
      const right = representatives[rightIndex];
      const similarity = tokenSimilarity(left, right);
      if (similarity >= 0.78 || (similarity >= 0.62 && left.sourceId === right.sourceId)) deterministicPairs.push([left, right]);
      else if (similarity >= 0.48) candidatePairs.push([left, right]);
    }
  }
  const jevResults = new Map<number, boolean>();
  for (let index = 0; index < candidatePairs.length; index += 12) {
    const batch = await askJevForDuplicates(candidatePairs.slice(index, index + 12));
    batch.forEach((value, batchIndex) => jevResults.set(index + batchIndex, value));
  }
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    const root = parent.get(id);
    if (!root || root === id) return root ?? id;
    const resolved = find(root);
    parent.set(id, resolved);
    return resolved;
  };
  const union = (a: string, b: string) => { const left = find(a); const right = find(b); if (left !== right) parent.set(right, left); };
  representatives.forEach((item) => parent.set(item.id, item.id));
  groups.forEach((group) => group.slice(1).forEach((item) => union(group[0].id, item.id)));
  deterministicPairs.forEach(([left, right]) => union(left.id, right.id));
  candidatePairs.forEach(([left, right], index) => { if (jevResults.get(index) === true || (!process.env.TYPESAFE_API_KEY && fallbackDuplicate(left, right))) union(left.id, right.id); });
  const grouped = new Map<string, TrendRadarItem[]>();
  items.forEach((item) => { const root = find(item.id); grouped.set(root, [...(grouped.get(root) ?? []), item]); });
  const duplicateGroups = [...grouped.values()].filter((group) => group.length > 1).map((group) => group.map((item) => item.id));
  const uniqueItems = [...grouped.values()].map((group) => canonicalStory(group));
  const duplicateItemIds = duplicateGroups.flatMap((group) => group.slice(1));
  return { uniqueItems, uniqueItemIds: uniqueItems.map((item) => item.id), duplicateItemIds, duplicateGroups, duplicateCount: duplicateItemIds.length, model: process.env.TYPESAFE_API_KEY ? "jev-latest" : "local-semantic-fallback" };
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
  if (cached) return { scores: cached.scores, dedupe: cached.dedupe ?? { uniqueItems: items, uniqueItemIds: items.map((item) => item.id), duplicateItemIds: [], duplicateGroups: [], duplicateCount: 0, model: "legacy-cache" }, cached: true, model: cached.scores[0]?.model ?? "jev-latest" };
  const dedupe = await deduplicateStories(items);
  const candidates = [...dedupe.uniqueItems].sort((a, b) => fallbackScore(b).composite - fallbackScore(a).composite).slice(0, limit);
  const scores: JevTriageScore[] = [];
  for (let index = 0; index < candidates.length; index += 6) {
    const batch = await Promise.all(candidates.slice(index, index + 6).map(scoreWithJev));
    scores.push(...batch);
  }
  scores.sort((a, b) => b.composite - a.composite);
  writeCache({ key, generatedAt: new Date().toISOString(), scores, dedupe });
  return { scores, dedupe, cached: false, model: scores[0]?.model ?? "local-triage-fallback" };
}
