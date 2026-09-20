# Capco AI News Intelligence Tool — Next.js Implementation Plan

## 1. Product intent

Build a weekly AI-news intelligence workspace for Capco consultants and executives. The system will collect user-defined sources, use an LLM to produce grounded summaries and implications, create workflow-oriented infographic specifications, generate visual artwork with an image model, add exact text and icons deterministically, and prepare reviewed email editions.

The first release is a reviewable internal workspace rather than a fully autonomous publisher.

## 2. Visual direction

Use the supplied Capco website and LinkedIn examples as the reference point:

- Editorial consulting feel: confident, direct, high-contrast, spacious.
- Palette: near-black/navy foundation, white content surfaces, warm orange as the primary signal accent, restrained cool blue/green semantic accents.
- Typography: strong condensed/display treatment for headlines paired with a highly readable sans-serif for body copy and controls.
- Composition: asymmetric editorial layouts, bold section titles, thin rules, large numerals, structured whitespace, and purposeful motion.
- Avoid generic SaaS card grids, overly rounded containers, neon AI clichés, and image-model-generated text.

The product UI and generated infographic templates should share the same tokens, but the infographic canvas can use more expressive editorial compositions.

## 3. Core user journeys

### Weekly edition

1. Scheduler opens the current reporting period.
2. Sources are fetched and normalized.
3. Articles are deduplicated, scored, and grouped by topic.
4. The LLM creates grounded consultant and executive summaries.
5. The LLM creates an infographic brief and workflow specification.
6. Image generation produces visual backgrounds or editorial illustrations.
7. A deterministic renderer overlays headlines, labels, charts, icons, workflow nodes, and citations.
8. An editor reviews, edits, regenerates, approves, and previews the edition.
9. The edition can be exported as email HTML, PNG, PDF, or web view.

### Source management

Users can add, edit, enable, disable, and tag RSS feeds, webpages, blogs, and later API/newsletter sources. Each source displays health, last fetch, article count, and extraction status.

### Infographic workflow

Users select an infographic template, choose a generated artwork variant, inspect workflow steps, edit labels, regenerate artwork only, and export without changing the exact text overlay.

## 4. Next.js application structure

Use Next.js App Router with TypeScript.

```text
ainews/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                         # weekly command center
│   ├── editions/[id]/page.tsx            # edition review workspace
│   ├── sources/page.tsx                  # source management
│   ├── infographics/[id]/page.tsx        # canvas/editor view
│   ├── archive/page.tsx                  # historical editions
│   └── api/
│       ├── editions/route.ts
│       ├── sources/route.ts
│       ├── ingest/route.ts
│       ├── summarize/route.ts
│       ├── generate-art/route.ts
│       ├── render-infographic/route.ts
│       └── email/route.ts
├── components/
│   ├── app-shell/
│   ├── dashboard/
│   ├── editorial/
│   ├── infographic/
│   ├── workflow/
│   └── ui/
├── lib/
│   ├── sources/
│   ├── extraction/
│   ├── llm/
│   ├── image-generation/
│   ├── rendering/
│   └── validation/
├── data/
│   ├── demo-articles.ts
│   ├── demo-edition.ts
│   └── templates.ts
├── public/
│   ├── icons/
│   └── generated/
└── prisma/
    └── schema.prisma
```

## 5. Main screens

### A. Weekly command center

- Left navigation: Weekly edition, Sources, Infographics, Archive, Settings.
- Header: reporting week, audience selector, source health, draft status.
- Hero area: “AI signals / Week 38” with overall editorial outlook.
- Story rail: ranked stories with source, topic, impact, and summary status.
- Right-side or lower workflow panel: “How this changes the work” with a staff-readable process diagram.
- Infographic preview: artwork, overlay copy, and template metadata.
- Primary actions: Review edition, Generate visual, Preview email.

### B. Edition review workspace

- Article list and cluster count.
- Consultant / Executive audience toggle.
- Editable summary fields.
- Source citations and confidence flags.
- Approve, remove, regenerate, and reorder actions.
- Preview of the full weekly email.

### C. Infographic editor

- Template picker: executive snapshot, timeline, opportunity/risk matrix, workflow explainer, operating model.
- Artwork variant picker.
- Canvas preview with exact text overlay.
- Workflow inspector for nodes, arrows, roles, and semantic colors.
- Brand controls: palette, density, output ratio, logo lockup, footer/citations.
- Export: PNG, PDF, email image, accessible HTML.

### D. Sources

- Source table with type, topics, trust score, last fetch, status, and enabled state.
- Add-source flow for RSS and URL.
- Per-source extraction preview.
- Fetch history and error details.

## 6. Data and domain models

Core models:

- `Source`: URL, source type, display name, topic tags, trust score, enabled state, extraction rules.
- `FetchRun`: source, started/completed timestamps, status, error, item count.
- `Article`: title, URL, author, published date, normalized text, content hash, source, topics.
- `ArticleCluster`: grouped/duplicate stories, representative article, relevance score.
- `Summary`: audience, headline, summary, why-it-matters, implications, risks, actions, source references.
- `WeeklyEdition`: period, status, selected stories, editorial note, approval metadata.
- `InfographicSpec`: title, theme, palette, sections, required text, artwork prompt, template.
- `WorkflowSpec`: nodes, edges, roles, icon names, status, risk level, semantic colors.
- `ArtworkVariant`: prompt, model, output path, status, selected state.
- `Delivery`: audience, channel, status, sent time, open/click metadata if available.

Use Zod schemas at API and generation boundaries. Store model/prompt versions with every AI-generated artifact.

## 7. LLM pipeline

The LLM should first return structured data, then prose derived from that data.

Required operations:

- Relevance classification.
- Topic and sector tagging.
- Novelty and source-quality scoring.
- Duplicate-story clustering.
- Consultant summary generation.
- Executive summary generation.
- Weekly editorial synthesis.
- Infographic copy generation.
- Workflow extraction.

All summaries must be grounded in retrieved article text. Store source URLs and claim references. The UI should distinguish reported fact, interpretation, and recommendation.

## 8. Image-model and overlay architecture

Do not ask the image model to render final factual copy. Use the image model only for editorial background artwork, visual metaphors, illustrative scenes, or abstract systems around reserved text zones.

Each generation prompt must require blank/low-detail zones and prohibit words, letters, numbers, fake charts, and logos unless a separately approved branded asset is used.

The final infographic is rendered deterministically:

```text
Image-model artwork
+ SVG/HTML text layout
+ chart primitives
+ controlled icon library
+ workflow arrows/nodes
+ source citations and footer
```

Recommended first renderer: React + SVG for the infographic canvas, with server-side export to PNG/PDF later. This makes text wrapping, icons, workflow lines, and brand consistency reliable.

## 9. Workflow diagram system

Workflow diagrams are first-class output, not decoration.

The LLM returns a graph with nodes, edges, lanes, and a legend. Use a controlled SVG icon set for operational meaning. Image generation can create surrounding illustration, but icons, labels, arrows, decision points, and approval controls must be deterministic.

Initial icon categories:

- People: user, team, reviewer, customer.
- AI: agent, model, classify, recommend.
- Information: document, search, database, knowledge base.
- Decisions: approval, warning, escalation, exception.
- Systems: API, cloud, server, integration.
- Actions: receive, transform, publish, email, report.

Default semantic colors:

- Blue: AI or automated activity.
- Orange: human decision or intervention.
- Green: completed/approved.
- Red: risk, exception, or escalation.
- Gray: external/background system.

## 10. Email output

Generate two editions from the same `WeeklyEdition`:

### Executive edition

- Top five developments.
- One-sentence strategic implication per story.
- Opportunity/risk panel.
- One workflow visual.
- One infographic image.

### Consultant edition

- Expanded context and implications.
- Client conversation prompts.
- Industry/use-case notes.
- Workflow detail and implementation considerations.
- Source citations and related reading.

Use responsive HTML email with plain-text fallback and a linked web version. Keep exact text available as HTML for accessibility; do not make the infographic the only source of content.

## 11. MVP milestones

### Milestone 1 — UI shell and seeded demo

- Next.js app shell.
- Capco-inspired design tokens.
- Weekly command center.
- Demo article/story data.
- Static workflow renderer.
- Infographic canvas with deterministic overlay.

### Milestone 2 — Source ingestion

- RSS and URL source adapters.
- Article extraction and normalization.
- Fetch history and source health.

### Milestone 3 — LLM intelligence

- Structured relevance/topic output.
- Consultant and executive summaries.
- Workflow spec generation.
- Review and regeneration states.

### Milestone 4 — Image generation and exports

- Artwork generation endpoint.
- Variant selection.
- SVG/PNG/PDF export.
- Email preview and delivery integration.

### Milestone 5 — Pilot hardening

- Human approval workflow.
- Audit trail and model versioning.
- Failure/retry handling.
- Responsive/mobile review.
- Accessibility and security audit.

## 12. Technology choices

- Next.js App Router + TypeScript.
- Tailwind CSS or CSS Modules with shared design tokens.
- Zod for schemas and validation.
- PostgreSQL + Prisma for production persistence.
- Object storage for generated artwork and exports.
- Background jobs for fetching, LLM calls, image generation, and exports.
- React SVG renderer for workflow/infographic composition.
- Email provider such as Postmark, SendGrid, Mailgun, or SES.

Keep provider integrations behind adapters so the LLM, image model, fetcher, and email provider can be changed without rewriting the product UI.

## 13. Quality and safety controls

- Human approval before sending.
- Source citation per story and major claim.
- Prompt-injection protection for retrieved webpages.
- robots.txt/terms-of-service awareness.
- No republishing of full copyrighted articles.
- Model and prompt version tracking.
- Content confidence and review flags.
- Recipient access control.
- Fetch retries and source health monitoring.
- Plain-text and accessible HTML alternatives for every infographic.

## 14. Definition of done for the first build

- A user can view a seeded weekly edition.
- A user can switch between executive and consultant summaries.
- A user can inspect and edit a workflow diagram.
- A user can preview an infographic with generated-art placeholder plus exact text/icon overlay.
- A user can manage sources.
- A user can preview the email edition.
- The layout is responsive at desktop and mobile widths.
- The app passes typecheck/lint/build checks.
- The design is visually coherent with the supplied Capco references.

## 15. Immediate next implementation step

Start with Milestone 1 in `/Users/alanyoung/Orico/code/capco/ainews`: create the Next.js application shell, define the Capco-inspired tokens, seed the weekly edition, and implement the workflow-first infographic editor before connecting live sources or model providers.
