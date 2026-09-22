"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell/AppShell";
import { Icon } from "@/components/ui/Icon";
import type { WeeklyBriefResult, WeeklyStory } from "@/lib/weekly-intelligence";

type BriefStatus = "loading" | "ready" | "fallback" | "error";
type ArtworkStatus = "idle" | "generating" | "generated" | "cached" | "awaiting_provider" | "error";

const archetypes = [
  { id: "3-tier", name: "3-Tier Architecture Framework", description: "Signal → orchestration → governed action" },
  { id: "quadrant", name: "Risk-Value Quadrant Matrix", description: "Position momentum against constraints" },
  { id: "decision-tree", name: "Decision Tree", description: "Make escalation and ownership explicit" },
  { id: "kpi-pillars", name: "KPI Pillar Board", description: "Anchor the message to measurable outcomes" },
];

const defaultMetrics = ["<18ms Ingestion SLA", "<340ms Agent Swarm Consensus", "99.4% Dual-Signoff Rule"];

function storyFromBrief(story: WeeklyStory, index: number) {
  return { ...story, id: `ai-story-${index + 1}` };
}

export default function InfographicPage() {
  const [aiBrief, setAiBrief] = useState<WeeklyBriefResult | null>(null);
  const [briefStatus, setBriefStatus] = useState<BriefStatus>("loading");
  const [briefError, setBriefError] = useState<string | null>(null);
  const [selectedStoryId, setSelectedStoryId] = useState("ai-story-1");
  const [confirmed, setConfirmed] = useState(false);
  const [archetype, setArchetype] = useState("3-tier");
  const [prompt, setPrompt] = useState("Abstract governance mesh for Tier-1 banking: show how the signal becomes a controlled operating decision.");
  const [seed, setSeed] = useState("capco-w42-001");
  const [metrics, setMetrics] = useState(defaultMetrics);
  const [watermark, setWatermark] = useState(true);
  const [legalScrim, setLegalScrim] = useState(true);
  const [signedOff, setSignedOff] = useState(false);
  const [saved, setSaved] = useState(false);
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
  const [artworkModel, setArtworkModel] = useState<string | null>(null);
  const [artworkStatus, setArtworkStatus] = useState<ArtworkStatus>("idle");
  const [activity, setActivity] = useState<string[]>(["Studio opened · waiting for the grounded editorial brief"]);

  const stories = useMemo(() => aiBrief?.brief.stories.map(storyFromBrief) ?? [], [aiBrief]);
  const selectedStory = stories.find((story) => story.id === selectedStoryId) ?? stories[0] ?? null;
  const selectedArchetype = archetypes.find((item) => item.id === archetype) ?? archetypes[0];
  const infographic = aiBrief?.brief.infographic;

  function logActivity(message: string) {
    setActivity((current) => [...current.slice(-4), message]);
  }

  async function loadBrief(force = false) {
    setBriefStatus("loading");
    setBriefError(null);
    logActivity(force ? "Retrying the editorial brief from the saved TrendRadar feed" : "Loading the saved weekly brief");
    try {
      const response = await fetch("/api/weekly-intelligence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ force }) });
      if (!response.ok) throw new Error(`Brief service returned ${response.status}`);
      const result = await response.json() as WeeklyBriefResult;
      setAiBrief(result);
      setBriefStatus(result.meta.provider === "fallback" ? "fallback" : "ready");
      setBriefError(result.meta.providerError ?? null);
      const savedStory = window.localStorage.getItem("capco-confirmed-story");
      if (savedStory && result.brief.stories.some((_, index) => `ai-story-${index + 1}` === savedStory)) setSelectedStoryId(savedStory);
      logActivity(result.meta.provider === "fallback" ? "Grounded local brief restored · safe to review" : `AI brief ready · ${result.meta.model}`);
    } catch (error) {
      setBriefStatus("error");
      setBriefError(error instanceof Error ? error.message : "Could not load the infographic brief");
      logActivity("Brief unavailable · retry before generating a new backdrop");
    }
  }

  useEffect(() => { void loadBrief(); }, []);

  function confirmStory() {
    if (!selectedStory) return;
    setConfirmed(true);
    window.localStorage.setItem("capco-confirmed-story", selectedStory.id);
    logActivity(`Story confirmed · ${selectedStory.source}`);
  }

  async function generateArtwork() {
    if (!selectedStory) return;
    if (!confirmed) confirmStory();
    setArtworkStatus("generating");
    setArtworkUrl(null);
    setSaved(false);
    logActivity("Visual prompt assembled · text excluded from image model");
    logActivity(`Calling image model · ${seed}`);
    try {
      const response = await fetch("/api/generate-art", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: aiBrief?.brief, story: selectedStory, archetype: selectedArchetype.name, prompt, seed }),
      });
      const result = await response.json() as { status?: ArtworkStatus; output?: string | null; model?: string; cached?: boolean; message?: string };
      if (!response.ok) throw new Error(result.message ?? `Artwork service returned ${response.status}`);
      if (result.status === "generated" && result.output) {
        setArtworkUrl(result.output);
        try {
          // Keep a lightweight handoff for the next screen. Large base64 images
          // can exceed browser storage limits, so persistence must never turn a
          // successful generation into a failed run.
          window.localStorage.setItem("capco-infographic-artwork", result.output);
          window.localStorage.setItem("capco-infographic-artwork-meta", JSON.stringify({ model: result.model ?? "configured image model", generatedAt: new Date().toISOString() }));
        } catch {
          logActivity("Browser handoff storage unavailable · server visual memory retained");
        }
        setArtworkModel(result.model ?? "configured image model");
        setArtworkStatus(result.cached ? "cached" : "generated");
        logActivity(result.cached ? "Backdrop restored from visual memory · no provider wait" : "Backdrop received from image model");
        logActivity("Deterministic SVG overlays applied · ready for HITL Gate 2");
      } else if (result.status === "awaiting_provider") {
        setArtworkStatus("awaiting_provider");
        logActivity("No image provider key is available · source-grounded canvas remains editable");
      } else throw new Error(result.message ?? "The image model returned no artwork");
    } catch (error) {
      setArtworkStatus("error");
      logActivity(`Image generation failed · ${error instanceof Error ? error.message : "retry when available"}`);
    }
  }

  useEffect(() => {
    if (confirmed && artworkStatus === "idle") void generateArtwork();
  }, [confirmed, artworkStatus]);

  const briefLabel = briefStatus === "loading" ? "Preparing source-grounded brief" : briefStatus === "ready" ? "AI visual brief ready" : briefStatus === "fallback" ? "Grounded local brief active" : "Visual brief unavailable";
  const briefDetail = briefStatus === "loading" ? "The cached weekly thesis and confirmed stories are being loaded before the studio unlocks." : briefStatus === "ready" ? `${aiBrief?.meta.model ?? "Configured AI provider"} supplied the weekly direction.` : briefStatus === "fallback" ? "The provider timed out, but the saved local brief keeps the workflow usable and fact-grounded." : "Retry the brief before generating artwork.";
  const artworkLabel = artworkStatus === "generating" ? "Generating backdrop…" : artworkStatus === "generated" ? `Generated with ${artworkModel ?? "image model"}` : artworkStatus === "cached" ? "Restored from visual memory" : artworkStatus === "awaiting_provider" ? "Provider key required" : artworkStatus === "error" ? "Generation failed · retry" : "Backdrop not generated";

  return <AppShell>
    <div className="stage-page infographic-stage studio-stage">
      <div className="studio-pipeline-shell"><div className="studio-pipeline-brand"><span className="studio-pipeline-mark">C</span><span><strong>CAPCO INTELLIGENCE STUDIO</strong><small>Week 42 · GenAI in Tier-1 Wealth &amp; Banking</small></span></div><div className="studio-pipeline-steps"><span className="done"><b>01</b> Triage <small>Done</small></span><i /> <span className="done"><b>02</b> Synthesis <small>Approved</small></span><i /> <span className="active"><b>03</b> Infographic Studio <small>In progress</small></span><i /> <span><b>04</b> Dispatch <small>Pending</small></span></div></div>
      <section className="stage-heading studio-stage-heading"><div><span className="section-kicker">HITL Gate 2 · Visual specification</span><h1>Infographic studio</h1><p>Generate the visual backdrop from the confirmed story, then keep every headline, metric, pin, and source label editable and fact-locked in the workspace.</p></div><div className="stage-heading-actions"><span className="status-chip"><span className={`status-dot ${signedOff ? "green" : briefStatus === "error" ? "red" : "orange"}`} />{signedOff ? "Gate 2 signed off" : briefLabel}</span><button className="button dark" onClick={() => setSignedOff(true)} disabled={!artworkUrl || signedOff}><Icon name="check" size={16} />{signedOff ? "Gate 2 cleared" : "Sign off visual"}</button></div></section>
      <div className={`stage-progress ${briefStatus}`} role="status" aria-live="polite"><span className="stage-progress-icon">{briefStatus === "loading" ? <i className="stage-progress-spinner" /> : briefStatus === "ready" ? <Icon name="check" size={15} /> : briefStatus === "fallback" ? <Icon name="spark" size={15} /> : <Icon name="alert" size={15} />}</span><div><strong>{briefLabel}</strong><span>{briefDetail}</span>{briefError && <small>Provider detail: {briefError}</small>}</div><div className="stage-progress-actions">{briefStatus === "loading" ? <span className="stage-progress-step">Memory → brief → studio</span> : briefStatus === "fallback" ? <button className="button utility" onClick={() => void loadBrief(true)}>Retry AI brief</button> : briefStatus === "error" ? <button className="button utility" onClick={() => void loadBrief(true)}>Retry brief</button> : <span className="stage-progress-step">Source-grounded studio ready</span>}</div></div>
      <div className="studio-grid">
        <aside className="studio-rail panel"><div className="studio-panel-heading"><div><span className="section-kicker">01 · Confirmed source</span><h2>Story to visualize</h2></div><span className={`lock-label ${confirmed ? "locked" : ""}`}>{confirmed ? "Confirmed" : "Select"}</span></div><div className="story-picker">{stories.length ? stories.map((story) => <button key={story.id} className={`story-picker-row ${selectedStory?.id === story.id ? "selected" : ""}`} onClick={() => { setSelectedStoryId(story.id); setConfirmed(false); }}><span className="story-picker-index">{story.id.slice(-2)}</span><span><strong>{story.title}</strong><small>{story.source} · {story.confidence}% grounding</small></span><Icon name="chevron" size={15} /></button>) : <div className="empty-studio">Waiting for the saved weekly brief…</div>}</div>{selectedStory && <div className="confirmed-story"><span>Selected story</span><strong>{selectedStory.title}</strong><p>{selectedStory.fact}</p><button className={`button ${confirmed ? "ghost" : "primary"} full`} onClick={confirmStory}><Icon name="check" size={14} />{confirmed ? "Story confirmed for generation" : "Confirm story"}</button></div>}
          <div className="studio-control-block"><span className="studio-control-label">02 · Layout blueprint</span><div className="archetype-list">{archetypes.map((item) => <button key={item.id} className={archetype === item.id ? "selected" : ""} onClick={() => setArchetype(item.id)}><span><strong>{item.name}</strong><small>{item.description}</small></span><Icon name="chevron" size={14} /></button>)}</div></div><div className="studio-control-block"><span className="studio-control-label">03 · Generative controls</span><div className="style-template-note"><strong>Capco editorial system</strong><span>Dark data-led grid · controlled accents · deterministic overlay zones</span></div><label className="studio-field"><span>Prompt direction</span><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={4} /></label><label className="studio-field"><span>Deterministic seed</span><input value={seed} onChange={(event) => setSeed(event.target.value)} /></label><p className="studio-helper"><Icon name="spark" size={13} /> The image model creates only the abstract backdrop. Text, numbers, pins, and logos are rendered by the app.</p><button className="button primary full studio-generate" onClick={() => void generateArtwork()} disabled={!selectedStory || briefStatus === "loading" || artworkStatus === "generating"}><Icon name="spark" size={15} />{artworkStatus === "generating" ? "Generating backdrop…" : "Generate backdrop"}</button></div></aside>
        <main className="studio-canvas-column"><div className="studio-canvas-wrap"><div className={`studio-canvas ${artworkUrl ? "has-artwork" : ""}`} style={artworkUrl ? { backgroundImage: `linear-gradient(90deg, rgba(11,19,43,.9) 0%, rgba(11,19,43,.42) 54%, rgba(11,19,43,.22) 100%), url(${artworkUrl})` } : undefined}><div className="studio-canvas-scrim" /><div className="studio-canvas-topline"><span>CAPCO / AI INTELLIGENCE</span><span>VISUAL SPEC · {selectedArchetype.name}</span></div><div className="studio-canvas-copy"><span className="studio-canvas-kicker">EXECUTIVE KEY FINDING</span><h2>{infographic?.title ?? "Tier-1 agentic orchestration"}</h2><p>{infographic?.subtitle ?? "From model capability to governed operating action."}</p></div><div className="studio-pin pin-one"><b>PIN [T-01]</b><span>Signal intake</span></div><div className="studio-pin pin-two"><b>PIN [T-02]</b><span>Human decision gate</span></div><div className="studio-pin pin-three"><b>PIN [T-03]</b><span>Control evidence</span></div><div className="studio-vector-line line-one" /><div className="studio-vector-line line-two" /><div className="studio-vector-node node-one" /><div className="studio-vector-node node-two" /><div className="studio-vector-node node-three" /><div className="studio-metric-stack">{metrics.map((metric) => <span key={metric}>{metric}</span>)}</div><div className="studio-key-finding"><span>CAPCO PERSPECTIVE</span><strong>{selectedStory?.capcoImplication ?? aiBrief?.brief.capcoPerspective ?? "Make the operating change and decision rights explicit."}</strong></div><div className="studio-canvas-footer"><span>{watermark ? "CAPCO INTELLIGENCE STUDIO" : ""}</span><span>{legalScrim ? "Source-grounded · legal review required" : "Draft visual · legal review required"}</span></div></div></div><div className="studio-canvas-status"><span><i className={`status-dot ${artworkUrl ? "green" : "orange"}`} />{artworkLabel}</span><span>{artworkUrl ? "Deterministic overlays locked" : "Generate a backdrop to preview the composite"}</span><span>100%</span></div><div className="activity-timeline"><div className="activity-heading"><span>Generation activity</span><small>Verbose run feedback</small></div>{activity.map((item, index) => <div key={`${item}-${index}`} className="activity-row"><i className={index === activity.length - 1 && artworkStatus === "generating" ? "activity-spinner" : "activity-dot"} /><span>{item}</span></div>)}</div></main>
        <aside className="studio-inspector panel"><div className="studio-panel-heading"><div><span className="section-kicker">04 · Source fact locks</span><h2>Grounding inspector</h2></div><span className="lock-label locked">Fact-locked</span></div>{selectedStory ? <><div className="source-lock-card"><span>Confirmed provenance</span><strong>{selectedStory.source}</strong><small>{selectedStory.url ?? "TrendRadar source record"}</small><p>{selectedStory.fact}</p></div><div className="source-lock-card capco"><span>Capco perspective</span><p>{selectedStory.capcoImplication}</p></div></> : <div className="empty-studio">Select a confirmed story to inspect its source locks.</div>}<div className="studio-control-block"><span className="studio-control-label">Headline overlays</span>{metrics.map((metric, index) => <label className="studio-field metric-field" key={`metric-${index}`}><span>Metric {String(index + 1).padStart(2, "0")}</span><input value={metric} onChange={(event) => setMetrics((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} /></label>)}</div><div className="studio-control-block"><span className="studio-control-label">Brand guardrails</span><button className="guardrail-row" onClick={() => setWatermark((value) => !value)}><span><strong>Institutional watermark</strong><small>Capco Intelligence Studio</small></span><span className={`toggle ${watermark ? "on" : ""}`}><i /></span></button><button className="guardrail-row" onClick={() => setLegalScrim((value) => !value)}><span><strong>Legal-clearance scrim</strong><small>Source footer remains visible</small></span><span className={`toggle ${legalScrim ? "on" : ""}`}><i /></span></button></div><div className="signoff-card"><span>HITL Gate 2</span><strong>{signedOff ? "Lead consultant sign-off recorded" : "Lead consultant review required"}</strong><small>{signedOff ? "Stage 04 is now unlocked." : "Review the image, overlays, and source locks before clearing."}</small><button className="button dark full" onClick={() => setSignedOff(true)} disabled={!artworkUrl || signedOff}><Icon name="check" size={15} />{signedOff ? "Gate 2 cleared" : "Sign off visual"}</button></div></aside>
      </div>
      <div className="handoff-bar"><div><strong>{signedOff ? "Gate 2 cleared" : artworkUrl ? "Composite ready for review" : "Infographic spec in progress"}</strong><span>{selectedStory ? `Selected story · ${selectedStory.source}` : "Select a story to begin"}</span><small>{signedOff ? "Stage 04 dispatch unlocked" : "Image backdrop and deterministic overlays stay separate"}</small></div><div><button className="button utility" onClick={() => setSaved(true)}>{saved ? "Saved to edition" : "Save visual spec"}</button><button className="button dark" disabled={!signedOff} onClick={() => { window.location.href = "/dispatch"; }}>Advance to Stage 04 <Icon name="arrow" size={16} /></button></div></div>
    </div>
  </AppShell>;
}
