export type JevCriterion = {
  id: string;
  label: string;
  description: string;
  instruction: string;
  weight: number;
  enabled: boolean;
};

export type JevSettings = {
  version: 1;
  updatedAt: string | null;
  criteria: JevCriterion[];
};

export const DEFAULT_JEV_CRITERIA: JevCriterion[] = [
  {
    id: "recency",
    label: "Recency",
    description: "Prioritise stories that are current for this week’s edition.",
    instruction: "How current is this story for a weekly editorial triage? Use the supplied publication and observation timestamps; a story published within 24 hours is highest, then 2-3 days, 4-7 days, 8-30 days, or older/unknown.",
    weight: 45,
    enabled: true,
  },
  {
    id: "aiRelevance",
    label: "AI relevance",
    description: "Keep AI central rather than rewarding generic technology coverage.",
    instruction: "How directly is this story about AI or an AI-enabled capability? Do not reward a generic technology story unless AI is central.",
    weight: 25,
    enabled: true,
  },
  {
    id: "hypeTrend",
    label: "Hype & trend",
    description: "Measure concrete momentum, launches, adoption, and market signal.",
    instruction: "How strong is the current hype or trend signal? Consider explicit momentum, launches, adoption, funding, benchmarks, partnerships, ranking, and recurrence, while discounting empty hype.",
    weight: 15,
    enabled: true,
  },
  {
    id: "capcoImpact",
    label: "Capco impact",
    description: "Score practical relevance to Capco’s financial-services clients.",
    instruction: "How directly could this matter to Capco clients and propositions? Use Capco’s financial-services, banking and payments, capital-markets, wealth, data, technology, AI, operating-model, risk, resilience, and regulated-sector context. Reward practical client impact.",
    weight: 15,
    enabled: true,
  },
];

export function normalizeJevCriteria(value: unknown): JevCriterion[] {
  if (!Array.isArray(value)) return DEFAULT_JEV_CRITERIA;
  const criteria = value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Partial<JevCriterion>;
    if (typeof item.id !== "string" || typeof item.label !== "string" || typeof item.instruction !== "string") return [];
    const weight = Number(item.weight);
    return [{
      id: item.id.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 48) || `criterion-${Math.random().toString(36).slice(2, 8)}`,
      label: item.label.trim().slice(0, 80) || "Untitled criterion",
      description: typeof item.description === "string" ? item.description.trim().slice(0, 180) : "Custom Jev ranking criterion.",
      instruction: item.instruction.trim().slice(0, 800),
      weight: Number.isFinite(weight) ? Math.max(0, Math.min(100, weight)) : 0,
      enabled: item.enabled !== false,
    } satisfies JevCriterion];
  });
  const unique = criteria.filter((criterion, index, all) => all.findIndex((candidate) => candidate.id === criterion.id) === index);
  return unique.length ? unique : DEFAULT_JEV_CRITERIA;
}

export function normalizeJevSettings(value: unknown): JevSettings {
  const record = value && typeof value === "object" ? value as Partial<JevSettings> : {};
  return { version: 1, updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : null, criteria: normalizeJevCriteria(record.criteria) };
}
