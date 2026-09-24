# Capco AI News Intelligence Workspace

Capco AI News is a Next.js workspace for turning a short-lived stream of English AI and technology news into a reviewed, Capco-focused communication package. It combines TrendRadar/RSS ingestion, Jev-based triage, grounded editorial synthesis, image-model infographic generation, and multi-format dispatch in one human-in-the-loop workflow.

The application is designed for consultants and editorial operators who need to answer four questions in sequence:

1. What is new and relevant now?
2. What does it mean for Capco and financial-services clients?
3. What visual asset best communicates the approved story?
4. Is the edition ready to export or dispatch?

The application intentionally keeps the source snapshot fresh. Ingested news is retained for 14 days, then purged during the next sync. Stories that have already been dispatched are flagged so they can be filtered out of future curation.

## Screens and workflow

### Screen 01: Story ingestion and AI curation

Route: /

The dashboard loads the persisted TrendRadar snapshot and exposes a manual Sync latest TrendRadar action. Syncing fetches every enabled RSS source, parses RSS or Atom entries, filters for English, merges the result with the current snapshot, applies the 14-day retention window, and reports telemetry such as fetched, retained, added, duplicate, failed, and purged records.

The retained stories are sent through the Jev triage layer. Jev performs semantic deduplication and returns a score with four visible dimensions:

- recency (the highest-weight signal)
- AI relevance
- hype and trend
- Capco impact

The story table can be sorted by Jev score, newest or oldest date, recency, AI relevance, hype/trend, or Capco impact. Date-window and minimum-score filters help the operator select a useful set without repeatedly choosing stories already dispatched.

Selecting stories and advancing creates the Stage 01 handoff. The handoff contains the selected source records and the edition context used by later stages.

### Screen 02: Editorial review and approval gate

Route: /editions/[id]

Screen 02 is the first human approval gate. For each selected story, the weekly-intelligence service creates a source-grounded package containing:

- a concise headline and executive summary
- contextual implications
- Capco point of view (PoV)
- client or operating actions
- source citations and fact-grounding notes
- an infographic direction

The operator can edit the headline, summary, and PoV, approve or request a rewrite, and remove or swap a story. Advancing only succeeds after the selected story set is approved. The approved content is persisted as the Stage 02 handoff.

If the configured AI provider is unavailable or times out, the application returns a deterministic, source-grounded local brief. This keeps the editorial workflow usable while clearly marking the provider status. Weekly briefs are cached so a later screen does not need to regenerate the same work.

### Screen 03: Visual curation and infographic synthesis

Route: /infographics/[id]

Screen 03 consumes the approved Stage 02 handoff, not just an image. The story headline, summary, Capco PoV, metrics, sources, selected visual style, and selected layout are carried into the visual brief.

The operator selects a visual style and layout archetype, then asks the configured image-generation provider to create the infographic artwork. The image model is used for the composition and visual treatment; the approved editorial content remains the source of truth for the visual brief. Generated results are cached in the infographic memory store so a retry or a later screen can reuse the same artifact.

The OCR endpoint and overlay plumbing exist for future refinement, but the separate OCR text overlay interaction is currently disabled in the UI. The current workflow is intentionally focused on generating a coherent infographic asset from the approved story rather than placing unrelated text on top of a backdrop.

Confirming the visual writes the Stage 03 handoff, including the artwork and the complete approved story bundle.

### Screen 04: Multi-format preview and dispatch

Route: /dispatch

Screen 04 consumes the Stage 03 handoff and shows the finalized story content together with the generated visual. It provides channel previews for mobile, email, and HTML/web, plus export actions for the available HTML, JSON, and image representations.

Before dispatch, the operator completes the final human checks, including source and disclaimer review, recipient/channel verification, and confirmation that the visual and editorial bundle are the intended edition. Dispatch history is persisted through the edition-status service. Dispatched story IDs are then marked so the Screen 01 filters can hide them on later demos or editions.

## Architecture

The application is a Next.js 15 App Router project. React pages provide the workflow shell, while server routes coordinate ingestion, scoring, AI calls, image generation, persistence, and exports. Local JSON files are used as a lightweight workspace store; this keeps the demo easy to run without a database and makes the handoff state inspectable during development.

~~~mermaid
flowchart LR
  User[Consultant] --> UI[Next.js App Router UI]

  UI --> S1[Screen 01\nIngestion and Triage]
  UI --> S2[Screen 02\nEditorial Review]
  UI --> S3[Screen 03\nInfographic Studio]
  UI --> S4[Screen 04\nPreview and Dispatch]

  S1 --> SyncAPI[/api/trendradar]
  SyncAPI --> RSS[Enabled English RSS sources]
  SyncAPI --> Snapshot[data/trendradar/latest.json]

  S1 --> RankAPI[/api/triage-rank]
  RankAPI --> Jev[Jev / TypeSafe API]
  RankAPI --> JevCache[data/trendradar/jev-triage.json]

  S1 --> BriefAPI[/api/weekly-intelligence]
  BriefAPI --> AI[OpenAI-compatible AI provider]
  BriefAPI --> BriefCache[data/trendradar/weekly-brief.json]

  S2 --> Handoff[/api/editorial-handoff]
  S3 --> Art[/api/generate-art]
  Art --> ImageModel[Image generation provider]
  Art --> ArtCache[data/trendradar/infographic-memory.json]

  S4 --> Status[/api/edition-status]
  Status --> Sent[data/edition-status.json]
~~~

### Main components

- app/page.tsx: server entry point for Screen 01; loads the current TrendRadar feed.
- components/dashboard/CommandCenter.tsx: ingestion telemetry, filters, Jev ranking controls, story selection, synthesis, and Stage 01 handoff.
- app/editions/[id]/page.tsx: editorial editing and HITL Gate 1.
- app/infographics/[id]/page.tsx: visual style/layout selection, artwork generation, visual confirmation, and HITL Gate 2.
- app/dispatch/page.tsx: mobile/email/HTML preview, export controls, dispatch checklist, and HITL Gate 3.
- app/settings/page.tsx: TrendRadar source, fetch schedule, language, and Jev settings.
- app/sources/page.tsx and app/archive/page.tsx: source inspection and dispatched/archive views.
- lib/trendradar.ts: snapshot types, 14-day rolling retention, and persistence.
- lib/rss-feeds.ts: RSS/Atom fetching, XML parsing, English filtering, and sync telemetry.
- lib/jev-triage.server.ts: Jev API calls, semantic deduplication, weighted triage scoring, and deterministic fallback.
- lib/weekly-intelligence.ts: grounded summaries, Capco PoV, actions, and infographic direction.
- lib/weekly-intelligence-cache.server.ts: reusable weekly brief cache.
- lib/editorial-handoff.server.ts: Stage 01/02/03 handoff persistence.
- lib/infographic-memory.server.ts: generated-art cache and visual memory.
- lib/edition-status.server.ts: dispatched-story flags and current-week dispatch status.

### API routes

- GET/POST /api/trendradar: read the current snapshot or run a fresh RSS sync.
- POST /api/triage-rank: deduplicate and rank retained stories with Jev.
- POST /api/weekly-intelligence: create a grounded weekly editorial brief.
- GET/POST /api/editorial-handoff: save and read Stage 01, Stage 02, and Stage 03 bundles.
- POST /api/generate-art: generate or retrieve infographic artwork.
- POST /api/ocr: OCR service endpoint; visual overlay use is currently disabled.
- GET/POST /api/edition-status: read or update dispatch history and sent-story flags.
- GET/POST /api/trendradar-settings: manage sources, schedule, and language settings.
- GET/POST /api/jev-settings: manage Jev criteria settings.
- POST /api/render-infographic: render/export visual assets.
- POST /api/email: prepare email-oriented output.
- GET /api/sources and GET /api/editions: source and edition inspection endpoints.

## Editorial data flow

~~~mermaid
flowchart TD
  A[TrendRadar snapshot and RSS feeds] --> B[Merge enabled feed results]
  B --> C[English-language filter]
  C --> D[14-day rolling retention]
  D --> E[Jev semantic deduplication]
  E --> F[Jev weighted scoring]
  F --> G[Screen 01 story selection]
  G --> H[AI weekly synthesis]
  H --> I[Stage 01 handoff]
  I --> J[Screen 02 edit and approval]
  J --> K[Stage 02 handoff]
  K --> L[Screen 03 visual brief and image generation]
  L --> M[Stage 03 handoff]
  M --> N[Screen 04 preview, export, and dispatch]
  N --> O[Dispatch history and sent-story flags]
~~~

The handoff is deliberately cumulative: Stage 02 includes the selected source stories plus editorial fields, Stage 03 adds visual choices and artwork, and Stage 04 reads the complete bundle. If a screen shows only an image, the Stage 03 handoff is incomplete and should be regenerated from the approved Stage 02 story set.

## HITL state flow

~~~mermaid
stateDiagram-v2
  [*] --> Ingestion
  Ingestion --> Synthesis: Select stories and run AI
  Synthesis --> Approved: Approve story set
  Approved --> VisualCuration: Advance to Stage 03
  VisualCuration --> VisualConfirmed: Confirm visual
  VisualConfirmed --> Dispatch: Advance to Stage 04
  Dispatch --> Sent: Complete checks and dispatch
  Sent --> [*]
~~~

## TrendRadar and “TechRadar” integration

The upstream project is the user’s TrendRadar repository:

https://github.com/alanyoungcy/trendradar-capco

TrendRadar is the upstream repository and GitHub Actions source. It is not the TechRadar news website. In the UI, “TrendRadar” refers to the upstream feed/snapshot workflow and this application’s local ingestion layer.

The intended relationship is:

1. TrendRadar GitHub Actions produces or updates its latest source snapshot.
2. This AI News application can also fetch the configured English RSS feeds directly through POST /api/trendradar.
3. The enabled source list and schedule are managed on /settings and persisted in data/trendradar/settings.json during local development.
4. A sync fetches all enabled feeds, parses RSS/Atom items, removes obvious non-English records, merges the current snapshot, applies the 14-day window, and writes data/trendradar/latest.json.
5. Screen 01 sends the retained set to Jev for deduplication and ranking.
6. The operator selects stories, runs grounded synthesis, approves the content, generates the visual, and dispatches the final package.

A GitHub Actions job in the TrendRadar repository can continue to refresh the upstream snapshot on its normal schedule. For a local demo, click Sync latest TrendRadar in Screen 01 so the application runs the configured RSS pull immediately. The app does not auto-sync an empty demo feed; this makes the start of a demo explicit and prevents a hidden network call from changing the screen unexpectedly.

### RSS source configuration

The checked-in baseline list is config/english-rss.json. It includes the AI sources and the additional technology/business feeds requested for the project, including Fast Company, Forbes Entrepreneurs, SlashGear, VentureBeat, The Verge, Engadget, Tech in Asia, TechCrunch, Forbes Leadership, and the Fast Company headlines feed.

Use /settings to enable or disable sources, review the fetch schedule, and keep the language filter on English. A source can be disabled without deleting its definition. The next sync will omit disabled feeds.

### Retention and purge behavior

The feed is a rolling 14-day store. On each sync, records older than 14 days are removed before latest.json is persisted. A sync response includes fetched, added, retained, and purged counts so a demo operator can see whether the source snapshot is current.

## Jev triage model

Jev is used through the server-side TypeSafe/Jev integration, not through a local imitation of the API. The server sends retained story metadata for semantic deduplication and scoring. The visible dimensions are recency, AI relevance, hype/trend, and Capco impact; recency has the highest default weight.

Capco impact is evaluated against Capco’s financial-services advisory context: banking, wealth, payments, capital markets, operations, risk, compliance, data, and technology modernization. Jev results are cached in data/trendradar/jev-triage.json so a page refresh does not repeat the same scoring request unnecessarily.

If the Jev provider is unavailable, the UI remains usable with a deterministic fallback score and an explicit provider-status message. Treat that fallback as a triage aid, not as a replacement for a live Jev run.

## AI synthesis and provider resilience

The editorial route uses an OpenAI-compatible chat endpoint. The provider URL, model, and timeout are configurable. The default timeout is intended to allow a slower model, including a smaller Luna model, to complete without locking the interface.

The weekly brief is cached in data/trendradar/weekly-brief.json. If a provider call times out or fails, the service builds a source-grounded local draft from the selected stories. The local draft includes citations and safe editorial placeholders, so the workflow can continue while the provider is unavailable. Retry the synthesis after the provider is healthy to replace the local draft with a model-generated brief.

## Infographic generation

Screen 03 sends the approved Stage 02 story bundle, selected visual style, selected layout, and infographic direction to /api/generate-art. The configured image model creates the artwork. The application stores the result in the infographic memory cache and writes the artwork into the Stage 03 handoff when the operator confirms it.

The visual asset is not meant to be a disconnected backdrop. The image request is built from the approved story information and Capco perspective. Deterministic editorial text remains in the story bundle for previews and exports. OCR and text-inpainting endpoints are available for a later refinement pass, but the separate overlay control is currently off to avoid unrelated text being placed over the generated visual.

## Installation

Requirements:

- Node.js current LTS (Node 20 or newer is recommended for Next.js 15)
- npm
- Network access for RSS and optional provider calls

Install and run locally:

~~~bash
git clone https://github.com/alanyoungcy/ainews.git
cd ainews
npm install
cp .env.example .env.local
npm run dev
~~~

Open http://localhost:3000.

For a production-style local run:

~~~bash
npm run build
npm start
~~~

The application can run without external AI or Jev credentials because deterministic/source-grounded fallbacks are included. Full functionality requires the provider configuration described below.

## Environment variables

Create .env.local from .env.example. Do not commit .env.local or API keys.

### AI provider

- AI_API_KEY: key for the selected OpenAI-compatible provider.
- AI_API_BASE: provider base URL, defaulting to the configured OpenAI endpoint.
- AI_MODEL: chat model used for weekly synthesis; this can be changed to a smaller model such as Luna.
- AI_IMAGE_MODEL: image-generation model used by Screen 03.
- AI_PROVIDER_TIMEOUT_MS: maximum provider wait. Use about 120000 (two minutes) for slower models.
- AI_BRIEF_CACHE_TTL_MS: cache lifetime for weekly briefs.

### Jev / TypeSafe

- TYPESAFE_API_KEY: server-side Jev/TypeSafe credential.
- TYPESAFE_API_BASE: Jev API base URL.
- TYPESAFE_TIMEOUT_MS: Jev scoring timeout.
- TYPESAFE_DEDUPE_TIMEOUT_MS: optional separate semantic-deduplication timeout.

Keep credentials only in .env.local or the deployment provider’s secret store. Never place a real API key in this README, source files, or committed JSON.

### Language

- TREND_RADAR_LANGUAGE: English-only by default. The settings screen also exposes the language behavior. Set to all only when intentionally widening the feed.

## Local data and cache files

The project uses JSON persistence for a simple, inspectable demo:

- data/trendradar/latest.json: current retained source snapshot.
- data/trendradar/settings.json: local source and schedule settings.
- data/trendradar/jev-settings.json: Jev criteria settings.
- data/trendradar/weekly-brief.json: cached synthesis.
- data/trendradar/editorial-handoff.json: Stage 01/02/03 handoffs.
- data/trendradar/jev-triage.json: cached Jev ranking and deduplication.
- data/trendradar/infographic-memory.json: cached generated visual results.
- data/edition-status.json: dispatched story IDs and timestamps.

Runtime and cache JSON files are ignored by Git. The baseline English source definitions and discovery references under config/ are checked in.

To start a clean demo, use the application’s clear/reset action if present, or remove the runtime JSON files listed above while the development server is stopped. Keep config/english-rss.json and .env.local intact.

## Demo walkthrough

1. Start the application and open /settings.
2. Confirm that the desired RSS sources are enabled and the language is English.
3. Return to / and click Sync latest TrendRadar.
4. Review fetched, retained, added, duplicate, failed, and purged telemetry.
5. Run Jev triage if the screen asks for ranking.
6. Click the sort controls to compare Jev score, newest, oldest, recency, AI relevance, hype/trend, and Capco impact.
7. Use the date-window and minimum-score filters.
8. Select the stories for the edition and click Advance to Stage 02.
9. Edit and approve the summaries and Capco PoV on Screen 02.
10. Advance to Screen 03, choose a visual style and layout, and generate the infographic.
11. Confirm the visual so the complete Stage 03 handoff is saved.
12. Open /dispatch, verify that the approved story bundle and generated image are present, then export or dispatch.
13. After dispatch, use the sent-story filter on Screen 01 to avoid repeating the same story.

An edition is not tied to a fixed “Week 42” label. It can be created whenever the operator is ready. The edition-status screen can still remind the operator whether an edition has already been dispatched during the current week.

## Troubleshooting

### The dashboard shows only a small stub set

Click Sync latest TrendRadar. The empty demo state is intentional. Verify the enabled source list on /settings, then inspect sync telemetry for failed feeds or purged records.

### The sync button returns no stories

Check network access and the failed-source telemetry. Some publishers block automated requests or change their RSS URL. Disable a failing source or update it on /settings, then sync again.

### Jev scores are missing

Confirm TYPESAFE_API_KEY and TYPESAFE_API_BASE. A fallback score may appear when Jev is unavailable; the provider status will identify that condition. Run triage again after correcting the credentials.

### AI synthesis times out

Set AI_PROVIDER_TIMEOUT_MS to approximately 120000, confirm AI_API_BASE, and check AI_MODEL. A local grounded brief is expected when the provider does not finish; retry after changing the model or provider.

### Stage 03 or Stage 04 shows only an image

Return to Screen 02 and confirm that the selected stories were approved. Then regenerate Screen 03 from the approved handoff. Stage 03 should contain the story bundle, visual brief, style/layout choice, and artwork; Screen 04 reads that cumulative handoff.

### Next.js reports missing chunks or 404 assets

Stop all old development servers, remove the generated .next directory, and start one fresh npm run dev process. Do not reuse a partially built .next directory after changing routes.

### Build or lint fails after a dependency change

Run npm install, then npm run lint and npm run build. If the error references a server-only module being bundled into the browser, keep filesystem and provider calls in server routes or server libraries and pass serializable data into client components.

## Validation

The project scripts are:

~~~bash
npm run lint
npm run build
~~~

Run both before committing changes. The lint script performs a TypeScript no-emit check using tsconfig.lint.json.

## GitHub Actions relationship

TrendRadar remains the upstream scheduled fetcher. A typical deployment arrangement is:

- TrendRadar GitHub Actions refreshes the upstream snapshot on its schedule.
- This application’s local or deployed /api/trendradar endpoint performs an on-demand RSS sync when the operator clicks Sync latest TrendRadar.
- A separate workflow can call the endpoint or copy the upstream latest snapshot into the application’s data store, depending on the deployment environment.

Keep the GitHub Actions secret configuration in the repository that owns the workflow. Keep AI and Jev secrets in the AI News deployment environment. Never copy API keys into the snapshot or commit them to either repository.

## License and source attribution

This repository is an internal Capco-oriented prototype. Respect each publisher’s terms, robots policy, and RSS licensing when configuring sources. The application stores feed metadata and links for editorial review; it should not be treated as a replacement for the original publisher or the upstream TrendRadar project.
