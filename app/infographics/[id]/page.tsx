"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { AppShell } from "@/components/app-shell/AppShell";
import { Icon } from "@/components/ui/Icon";
import type { WeeklyBriefResult, WeeklyStory } from "@/lib/weekly-intelligence";

type BriefStatus = "loading" | "ready" | "fallback" | "error";
type ArtworkStatus = "idle" | "generating" | "generated" | "cached" | "awaiting_provider" | "error";
type StudioStory = WeeklyStory & { id: string; signal?: string; sourceUrl?: string | null; summary?: string; implication?: string };
type Overlay = { id: string; label: string; value: string; x: number; y: number; width: number; kind: "headline" | "summary" | "pov" | "metric" | "source" };
type Stage02Handoff = { brief: WeeklyBriefResult; stories?: StudioStory[]; selectedStoryId?: string; approvedStoryIds?: string[]; selectedStory?: StudioStory; tone?: string; notes?: string; infographic?: WeeklyBriefResult["brief"]["infographic"]; savedAt?: string };
type Stage03Handoff = { version: 2; savedAt: string; brief: WeeklyBriefResult | null; stage02?: Stage02Handoff | null; stories: StudioStory[]; selectedStory: StudioStory | null; visualStyle: { id: string; name: string }; layout: { id: string; name: string }; infographic: WeeklyBriefResult["brief"]["infographic"] | null; metrics: string[]; overlays: Overlay[]; artworkUrl: string | null; referenceImage: string | null; watermark: boolean; legalScrim: boolean; status: string };

function normalizeStory(story: Partial<StudioStory> & { id: string }, index: number): StudioStory {
  return { id: story.id, title: story.title ?? "Untitled story", source: story.source ?? "TrendRadar", url: story.url ?? story.sourceUrl ?? null, fact: story.fact ?? story.summary ?? "Approved summary pending.", capcoImplication: story.capcoImplication ?? story.implication ?? "Capco PoV pending.", confidence: story.confidence ?? 0, signal: story.signal ?? String(index + 1).padStart(2, "0") };
}

const visualStyles = [
  { id: "editorial-grid", name: "Corporate consulting", description: "Institutional navy, hairlines, framed facts", preview: "grid" },
  { id: "signal-flow", name: "Minimalist tech", description: "Layered pathways from signal to decision", preview: "flow" },
  { id: "risk-atlas", name: "Data-dense atlas", description: "Contour fields for momentum and constraints", preview: "atlas" },
  { id: "executive-poster", name: "Executive poster", description: "One strong headline with evidence bands", preview: "poster" },
] as const;
const archetypes = [
  { id: "3-tier", name: "3-Tier Architecture Framework", description: "Signal → orchestration → governed action", preview: "tiers" },
  { id: "quadrant", name: "Risk-Value Quadrant Matrix", description: "Position momentum against constraints", preview: "quadrant" },
  { id: "decision-tree", name: "Decision Tree", description: "Make escalation and ownership explicit", preview: "tree" },
  { id: "kpi-pillars", name: "KPI Pillar Board", description: "Anchor the message to measurable outcomes", preview: "pillars" },
] as const;
const defaultMetrics = ["<18ms Ingestion SLA", "<340ms Agent Swarm Consensus", "99.4% Dual-Signoff Rule"];

function readLocalStage02() { try { const raw = window.localStorage.getItem("capco-stage02-handoff"); return raw ? JSON.parse(raw) as Stage02Handoff : null; } catch { return null; } }

function chooseLatestStage02(local: Stage02Handoff | null, remote: Stage02Handoff | null) {
  if (!local) return remote;
  if (!remote) return local;
  const localTime = Date.parse(local.savedAt ?? "") || 0;
  const remoteTime = Date.parse(remote.savedAt ?? "") || 0;
  return remoteTime >= localTime ? remote : local;
}

export default function InfographicPage() {
  const [handoff, setHandoff] = useState<Stage02Handoff | null>(null);
  const [aiBrief, setAiBrief] = useState<WeeklyBriefResult | null>(null);
  const [briefStatus, setBriefStatus] = useState<BriefStatus>("loading");
  const [briefError, setBriefError] = useState<string | null>(null);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>("ai-story-1");
  const [visualStyle, setVisualStyle] = useState("editorial-grid");
  const [archetype, setArchetype] = useState("3-tier");
  const [prompt, setPrompt] = useState("Create a complete Capco infographic with a clear headline, labeled information zones, a Capco PoV callout, and a source footer. Preserve the approved story facts.");
  const [seed, setSeed] = useState("capco-editorial-001");
  const [metrics, setMetrics] = useState(defaultMetrics);
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [watermark, setWatermark] = useState(true);
  const [legalScrim, setLegalScrim] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [signedOff, setSignedOff] = useState(false);
  const [visualCleared, setVisualCleared] = useState(false);
  const [saved, setSaved] = useState(false);
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
  const [artworkModel, setArtworkModel] = useState<string | null>(null);
  const [artworkStatus, setArtworkStatus] = useState<ArtworkStatus>("idle");
  const [ocrStatus, setOcrStatus] = useState<"idle" | "running" | "ready">("idle");
  const [activity, setActivity] = useState<string[]>(["Studio opened · waiting for the approved Stage 02 bundle"]);

  function logActivity(message: string) { setActivity((current) => [...current.slice(-5), message]); }
  const stories = useMemo<StudioStory[]>(() => handoff?.stories?.length ? handoff.stories.map(normalizeStory) : aiBrief?.brief.stories.map((story, index) => normalizeStory({ ...story, id: `ai-story-${index + 1}` }, index)) ?? [], [aiBrief, handoff]);
  const selectedStory = selectedStoryId ? stories.find((story) => story.id === selectedStoryId) ?? (handoff?.selectedStory ? normalizeStory(handoff.selectedStory, 0) : null) : null;
  const approvedStories = useMemo(() => { const ids = handoff?.approvedStoryIds ?? []; return ids.length ? stories.filter((story) => ids.includes(story.id)) : stories; }, [handoff, stories]);
  const selectedArchetype = archetypes.find((item) => item.id === archetype) ?? archetypes[0];
  const selectedVisualStyle = visualStyles.find((item) => item.id === visualStyle) ?? visualStyles[0];
  const infographic = handoff?.infographic ?? aiBrief?.brief.infographic ?? null;
  const textPlan = { headline: selectedStory?.title ?? infographic?.title ?? "From signal to governed action", summary: selectedStory?.fact ?? infographic?.subtitle ?? "Approved story summary", perspective: selectedStory?.capcoImplication ?? aiBrief?.brief.capcoPerspective ?? "Capco perspective", sections: infographic?.sections ?? ["Signal", "Interpretation", "Decision rights", "Control points", "Client action"] };

  function applyHandoff(next: Stage02Handoff) { setHandoff(next); setAiBrief(next.brief); setSelectedStoryId(next.selectedStoryId ?? next.selectedStory?.id ?? "ai-story-1"); setVisualCleared(false); setConfirmed(false); setSignedOff(false); setBriefStatus(next.brief.meta.provider === "fallback" ? "fallback" : "ready"); setBriefError(next.brief.meta.providerError ?? null); setPrompt((current) => next.notes && !current.includes(next.notes) ? `${current}\nEditorial note: ${next.notes}` : current); logActivity("Stage 02 approved bundle restored · story, summary, PoV, and sources linked"); }

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      let local = readLocalStage02();
      try { const response = await fetch("/api/editorial-handoff?stage=stage02", { cache: "no-store" }); if (response.ok) { const payload = await response.json() as { handoff?: Stage02Handoff | null }; if (payload.handoff) local = chooseLatestStage02(local, payload.handoff); } } catch { /* local remains available */ }
      if (cancelled) return;
      if (local?.brief) applyHandoff(local);
      else { setBriefStatus("error"); setBriefError("Stage 02 approval handoff is not available. Return to Editorial Review and approve a story first."); logActivity("Waiting for a locked Stage 02 bundle"); }
    }
    void restore();
    return () => { cancelled = true; };
  }, []);

  function confirmStory() { if (!selectedStory) return; setVisualCleared(false); setConfirmed(true); logActivity(`Story confirmed · ${selectedStory.title}`); }

  function clearVisual() {
    setSelectedStoryId(null);
    setArtworkUrl(null);
    setArtworkModel(null);
    setArtworkStatus("idle");
    setOverlays([]);
    setOcrStatus("idle");
    setConfirmed(false);
    setVisualCleared(true);
    setSignedOff(false);
    setSaved(false);
    logActivity("Visual cleared · this edition will publish without an infographic");
  }

  function confirmNoVisual() {
    setSelectedStoryId(null);
    setArtworkUrl(null);
    setArtworkModel(null);
    setArtworkStatus("idle");
    setOverlays([]);
    setOcrStatus("idle");
    setConfirmed(false);
    setVisualCleared(true);
    setSignedOff(true);
    setSaved(false);
    persistStage03Handoff(null, [], "confirmed-no-visual", null);
    logActivity("No visual confirmed · Stage 04 will dispatch the locked story set without artwork");
  }

  async function runOcrDetection() {
    setOverlays([]);
    setOcrStatus("idle");
    logActivity("Text overlays are disabled · image-only visual retained");
  }

  function updateOverlay(id: string, value: string) { setOverlays((current) => current.map((overlay) => overlay.id === id ? { ...overlay, value } : overlay)); }

  function persistStage03Handoff(nextArtworkUrl = artworkUrl, nextOverlays = overlays, nextStatus = visualCleared && !selectedStory ? signedOff ? "confirmed-no-visual" : "draft-no-visual" : signedOff ? "confirmed" : "draft", nextSelectedStory: StudioStory | null = selectedStory) {
    if (!aiBrief || (!nextSelectedStory && !visualCleared && nextStatus !== "confirmed-no-visual")) return;
    const next: Stage03Handoff = { version: 2, savedAt: new Date().toISOString(), brief: aiBrief, stage02: handoff, stories: approvedStories, selectedStory: nextSelectedStory, visualStyle: { id: selectedVisualStyle.id, name: selectedVisualStyle.name }, layout: { id: selectedArchetype.id, name: selectedArchetype.name }, infographic, metrics, overlays: nextOverlays, artworkUrl: nextArtworkUrl, referenceImage, watermark, legalScrim, status: nextStatus };
    try { window.localStorage.setItem("capco-stage03-handoff", JSON.stringify(next)); window.localStorage.setItem("capco-infographic-artwork", nextArtworkUrl ?? ""); } catch { /* server copy remains available */ }
    void fetch("/api/editorial-handoff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: "stage03", handoff: next }) }).catch(() => undefined);
  }

  async function generateArtwork() {
    if (!selectedStory || !aiBrief) return;
    if (!confirmed) confirmStory();
    setArtworkStatus("generating"); setSaved(false); logActivity(`Generating ${selectedVisualStyle.name} · ${selectedArchetype.name}`);
    try {
      const response = await fetch("/api/generate-art", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brief: aiBrief.brief, story: selectedStory, archetype: selectedArchetype.name, layout: selectedArchetype.name, visualStyle: selectedVisualStyle.name, prompt, seed, includeText: true, referenceImage, textPlan }) });
      const result = await response.json() as { status?: ArtworkStatus; output?: string | null; model?: string; cached?: boolean; message?: string };
      if (!response.ok) throw new Error(result.message ?? `Artwork service returned ${response.status}`);
      if (result.output) { setArtworkUrl(result.output); setArtworkModel(result.model ?? "configured image model"); setArtworkStatus(result.cached ? "cached" : "generated"); setOverlays([]); setOcrStatus("idle"); logActivity(result.cached ? "Artwork restored from visual memory · editor overlays remain off" : "Image model returned the story visual · editor overlays remain off"); persistStage03Handoff(result.output, []); }
      else if (result.status === "awaiting_provider") { setArtworkStatus("awaiting_provider"); logActivity("Image provider unavailable · editable source-grounded canvas remains available"); }
      else throw new Error(result.message ?? "The image model returned no artwork");
    } catch (error) { setArtworkStatus("error"); logActivity(`Generation failed · ${error instanceof Error ? error.message : "retry when available"}`); }
  }

  useEffect(() => { if ((artworkUrl && selectedStory) || visualCleared) persistStage03Handoff(); }, [artworkUrl, selectedStoryId, visualStyle, archetype, metrics, overlays, watermark, legalScrim, referenceImage, signedOff, visualCleared]);

  function handleReference(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setReferenceImage(String(reader.result)); reader.readAsDataURL(file); }
  const briefLabel = briefStatus === "loading" ? "Restoring Stage 02 bundle" : briefStatus === "ready" ? "Approved editorial bundle ready" : briefStatus === "fallback" ? "Grounded local bundle active" : "Visual bundle unavailable";
  const artworkLabel = artworkStatus === "generating" ? "Generating complete infographic…" : artworkStatus === "generated" ? `Generated with ${artworkModel ?? "image model"}` : artworkStatus === "cached" ? "Artwork restored from visual memory" : artworkStatus === "awaiting_provider" ? "Provider key required" : artworkStatus === "error" ? "Generation failed · retry" : "Infographic not generated";

  return <AppShell><div className="stage-page infographic-stage studio-stage">
    <div className="studio-pipeline-shell"><div className="studio-pipeline-brand"><span className="studio-pipeline-mark">C</span><span><strong>CAPCO INTELLIGENCE STUDIO</strong><small>Stage 02 approval → visual curation → image-model text</small></span></div><div className="studio-pipeline-steps"><span className="done"><b>01</b> Triage <small>Done</small></span><i /><span className="done"><b>02</b> Review <small>Approved</small></span><i /><span className="active"><b>03</b> Visual curation <small>In progress</small></span><i /><span><b>04</b> Publish <small>Pending</small></span></div></div>
    <section className="stage-heading studio-stage-heading"><div><span className="section-kicker">Visual curation &amp; image generation</span><h1>Build the visual communication</h1><p>Choose a visual language and generate the infographic from the approved editorial bundle. The detached OCR/editor overlay is temporarily disabled.</p></div><div className="stage-heading-actions"><span className="status-chip"><span className={`status-dot ${signedOff ? "green" : briefStatus === "error" ? "red" : "orange"}`} />{signedOff ? (visualCleared ? "No visual confirmed" : "Visual confirmed") : briefLabel}</span><button className="button dark" onClick={() => visualCleared ? confirmNoVisual() : (() => { setSignedOff(true); persistStage03Handoff(); })()} disabled={signedOff || (!artworkUrl && !visualCleared)}><Icon name="check" size={16} />{signedOff ? (visualCleared ? "No visual confirmed" : "Visual confirmed") : visualCleared ? "Confirm no visual" : "Confirm visual"}</button></div></section>
    <div className="stage-progress ready" role="status" aria-live="polite"><span className="stage-progress-icon"><Icon name="check" size={15} /></span><div><strong>{briefLabel}</strong><span>{selectedStory ? `${selectedStory.title} · ${selectedStory.source}` : "Awaiting Stage 02 approval"}</span>{briefError && <small>{briefError}</small>}</div><div className="stage-progress-actions"><span className="stage-progress-step">{approvedStories.length} approved stories · editor overlays off</span></div></div>
    <div className="studio-grid"><aside className="studio-rail panel"><div className="studio-panel-heading"><div><span className="section-kicker">01 · Approved story bundle</span><h2>Story to visualize</h2></div><span className={`lock-label ${handoff ? "locked" : ""}`}>{handoff ? "Locked" : "Waiting"}</span></div><div className="story-picker">{approvedStories.length ? approvedStories.map((story, index) => <button key={story.id} className={`story-picker-row ${selectedStory?.id === story.id ? "selected" : ""}`} onClick={() => { setSelectedStoryId(story.id); setVisualCleared(false); setConfirmed(false); setSignedOff(false); }}><span className="story-picker-index">{String(index + 1).padStart(2, "0")}</span><span><strong>{story.title}</strong><small>{story.source} · {story.confidence}% grounding</small></span><Icon name="chevron" size={15} /></button>) : <div className="empty-studio">Return to Stage 02 and approve a story first.</div>}</div><button className="button utility full" onClick={clearVisual} disabled={visualCleared && !selectedStory && !artworkUrl}>Clear visual · no infographic needed</button>{selectedStory && <div className="confirmed-story"><span>Approved summary</span><strong>{selectedStory.title}</strong><p>{selectedStory.fact}</p><div className="handoff-detail"><span>Capco PoV</span><p>{selectedStory.capcoImplication}</p></div><button className={`button ${confirmed ? "ghost" : "primary"} full`} onClick={confirmStory}><Icon name="check" size={14} />{confirmed ? "Story confirmed" : "Confirm selected story"}</button></div>}
      <div className="studio-control-block"><span className="studio-control-label">02 · Visual template</span><div className="visual-style-grid">{visualStyles.map((item) => <button key={item.id} className={`visual-style-card ${visualStyle === item.id ? "selected" : ""}`} onClick={() => { setVisualStyle(item.id); setArtworkUrl(null); setOverlays([]); setArtworkStatus("idle"); }}><span className={`template-preview template-${item.preview}`}><i /><b /><em /></span><span><strong>{item.name}</strong><small>{item.description}</small></span></button>)}</div></div>
      <div className="studio-control-block"><span className="studio-control-label">03 · Layout selection</span><div className="archetype-list">{archetypes.map((item) => <button key={item.id} className={archetype === item.id ? "selected" : ""} onClick={() => { setArchetype(item.id); setArtworkUrl(null); setOverlays([]); setArtworkStatus("idle"); }}><span className={`layout-preview layout-${item.preview}`}><i /><b /><em /></span><span><strong>{item.name}</strong><small>{item.description}</small></span><Icon name="chevron" size={14} /></button>)}</div></div>
      <div className="studio-control-block"><span className="studio-control-label">04 · Reference image steering</span><label className="reference-drop"><input type="file" accept="image/*" onChange={handleReference} /><span>{referenceImage ? "Reference image loaded" : "Paste or upload a reference image"}</span><small>Used as style guidance for the image model</small></label>{referenceImage && <img className="reference-thumb" src={referenceImage} alt="Visual style reference" />}</div>
      <div className="studio-control-block"><span className="studio-control-label">05 · Generation controls</span><label className="studio-field"><span>Prompt direction</span><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={4} /></label><label className="studio-field"><span>Deterministic seed</span><input value={seed} onChange={(event) => setSeed(event.target.value)} /></label><button className="button primary full studio-generate" onClick={() => void generateArtwork()} disabled={!selectedStory || !aiBrief || artworkStatus === "generating"}><Icon name="spark" size={15} />{artworkStatus === "generating" ? "Generating infographic…" : "Generate infographic"}</button></div></aside>
      <main className="studio-canvas-column"><div className="studio-canvas-wrap"><div className={`studio-canvas ${artworkUrl ? "has-artwork" : ""} visual-${visualStyle} layout-${archetype}`} style={artworkUrl ? { backgroundImage: `url(${artworkUrl})` } : undefined} /></div><div className="studio-canvas-status"><span><i className={`status-dot ${artworkUrl ? "green" : visualCleared ? "green" : "orange"}`} />{visualCleared ? "No visual requested for this edition" : artworkLabel}</span><span>{visualCleared ? "Empty visual confirmed · story set remains locked for dispatch" : "Image-model text only · editor overlays disabled"}</span></div><div className="activity-timeline"><div className="activity-heading"><span>Generation activity</span><small>Story and asset handoff log</small></div>{activity.map((item, index) => <div key={`${item}-${index}`} className="activity-row"><i className={index === activity.length - 1 && artworkStatus === "generating" ? "activity-spinner" : "activity-dot"} /><span>{item}</span></div>)}</div></main>
      <aside className="studio-inspector panel"><div className="studio-panel-heading"><div><span className="section-kicker">06 · Source locks</span><h2>Artwork controls</h2></div><span className="lock-label locked">Fact-locked</span></div>{selectedStory ? <><div className="source-lock-card"><span>Confirmed provenance</span><strong>{selectedStory.source}</strong><small>{selectedStory.url ?? "TrendRadar source record"}</small><p>{selectedStory.fact}</p></div><div className="source-lock-card capco"><span>Capco PoV</span><p>{selectedStory.capcoImplication}</p></div></> : <div className="empty-studio">{visualCleared ? "No visual requested. The locked Gate 1 story set will still move to Stage 04." : "Approve a story in Stage 02 to unlock source locks."}</div>}<div className="studio-control-block"><span className="studio-control-label">Editor overlays</span><div className="source-lock-card"><p>OCR detection and deterministic text overlays are disabled for this visual pass. Text generated by the image model remains embedded in the artwork.</p></div></div><div className="studio-control-block"><span className="studio-control-label">Brand guardrails</span><button className="guardrail-row" onClick={() => setWatermark((value) => !value)}><span><strong>Institutional watermark</strong><small>Capco Intelligence Studio</small></span><span className={`toggle ${watermark ? "on" : ""}`}><i /></span></button><button className="guardrail-row" onClick={() => setLegalScrim((value) => !value)}><span><strong>Legal-clearance scrim</strong><small>Source footer remains visible</small></span><span className={`toggle ${legalScrim ? "on" : ""}`}><i /></span></button></div><div className="signoff-card"><span>HITL Gate 2</span><strong>{signedOff ? (visualCleared ? "No visual sign-off recorded" : "Lead consultant sign-off recorded") : visualCleared ? "Confirm the empty visual" : "Review generated artwork"}</strong><small>{signedOff ? "Stage 04 publishing bundle is ready." : visualCleared ? "This edition can proceed without an infographic." : "Confirm the generated visual when it is ready."}</small><button className="button dark full" onClick={() => visualCleared ? confirmNoVisual() : (() => { setSignedOff(true); persistStage03Handoff(); })()} disabled={signedOff || (!artworkUrl && !visualCleared)}><Icon name="check" size={15} />{signedOff ? (visualCleared ? "No visual confirmed" : "Visual confirmed") : visualCleared ? "Confirm no visual" : "Confirm visual"}</button></div></aside>
    </div>
    <div className="handoff-bar"><div><strong>{signedOff ? (visualCleared ? "No visual confirmed" : "Visual confirmed") : artworkUrl ? "Generated artwork ready for review" : visualCleared ? "Empty visual ready for confirmation" : "Visual curation in progress"}</strong><span>{selectedStory ? `Selected story · ${selectedStory.source}` : visualCleared ? `${approvedStories.length} locked stories will still be dispatched` : "Stage 02 story handoff required"}</span><small>{signedOff ? "Stage 04 publishing bundle unlocked" : "Story set remains linked even when no infographic is requested"}</small></div><div><button className="button utility" onClick={() => { persistStage03Handoff(); setSaved(true); }}>{saved ? "Saved to bundle" : "Save visual bundle"}</button><button className="button dark" disabled={!signedOff} onClick={() => { persistStage03Handoff(); window.location.href = "/dispatch"; }}>Advance to Stage 04 <Icon name="arrow" size={16} /></button></div></div>
  </div></AppShell>;
}
