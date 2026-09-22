export type Audience = "consultant" | "executive";

export type Story = {
  id: string;
  rank: number;
  title: string;
  source: string;
  sourceType: string;
  published: string;
  topic: string;
  impact: "High" | "Medium" | "Watch";
  signal: string;
  summary: string;
  whyItMatters: string;
  consultant: string;
  executive: string;
  confidence: number;
};

export const stories: Story[] = [
  {
    id: "agentic-ops",
    rank: 1,
    title: "Agentic workflows move from demo to operating model",
    source: "Financial Times",
    sourceType: "Briefing",
    published: "Today · 07:40",
    topic: "Operating model",
    impact: "High",
    signal: "01",
    summary: "Large institutions are formalising the hand-offs, approvals, and exception paths that let AI agents work inside regulated processes.",
    whyItMatters: "The advantage shifts from model choice to orchestration design, controls, and the quality of human intervention.",
    consultant: "Use this as a conversation opener with COOs: the practical question is no longer where to pilot an agent, but which decision rights should move into a governed workflow.",
    executive: "Agentic AI is becoming an operating model decision. Organisations that define ownership and escalation paths early will compound their advantage.",
    confidence: 94,
  },
  {
    id: "sovereign-stack",
    rank: 2,
    title: "Sovereign AI stacks become a board-level design constraint",
    source: "The Economist",
    sourceType: "Analysis",
    published: "Yesterday · 16:20",
    topic: "Risk & resilience",
    impact: "High",
    signal: "02",
    summary: "Data residency, model provenance, and compute concentration are shaping architecture decisions as much as cost or performance.",
    whyItMatters: "AI portfolios now need a geopolitical and supply-chain lens, especially for cross-border data and critical services.",
    consultant: "Map the client’s model dependencies against regulatory and infrastructure constraints before recommending a platform standard.",
    executive: "AI resilience is inseparable from strategic resilience. Board oversight should include model concentration and jurisdictional exposure.",
    confidence: 89,
  },
  {
    id: "synthetic-research",
    rank: 3,
    title: "Synthetic research cuts insight cycles, not judgement",
    source: "MIT Technology Review",
    sourceType: "Research",
    published: "Mon · 11:05",
    topic: "Customer intelligence",
    impact: "Medium",
    signal: "03",
    summary: "Teams are using synthetic panels to pressure-test propositions between live research rounds, with the strongest results coming from hybrid methods.",
    whyItMatters: "Faster iteration raises the value of research governance and makes sample quality an executive concern.",
    consultant: "Position synthetic research as a directional tool with explicit validation gates, not as a replacement for representative evidence.",
    executive: "Synthetic research can accelerate learning, but the confidence label must travel with every decision that uses it.",
    confidence: 82,
  },
  {
    id: "energy-efficiency",
    rank: 4,
    title: "Inference efficiency becomes an experience metric",
    source: "The Verge",
    sourceType: "Signal",
    published: "Sun · 18:30",
    topic: "Technology",
    impact: "Medium",
    signal: "04",
    summary: "Smaller models and smarter routing are improving response times while helping teams keep AI economics visible at the product layer.",
    whyItMatters: "Latency and cost now shape whether AI features feel useful enough to become habitual.",
    consultant: "Add model routing and fallback behaviour to service blueprints, alongside the human experience and cost envelope.",
    executive: "The next AI gains may come from orchestration discipline rather than larger models.",
    confidence: 76,
  },
];

export const sources = [
  { name: "OpenAI News", type: "RSS", topics: "Models, product updates", trust: 98, lastFetch: "Awaiting sync", status: "Healthy", articles: 0, enabled: true },
  { name: "Hugging Face Blog", type: "RSS", topics: "Models, tooling", trust: 94, lastFetch: "Awaiting sync", status: "Healthy", articles: 0, enabled: true },
  { name: "MIT Technology Review · AI", type: "RSS", topics: "Analysis, industry context", trust: 96, lastFetch: "Awaiting sync", status: "Healthy", articles: 0, enabled: true },
  { name: "Google AI Blog", type: "RSS", topics: "Models, platforms", trust: 95, lastFetch: "Awaiting sync", status: "Healthy", articles: 0, enabled: true },
  { name: "MarkTechPost", type: "RSS", topics: "Research, launches", trust: 86, lastFetch: "Awaiting sync", status: "Healthy", articles: 0, enabled: true },
];

export const workflowNodes = [
  { id: "receive", x: 7, y: 42, label: "Receive signal", sub: "Source feed", kind: "external" },
  { id: "classify", x: 28, y: 42, label: "Classify & score", sub: "AI / automatic", kind: "ai" },
  { id: "review", x: 51, y: 21, label: "Editorial review", sub: "Human decision", kind: "human" },
  { id: "route", x: 51, y: 63, label: "Route to owner", sub: "Human decision", kind: "human" },
  { id: "publish", x: 77, y: 42, label: "Publish edition", sub: "Approved output", kind: "done" },
];

export const infographicTemplates = [
  { id: "operating-model", name: "Operating model", description: "Show how an AI signal changes roles and hand-offs.", ratio: "16:9", status: "Selected" },
  { id: "executive-snapshot", name: "Executive snapshot", description: "One headline, three signals, one decision.", ratio: "4:5", status: "Available" },
  { id: "risk-matrix", name: "Opportunity / risk", description: "Balance momentum against constraints.", ratio: "1:1", status: "Available" },
  { id: "timeline", name: "Adoption timeline", description: "Map a change from now to next.", ratio: "16:9", status: "Available" },
];

export const edition = {
  id: "week-42-2026",
  period: "12–18 October 2026",
  status: "Draft for review",
  outlook: "GenAI is moving from capability to choreography across Tier-1 wealth and banking. The differentiator is becoming the operating model around models: decision rights, controls, and client experience.",
  editorialNote: "Keep the edition practical. Lead with what changed in the work, then show the decision a client can make next.",
};
