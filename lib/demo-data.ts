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
  { name: "Financial Times · AI", type: "RSS", topics: "Markets, operating model", trust: 96, lastFetch: "12 min ago", status: "Healthy", articles: 28, enabled: true },
  { name: "The Economist · Technology Quarterly", type: "RSS", topics: "Risk, geopolitics", trust: 91, lastFetch: "31 min ago", status: "Healthy", articles: 19, enabled: true },
  { name: "MIT Technology Review", type: "Web", topics: "Research, customer", trust: 88, lastFetch: "1 hr ago", status: "Needs review", articles: 14, enabled: true },
  { name: "The Verge · AI", type: "RSS", topics: "Technology, product", trust: 79, lastFetch: "2 hrs ago", status: "Healthy", articles: 33, enabled: true },
  { name: "Capco Insights", type: "Web", topics: "Internal, sectors", trust: 98, lastFetch: "Yesterday", status: "Healthy", articles: 9, enabled: false },
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
  id: "week-38-2026",
  period: "08–14 September 2026",
  status: "Draft for review",
  outlook: "The AI story is moving from capability to choreography. This week’s signals point to a quieter, more consequential shift: the operating model around models is becoming the differentiator.",
  editorialNote: "Keep the edition practical. Lead with what changed in the work, then show the decision a client can make next.",
};
