"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell/AppShell";
import { Icon } from "@/components/ui/Icon";
import type { WeeklyBriefResult, WeeklyStory } from "@/lib/weekly-intelligence";

type BriefStatus = "loading" | "ready" | "fallback" | "error";
type ArtworkStatus = "idle" | "generating" | "generated" | "cached" | "awaiting_provider" | "error";
type StudioStory = WeeklyStory & { id: string };
type Stage02Handoff = {
  brief: WeeklyBriefResult;
  selectedStoryId?: string;
  approvedStoryIds?: string[];
  selectedStory?: {
    id: string;
    title: string;
    source: string;
    summary: string;
    implication: string;
    confidence: number;
    url: string | null;
  };
  tone?: string;
  notes?: string;
  narrative?: string;
  savedAt?: string;
};
type Stage03Handoff = {
  version: 1;
  savedAt: string;
  brief: WeeklyBriefResult | null;
  selectedStory: StudioStory;
  visualStyle: { id: string; name: string };
  layout: { id: string; name: string };
  infographic: WeeklyBriefResult["brief"]["infographic"] | null;
  metrics: string[];
  artworkUrl: string | null;
  watermark: boolean;
  legalScrim: boolean;
};

const visualStyles = [
  { id: "editorial-grid", name: "Editorial data grid", description: "Institutional navy, hairlines, framed facts", preview: "grid" },
  { id: "signal-flow", name: "Signal flow", description: "Layered pathways from signal to decision", preview: "flow" },
  { id: "risk-atlas", name: "Risk atlas", description: "Contour fields for momentum and constraints", preview: "atlas" },
  { id: "executive-poster", name: "Executive poster", description: "One strong headline with evidence bands", preview: "poster" },
] as const;

const archetypes = [
  { id: "3-tier", name: "3-Tier Architecture Framework", description: "Signal → orchestration → governed action", preview: "tiers" },
  { id: "quadrant", name: "Risk-Value Quadrant Matrix", description: "Position momentum against constraints", preview: "quadrant" },
  { id: "decision-tree", name: "Decision Tree", description: "Make escalation and ownership explicit", preview: "tree" },
  { id: "kpi-pillars", name: "KPI Pillar Board", description: "Anchor the message to measurable outcomes", preview: "pillars" },
] as const;

const defaultMetrics = ["<18ms Ingestion SLA", "<340ms Agent Swarm Consensus", "99.4% Dual-Signoff Rule"];

function storyFromBrief(story: WeeklyStory, index: number): StudioStory {
  return { ...story, id: `ai-story-${index + 1}` };
}

function readStage02Handoff() {
  try {
    const raw = window.localStorage.getItem("capco-stage02-handoff");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stage02Handoff;
    return parsed?.brief?.brief ? parsed : null;
  } catch {
    return null;
  }
}

async function readRemoteStage02Handoff() {
  try {
    const response = await fetch("/api/editorial-handoff?stage=stage02", { cache: "no-store" });
    if (!response.ok) return null;
    const payload = await response.json() as { handoff?: Stage02Handoff | null };
    return payload.handoff?.brief?.brief ? payload.handoff : null;
  } catch {
    return null;
  }
}

export default function InfographicPage() {
  const [aiBrief, setAiBrief] = useState<WeeklyBriefResult | null>(null);
  const [handoff, setHandoff] = useState<Stage02Handoff | null>(null);
  const [briefStatus, setBriefStatus] = useState<BriefStatus>("loading");
  const [briefError, setBriefError] = useState<string | null>(null);
  const [selectedStoryId, setSelectedStoryId] = useState("ai-story-1");
  const [confirmed, setConfirmed] = useState(false);
  const [visualStyle, setVisualStyle] = useState("editorial-grid");
  const [archetype, setArchetype] = useState("3-tier");
  const [prompt, setPrompt] = useState("Create a complete Capco editorial infographic with a clear headline, five labeled zones, and a source footer. Show how the selected AI signal becomes a governed operating decision.");
  const [seed, setSeed] = useState("capco-editorial-001");
  const [metrics, setMetrics] = useState(defaultMetrics);
  const [watermark, setWatermark] = useState(true);
  const [legalScrim, setLegalScrim] = useState(true);
  const [signedOff, setSignedOff] = useState(false);
  const [saved, setSaved] = useState(false);
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
  const [artworkModel, setArtworkModel] = useState<string | null>(null);
  const [artworkStatus, setArtworkStatus] = useState<ArtworkStatus>("idle");
  const [activity, setActivity] = useState<string[]>(["Studio opened · waiting for the Stage 02 handoff"]);

  function logActivity(message: string) {
    setActivity((current) => [...current.slice(-4), message]);
  }

  const stories = useMemo(() => {
    const allStories = aiBrief?.brief.stories.map(storyFromBrief) ?? [];
    const approvedIds = handoff?.approvedStoryIds ?? [];
    if (!approvedIds.length) return allStories;
    const approvedStories = allStories.filter((story) => approvedIds.includes(story.id));
    return approvedStories.length ? approvedStories : allStories.slice(0, 1);
  }, [aiBrief, handoff]);

  const selectedStory = useMemo<StudioStory | null>(() => {
    const matching = stories.find((story) => story.id === selectedStoryId);
    if (matching) return matching;
    if (handoff?.selectedStory) {
      return {
        id: handoff.selectedStory.id,
        title: handoff.selectedStory.title,
        source: handoff.selectedStory.source,
        url: handoff.selectedStory.url,
        fact: handoff.selectedStory.summary,
        capcoImplication: handoff.selectedStory.implication,
        confidence: handoff.selectedStory.confidence,
      };
    }
    return stories[0] ?? null;
  }, [handoff, selectedStoryId, stories]);

  const selectedArchetype = archetypes.find((item) => item.id === archetype) ?? archetypes[0];
  const selectedVisualStyle = visualStyles.find((item) => item.id === visualStyle) ?? visualStyles[0];
  const infographic = aiBrief?.brief.infographic;

  async function loadBrief(force = false) {
    setBriefStatus("loading");
    setBriefError(null);
    logActivity(force ? "Retrying the editorial brief from TrendRadar" : "Loading the saved weekly brief");
    try {
      let selectedIds: string[] = [];
      try {
        const storedIds = window.localStorage.getItem("capco-selected-story-ids");
        const parsed = storedIds ? JSON.parse(storedIds) as unknown : [];
        if (Array.isArray(parsed)) selectedIds = parsed.filter((id): id is string => typeof id === "string");
      } catch {
        selectedIds = [];
      }
      const response = await fetch("/api/weekly-intelligence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ force, selectedIds }) });
      if (!response.ok) throw new Error(`Brief service returned ${response.status}`);
      const result = await response.json() as WeeklyBriefResult;
      setAiBrief(result);
      setBriefStatus(result.meta.provider === "fallback" ? "fallback" : "ready");
      setBriefError(result.meta.providerError ?? null);
      try {
        window.localStorage.setItem("capco-weekly-brief", JSON.stringify(result));
        const savedStory = window.localStorage.getItem("capco-confirmed-story");
        if (savedStory && result.brief.stories.some((_, index) => `ai-story-${index + 1}` === savedStory)) setSelectedStoryId(savedStory);
      } catch {
        logActivity("Brief loaded · browser cache unavailable");
      }
      logActivity(result.meta.provider === "fallback" ? "Grounded local brief restored · safe to review" : `AI brief ready · ${result.meta.model}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load the infographic brief";
      try {
        const cached = window.localStorage.getItem("capco-weekly-brief");
        const restored = cached ? JSON.parse(cached) as WeeklyBriefResult : null;
        if (restored?.brief) {
          setAiBrief(restored);
          setBriefStatus("fallback");
          setBriefError(`Local brief restored because the brief service was unavailable: ${message}`);
          logActivity("Network unavailable · local source-grounded brief restored");
          return;
        }
      } catch {
        // Continue to the visible error state when no local brief is available.
      }
      setBriefStatus("error");
      setBriefError(message);
      logActivity("Brief unavailable · retry after the local app is running");
    }
  }

  useEffect(() => {
    let cancelled = false;
    const applyHandoff = (storedHandoff: Stage02Handoff) => {
      if (cancelled) return;
      setHandoff(storedHandoff);
      setAiBrief(storedHandoff.brief);
      setSelectedStoryId(storedHandoff.selectedStoryId ?? "ai-story-1");
      setConfirmed(false);
      setBriefStatus(storedHandoff.brief.meta.provider === "fallback" ? "fallback" : "ready");
      setBriefError(storedHandoff.brief.meta.providerError ?? null);
      setPrompt((current) => {
        const note = storedHandoff.notes ? `Editorial note: ${storedHandoff.notes}` : "";
        return note && !current.includes(note) ? `${current}\n${note}` : current;
      });
      logActivity("Stage 02 handoff restored · selected story and summary locked");
    };
    async function restore() {
      const localHandoff = readStage02Handoff();
      if (localHandoff) {
        applyHandoff(localHandoff);
        return;
      }
      const remoteHandoff = await readRemoteStage02Handoff();
      if (remoteHandoff) {
        applyHandoff(remoteHandoff);
        return;
      }
      if (!cancelled) void loadBrief();
    }
    void restore();
    return () => { cancelled = true; };
  }, []);

  function confirmStory() {
    if (!selectedStory) return;
    setConfirmed(true);
    try {
      window.localStorage.setItem("capco-confirmed-story", selectedStory.id);
    } catch {
      // The server-side visual memory remains the durable handoff.
    }
    logActivity(`Story confirmed · ${selectedStory.source}`);
  }

  function persistStage03Handoff(nextArtworkUrl = artworkUrl) {
    if (!selectedStory) return;
    const handoff: Stage03Handoff = {
      version: 1,
      savedAt: new Date().toISOString(),
      brief: aiBrief,
      selectedStory,
      visualStyle: { id: selectedVisualStyle.id, name: selectedVisualStyle.name },
      layout: { id: selectedArchetype.id, name: selectedArchetype.name },
      infographic: infographic ?? null,
      metrics,
      artworkUrl: nextArtworkUrl,
      watermark,
      legalScrim,
    };
    try {
      window.localStorage.setItem("capco-stage03-handoff", JSON.stringify(handoff));
    } catch {
      logActivity("Stage 04 browser handoff storage unavailable · visual memory retained");
    }
    void fetch("/api/editorial-handoff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: "stage03", handoff }),
    }).catch(() => undefined);
  }

  async function generateArtwork() {
    if (!selectedStory || !aiBrief) return;
    if (!confirmed) confirmStory();
    setArtworkStatus("generating");
    setArtworkUrl(null);
    setSaved(false);
    logActivity(`Infographic brief locked · ${selectedVisualStyle.name}`);
    logActivity(`Layout selected · ${selectedArchetype.name}`);
    logActivity(`Calling image model · ${seed}`);
    try {
      const response = await fetch("/api/generate-art", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: aiBrief.brief,
          story: selectedStory,
          archetype: selectedArchetype.name,
          layout: selectedArchetype.name,
          visualStyle: selectedVisualStyle.name,
          prompt,
          seed,
          includeText: true,
          textPlan: {
            headline: infographic?.title ?? selectedStory.title,
            summary: selectedStory.fact,
            perspective: selectedStory.capcoImplication,
            sections: infographic?.sections ?? ["Signal", "Interpretation", "Decision rights", "Control points", "Client action"],
          },
        }),
      });
      const result = await response.json() as { status?: ArtworkStatus; output?: string | null; model?: string; cached?: boolean; message?: string };
      if (!response.ok) throw new Error(result.message ?? `Artwork service returned ${response.status}`);
      if (result.status === "generated" && result.output) {
        setArtworkUrl(result.output);
        try {
          window.localStorage.setItem("capco-infographic-artwork", result.output);
          window.localStorage.setItem("capco-infographic-artwork-meta", JSON.stringify({ model: result.model ?? "configured image model", generatedAt: new Date().toISOString(), visualStyle: selectedVisualStyle.id, layout: selectedArchetype.id }));
        } catch {
          logActivity("Browser handoff storage unavailable · server visual memory retained");
        }
        setArtworkModel(result.model ?? "configured image model");
        setArtworkStatus(result.cached ? "cached" : "generated");
        persistStage03Handoff(result.output);
        logActivity(result.cached ? "Complete infographic restored from visual memory" : "Complete infographic received from image model");
        logActivity("Fact-locked text overlays applied · ready for HITL Gate 2");
      } else if (result.status === "awaiting_provider") {
        setArtworkStatus("awaiting_provider");
        logActivity("No image provider key is available · editable source-grounded composition remains visible");
      } else throw new Error(result.message ?? "The image model returned no artwork");
    } catch (error) {
      setArtworkStatus("error");
      logActivity(`Infographic generation failed · ${error instanceof Error ? error.message : "retry when available"}`);
    }
  }

  useEffect(() => {
    if (artworkUrl && selectedStory) persistStage03Handoff();
  }, [artworkUrl, selectedStoryId, visualStyle, archetype, metrics, watermark, legalScrim]);

  const briefLabel = briefStatus === "loading" ? "Preparing source-grounded brief" : briefStatus === "ready" ? "Stage 02 handoff ready" : briefStatus === "fallback" ? "Grounded local brief active" : "Visual brief unavailable";
  const briefDetail = briefStatus === "loading" ? "Loading the locked story, summary, and Capco perspective before the studio unlocks." : briefStatus === "ready" ? `${handoff ? "Locked editorial handoff" : aiBrief?.meta.model ?? "Configured AI provider"} supplied ${stories.length} selected stor${stories.length === 1 ? "y" : "ies"}.` : briefStatus === "fallback" ? "The source-grounded brief remains usable while the provider is unavailable." : "Retry the brief before generating the infographic.";
  const artworkLabel = artworkStatus === "generating" ? "Generating complete infographic…" : artworkStatus === "generated" ? `Generated with ${artworkModel ?? "image model"}` : artworkStatus === "cached" ? "Complete infographic restored from visual memory" : artworkStatus === "awaiting_provider" ? "Provider key required" : artworkStatus === "error" ? "Generation failed · retry" : "Infographic not generated";

  return <AppShell>
    <div className="stage-page infographic-stage studio-stage">
      <div className="studio-pipeline-shell"><div className="studio-pipeline-brand"><span className="studio-pipeline-mark">C</span><span><strong>CAPCO INTELLIGENCE STUDIO</strong><small>Stage 02 handoff · selected story to complete infographic</small></span></div><div className="studio-pipeline-steps"><span className="done"><b>01</b> Triage <small>Done</small></span><i /> <span className="done"><b>02</b> Synthesis <small>Approved</small></span><i /> <span className="active"><b>03</b> Infographic Studio <small>In progress</small></span><i /> <span><b>04</b> Dispatch <small>Pending</small></span></div></div>
      <section className="stage-heading studio-stage-heading"><div><span className="section-kicker">HITL Gate 2 · Visual specification</span><h1>Infographic studio</h1><p>Turn the locked Stage 02 story and executive summary into a complete visual communication. The selected style, layout, text, and source facts travel together into generation.</p></div><div className="stage-heading-actions"><span className="status-chip"><span className={`status-dot ${signedOff ? "green" : briefStatus === "error" ? "red" : "orange"}`} />{signedOff ? "Gate 2 signed off" : briefLabel}</span><button className="button dark" onClick={() => setSignedOff(true)} disabled={!artworkUrl || signedOff}><Icon name="check" size={16} />{signedOff ? "Gate 2 cleared" : "Sign off visual"}</button></div></section>
      <div className={`stage-progress ${briefStatus}`} role="status" aria-live="polite"><span className="stage-progress-icon">{briefStatus === "loading" ? <i className="stage-progress-spinner" /> : briefStatus === "ready" ? <Icon name="check" size={15} /> : briefStatus === "fallback" ? <Icon name="spark" size={15} /> : <Icon name="alert" size={15} />}</span><div><strong>{briefLabel}</strong><span>{briefDetail}</span>{briefError && <small>Provider detail: {briefError}</small>}</div><div className="stage-progress-actions">{briefStatus === "loading" ? <span className="stage-progress-step">Stage 02 → locked story → visual spec</span> : briefStatus === "fallback" ? <button className="button utility" onClick={() => void loadBrief(true)}>Retry AI brief</button> : briefStatus === "error" ? <button className="button utility" onClick={() => void loadBrief(true)}>Retry brief</button> : <span className="stage-progress-step">Story, summary, style, and layout ready</span>}</div></div>
      <div className="studio-grid">
        <aside className="studio-rail panel">
          <div className="studio-panel-heading"><div><span className="section-kicker">01 · Stage 02 handoff</span><h2>Story to visualize</h2></div><span className={`lock-label ${handoff ? "locked" : ""}`}>{handoff ? "Locked" : "Select"}</span></div>
          <div className="story-picker">{stories.length ? stories.map((story, index) => <button key={story.id} className={`story-picker-row ${selectedStory?.id === story.id ? "selected" : ""}`} onClick={() => { setSelectedStoryId(story.id); setConfirmed(false); setArtworkUrl(null); setArtworkStatus("idle"); }}><span className="story-picker-index">{String(index + 1).padStart(2, "0")}</span><span><strong>{story.title}</strong><small>{story.source} · {story.confidence}% grounding</small></span><Icon name="chevron" size={15} /></button>) : <div className="empty-studio">Waiting for the locked Stage 02 handoff…</div>}</div>
          {selectedStory && <div className="confirmed-story"><span>Locked editorial summary</span><strong>{selectedStory.title}</strong><p>{selectedStory.fact}</p><div className="handoff-detail"><span>Capco perspective</span><p>{selectedStory.capcoImplication}</p></div><button className={`button ${confirmed ? "ghost" : "primary"} full`} onClick={confirmStory}><Icon name="check" size={14} />{confirmed ? "Story confirmed for generation" : "Confirm selected story"}</button></div>}
          <div className="studio-control-block"><span className="studio-control-label">02 · Visual template</span><div className="visual-style-grid">{visualStyles.map((item) => <button key={item.id} className={`visual-style-card ${visualStyle === item.id ? "selected" : ""}`} onClick={() => { setVisualStyle(item.id); setArtworkUrl(null); setArtworkStatus("idle"); }}><span className={`template-preview template-${item.preview}`}><i /><b /><em /></span><span><strong>{item.name}</strong><small>{item.description}</small></span></button>)}</div></div>
          <div className="studio-control-block"><span className="studio-control-label">03 · Layout selection</span><div className="archetype-list">{archetypes.map((item) => <button key={item.id} className={archetype === item.id ? "selected" : ""} onClick={() => { setArchetype(item.id); setArtworkUrl(null); setArtworkStatus("idle"); }}><span className={`layout-preview layout-${item.preview}`}><i /><b /><em /></span><span><strong>{item.name}</strong><small>{item.description}</small></span><Icon name="chevron" size={14} /></button>)}</div></div>
          <div className="studio-control-block"><span className="studio-control-label">04 · Generation controls</span><div className="style-template-note"><strong>{selectedVisualStyle.name} · {selectedArchetype.name}</strong><span>Image model renders the complete poster; the app keeps exact text, facts, and source overlays editable.</span></div><label className="studio-field"><span>Prompt direction</span><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={4} /></label><label className="studio-field"><span>Deterministic seed</span><input value={seed} onChange={(event) => setSeed(event.target.value)} /></label><p className="studio-helper"><Icon name="spark" size={13} /> Generation includes a headline, labeled information zones, selected story summary, Capco perspective, and source footer.</p><button className="button primary full studio-generate" onClick={() => void generateArtwork()} disabled={!selectedStory || !aiBrief || briefStatus === "loading" || artworkStatus === "generating"}><Icon name="spark" size={15} />{artworkStatus === "generating" ? "Generating complete infographic…" : "Generate complete infographic"}</button></div>
        </aside>
        <main className="studio-canvas-column"><div className="studio-canvas-wrap"><div className={`studio-canvas ${artworkUrl ? "has-artwork" : ""} visual-${visualStyle} layout-${archetype}`} style={artworkUrl ? { backgroundImage: `linear-gradient(90deg, rgba(11,19,43,.9) 0%, rgba(11,19,43,.42) 54%, rgba(11,19,43,.22) 100%), url(${artworkUrl})` } : undefined}><div className="studio-canvas-scrim" /><div className="studio-canvas-topline"><span>CAPCO / AI INTELLIGENCE</span><span>{selectedVisualStyle.name} · {selectedArchetype.name}</span></div><div className="studio-canvas-copy"><span className="studio-canvas-kicker">EXECUTIVE KEY FINDING</span><h2>{infographic?.title ?? selectedStory?.title ?? "From signal to governed action"}</h2><p>{infographic?.subtitle ?? selectedStory?.fact ?? "The selected story summary will appear here once Stage 02 is carried forward."}</p></div><div className="studio-info-band"><span>SELECTED STORY</span><strong>{selectedStory?.title ?? "Waiting for Stage 02"}</strong><p>{selectedStory?.fact ?? "Confirm a story in Stage 02 to populate this visual."}</p></div><div className="studio-pin pin-one"><b>PIN [T-01]</b><span>Signal intake</span></div><div className="studio-pin pin-two"><b>PIN [T-02]</b><span>Human decision gate</span></div><div className="studio-pin pin-three"><b>PIN [T-03]</b><span>Control evidence</span></div><div className="studio-vector-line line-one" /><div className="studio-vector-line line-two" /><div className="studio-vector-node node-one" /><div className="studio-vector-node node-two" /><div className="studio-vector-node node-three" /><div className="studio-metric-stack">{metrics.map((metric) => <span key={metric}>{metric}</span>)}</div><div className="studio-key-finding"><span>CAPCO PERSPECTIVE</span><strong>{selectedStory?.capcoImplication ?? aiBrief?.brief.capcoPerspective ?? "Make the operating change and decision rights explicit."}</strong></div><div className="studio-canvas-footer"><span>{watermark ? "CAPCO INTELLIGENCE STUDIO" : ""}</span><span>{legalScrim ? "Source-grounded · legal review required" : "Draft visual · legal review required"}</span></div></div></div><div className="studio-canvas-status"><span><i className={`status-dot ${artworkUrl ? "green" : "orange"}`} />{artworkLabel}</span><span>{artworkUrl ? "Complete image plus deterministic overlays" : "Select a style and layout, then generate"}</span><span>100%</span></div><div className="activity-timeline"><div className="activity-heading"><span>Generation activity</span><small>Verbose run feedback</small></div>{activity.map((item, index) => <div key={`${item}-${index}`} className="activity-row"><i className={index === activity.length - 1 && artworkStatus === "generating" ? "activity-spinner" : "activity-dot"} /><span>{item}</span></div>)}</div></main>
        <aside className="studio-inspector panel"><div className="studio-panel-heading"><div><span className="section-kicker">05 · Source fact locks</span><h2>Grounding inspector</h2></div><span className="lock-label locked">Fact-locked</span></div>{selectedStory ? <><div className="source-lock-card"><span>Confirmed provenance</span><strong>{selectedStory.source}</strong><small>{selectedStory.url ?? "TrendRadar source record"}</small><p>{selectedStory.fact}</p></div><div className="source-lock-card capco"><span>Capco perspective</span><p>{selectedStory.capcoImplication}</p></div>{handoff?.tone && <div className="source-lock-card"><span>Stage 02 editorial tone</span><p>{handoff.tone} · {handoff.notes ?? "No additional editorial note"}</p></div>}</> : <div className="empty-studio">Select a confirmed story to inspect its source locks.</div>}<div className="studio-control-block"><span className="studio-control-label">Headline overlays</span>{metrics.map((metric, index) => <label className="studio-field metric-field" key={`metric-${index}`}><span>Metric {String(index + 1).padStart(2, "0")}</span><input value={metric} onChange={(event) => setMetrics((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} /></label>)}</div><div className="studio-control-block"><span className="studio-control-label">Brand guardrails</span><button className="guardrail-row" onClick={() => setWatermark((value) => !value)}><span><strong>Institutional watermark</strong><small>Capco Intelligence Studio</small></span><span className={`toggle ${watermark ? "on" : ""}`}><i /></span></button><button className="guardrail-row" onClick={() => setLegalScrim((value) => !value)}><span><strong>Legal-clearance scrim</strong><small>Source footer remains visible</small></span><span className={`toggle ${legalScrim ? "on" : ""}`}><i /></span></button></div><div className="signoff-card"><span>HITL Gate 2</span><strong>{signedOff ? "Lead consultant sign-off recorded" : "Lead consultant review required"}</strong><small>{signedOff ? "Stage 04 is now unlocked." : "Review the complete image, overlays, and source locks before clearing."}</small><button className="button dark full" onClick={() => setSignedOff(true)} disabled={!artworkUrl || signedOff}><Icon name="check" size={15} />{signedOff ? "Gate 2 cleared" : "Sign off visual"}</button></div></aside>
      </div>
      <div className="handoff-bar"><div><strong>{signedOff ? "Gate 2 cleared" : artworkUrl ? "Complete infographic ready for review" : "Infographic spec in progress"}</strong><span>{selectedStory ? `Selected story · ${selectedStory.source}` : "Select a story to begin"}</span><small>{signedOff ? "Stage 04 dispatch unlocked" : "Selected story, style, layout, and exact copy stay linked"}</small></div><div><button className="button utility" onClick={() => setSaved(true)}>{saved ? "Saved to edition" : "Save visual spec"}</button><button className="button dark" disabled={!signedOff} onClick={() => { window.location.href = "/dispatch"; }}>Advance to Stage 04 <Icon name="arrow" size={16} /></button></div></div>
    </div>
  </AppShell>;
}
