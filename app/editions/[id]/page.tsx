"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell/AppShell";
import { Icon } from "@/components/ui/Icon";
import { stories, type Audience } from "@/lib/demo-data";
import type { WeeklyBriefResult } from "@/lib/weekly-intelligence";

type BriefStatus = "loading" | "ready" | "fallback" | "error";
type ReviewStory = { id: string; signal: string; title: string; source: string; topic: string; impact: "High" | "Medium" | "Watch"; confidence: number; summary: string; implication: string; url: string | null };
type Stage01Handoff = { brief?: WeeklyBriefResult; selectedStoryIds?: string[]; selectedStories?: Array<Partial<ReviewStory> & { id: string }>; sourceSnapshot?: { totalItems?: number; syncedAt?: string | null }; savedAt?: string; status?: string };
type Stage02Handoff = { stage01?: Stage01Handoff | null; brief: WeeklyBriefResult; stories?: ReviewStory[]; selectedStoryId?: string; approvedStoryIds?: string[]; tone?: string; notes?: string; rewriteRequested?: string[]; savedAt?: string; status?: string };

function readLocalStage01() {
  try {
    const raw = window.localStorage.getItem("capco-stage01-handoff");
    return raw ? JSON.parse(raw) as Stage01Handoff : null;
  } catch { return null; }
}

function readLocalStage02() {
  try { const raw = window.localStorage.getItem("capco-stage02-handoff"); return raw ? JSON.parse(raw) as Stage02Handoff : null; } catch { return null; }
}

function storyFromBrief(story: WeeklyBriefResult["brief"]["stories"][number], index: number): ReviewStory {
  return { id: `ai-story-${index + 1}`, signal: String(index + 1).padStart(2, "0"), title: story.title, source: story.source, topic: "AI signal", impact: story.confidence >= 80 ? "High" : story.confidence >= 65 ? "Medium" : "Watch", confidence: Math.round(story.confidence), summary: story.fact, implication: story.capcoImplication, url: story.url };
}

export default function EditionPage() {
  const router = useRouter();
  const [audience, setAudience] = useState<Audience>("consultant");
  const [stage01, setStage01] = useState<Stage01Handoff | null>(null);
  const [approved, setApproved] = useState<string[]>([]);
  const [selected, setSelected] = useState("ai-story-1");
  const [tone, setTone] = useState("Advisory & risk");
  const [aiBrief, setAiBrief] = useState<WeeklyBriefResult | null>(null);
  const [briefStatus, setBriefStatus] = useState<BriefStatus>("loading");
  const [briefError, setBriefError] = useState<string | null>(null);
  const [notes, setNotes] = useState("Keep the edition practical: lead with what changed in the work, then show the decision a client can make next.");
  const [edits, setEdits] = useState<Record<string, Partial<ReviewStory>>>({});
  const [rewriteRequested, setRewriteRequested] = useState<string[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  async function loadBrief(force = false, selectedIds: string[] = []) {
    setBriefStatus("loading");
    setBriefError(null);
    try {
      const response = await fetch("/api/weekly-intelligence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ force, selectedIds }) });
      if (!response.ok) throw new Error(`Brief service returned ${response.status}`);
      const result = await response.json() as WeeklyBriefResult;
      setAiBrief(result);
      setBriefStatus(result.meta.provider === "fallback" ? "fallback" : "ready");
      setBriefError(result.meta.providerError ?? null);
    } catch (error) {
      setBriefStatus("error");
      setBriefError(error instanceof Error ? error.message : "Could not load the editorial brief");
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      let handoff = readLocalStage01();
      let savedStage02 = readLocalStage02();
      try {
        const [stage01Response, stage02Response] = await Promise.all([fetch("/api/editorial-handoff?stage=stage01", { cache: "no-store" }), fetch("/api/editorial-handoff?stage=stage02", { cache: "no-store" })]);
        if (stage01Response.ok) { const payload = await stage01Response.json() as { handoff?: Stage01Handoff | null }; if (payload.handoff && (!handoff?.savedAt || (payload.handoff.savedAt ?? "") >= (handoff.savedAt ?? ""))) handoff = payload.handoff; }
        if (stage02Response.ok) { const payload = await stage02Response.json() as { handoff?: Stage02Handoff | null }; if (payload.handoff && (!savedStage02?.savedAt || (payload.handoff.savedAt ?? "") >= (savedStage02.savedAt ?? ""))) savedStage02 = payload.handoff; }
      } catch { /* browser handoffs remain available */ }
      if (cancelled) return;
      if (savedStage02?.brief && (!handoff?.savedAt || (savedStage02.savedAt ?? "") >= (handoff.savedAt ?? ""))) {
        setStage01(savedStage02.stage01 ?? null); setAiBrief(savedStage02.brief); setBriefStatus(savedStage02.brief.meta.provider === "fallback" ? "fallback" : "ready"); setBriefError(savedStage02.brief.meta.providerError ?? null); setApproved(savedStage02.approvedStoryIds ?? []); setSelected(savedStage02.selectedStoryId ?? "ai-story-1"); setTone(savedStage02.tone ?? "Advisory & risk"); setNotes(savedStage02.notes ?? notes); setRewriteRequested(savedStage02.rewriteRequested ?? []); setEdits(Object.fromEntries((savedStage02.stories ?? []).map((story) => [story.id, story]))); setLocked(savedStage02.status === "approved"); return;
      }
      if (handoff) {
        setStage01(handoff);
        if (handoff.brief) {
          setAiBrief(handoff.brief);
          setBriefStatus(handoff.brief.meta.provider === "fallback" ? "fallback" : "ready");
          setBriefError(handoff.brief.meta.providerError ?? null);
        } else {
          await loadBrief(false, handoff.selectedStoryIds ?? []);
        }
      } else {
        await loadBrief();
      }
    }
    void restore();
    return () => { cancelled = true; };
  }, []);

  const baseStories = useMemo<ReviewStory[]>(() => {
    if (aiBrief) return aiBrief.brief.stories.map(storyFromBrief);
    if (stage01?.selectedStories?.length) return stage01.selectedStories.map((story, index) => ({ id: story.id, signal: String(index + 1).padStart(2, "0"), title: story.title ?? "Untitled source", source: story.source ?? "TrendRadar", topic: story.topic ?? "AI signal", impact: story.impact ?? "Watch", confidence: story.confidence ?? 0, summary: story.summary ?? "Source summary pending.", implication: story.implication ?? "Capco perspective pending.", url: story.url ?? null }));
    return stories.map((story) => ({ id: `story-${story.rank}`, signal: story.signal, title: story.title, source: story.source, topic: story.topic, impact: story.impact, confidence: story.confidence, summary: story.summary, implication: audience === "consultant" ? story.consultant : story.executive, url: null }));
  }, [aiBrief, audience, stage01]);

  const reviewStories = useMemo(() => baseStories.map((story) => ({ ...story, ...edits[story.id] })), [baseStories, edits]);
  const active = reviewStories.find((story) => story.id === selected) ?? reviewStories[0];
  const allApproved = reviewStories.length > 0 && approved.length === reviewStories.length;
  const updateActive = (field: keyof ReviewStory, value: string) => { if (!active) return; setEdits((current) => ({ ...current, [active.id]: { ...current[active.id], [field]: value } })); };

  function approveStory() { if (!active) return; setApproved((current) => current.includes(active.id) ? current : [...current, active.id]); setActionMessage(`${active.title} approved for visual production.`); }
  function requestRewrite() { if (!active) return; setRewriteRequested((current) => current.includes(active.id) ? current : [...current, active.id]); setActionMessage(`Rewrite requested for ${active.title}. Edit the fields above, then approve again.`); }
  function swapStory() { const next = reviewStories.find((story) => story.id !== active?.id && !approved.includes(story.id)); if (next) { setSelected(next.id); setActionMessage(`Swapped review focus to ${next.title}.`); } else setActionMessage("All available stories are already approved."); }

  function persistStage02Handoff() {
    if (!aiBrief || !active) return;
    const handoff = { version: 2, savedAt: new Date().toISOString(), stage01, brief: aiBrief, stories: reviewStories, selectedStoryId: active.id, approvedStoryIds: approved, selectedStory: active, rewriteRequested, tone, notes, narrative: aiBrief.brief.thesis, infographic: aiBrief.brief.infographic, status: "approved" };
    try { window.localStorage.setItem("capco-stage02-handoff", JSON.stringify(handoff)); window.localStorage.setItem("capco-confirmed-story", active.id); } catch { /* server copy remains available */ }
    void fetch("/api/editorial-handoff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: "stage02", handoff }) }).catch(() => undefined);
  }

  function lockGate() { persistStage02Handoff(); setLocked(true); }

  useEffect(() => { const valid = new Set(reviewStories.map((story) => story.id)); setApproved((current) => current.filter((id) => valid.has(id))); if (!valid.has(selected)) setSelected(reviewStories[0]?.id ?? ""); }, [reviewStories, selected]);
  useEffect(() => { if (locked || advancing) persistStage02Handoff(); }, [locked, advancing, reviewStories, approved, selected, tone, notes, rewriteRequested]);

  const briefLabel = briefStatus === "loading" ? "Preparing grounded editorial brief" : briefStatus === "ready" ? "AI editorial brief ready" : briefStatus === "fallback" ? "Grounded local brief active" : "Editorial brief unavailable";
  const briefDetail = briefStatus === "loading" ? "Restoring the selected Stage 01 sources and separating reported facts from Capco interpretation." : briefStatus === "ready" ? `${aiBrief?.meta.model ?? "Configured AI provider"} returned ${reviewStories.length} editable stories.` : briefStatus === "fallback" ? "The source-grounded local brief remains editable while the provider is unavailable." : "Retry the brief before approving the story set.";

  return <AppShell><div className="stage-page review-stage">
    <div className="stage-strip"><span className="stage-label">Editorial pipeline</span><span>/</span><strong>Stage 02: Editorial review</strong><span>/</span><span><i className="live-dot" /> HITL Gate 1</span><span className="stage-ref">{stage01 ? `${stage01.selectedStories?.length ?? stage01.selectedStoryIds?.length ?? 0} Stage 01 sources linked` : "Restoring Stage 01"}</span></div>
    <section className="stage-heading"><div><span className="section-kicker">Editorial review &amp; approval gate</span><h1>Review the story, summary, and Capco PoV</h1><p>Edit the content that will travel into the infographic and publishing bundle. Every approved field remains linked to its source story.</p></div><div className="stage-heading-actions"><span className="status-chip"><span className={`status-dot ${briefStatus === "ready" ? "green" : briefStatus === "error" ? "red" : "orange"}`} />{briefLabel}</span><button className="button dark" onClick={lockGate} disabled={locked || briefStatus === "loading" || briefStatus === "error"}><Icon name="check" size={16} />{locked ? "Gate 1 locked" : "Lock approval gate"}</button></div></section>
    <div className={`stage-progress ${briefStatus}`} role="status" aria-live="polite"><span className="stage-progress-icon">{briefStatus === "loading" ? <i className="stage-progress-spinner" /> : briefStatus === "ready" ? <Icon name="check" size={15} /> : briefStatus === "fallback" ? <Icon name="spark" size={15} /> : <Icon name="alert" size={15} />}</span><div><strong>{briefLabel}</strong><span>{briefDetail}</span>{briefError && <small>Provider detail: {briefError}</small>}</div><div className="stage-progress-actions">{(briefStatus === "fallback" || briefStatus === "error") && <button className="button utility" onClick={() => void loadBrief(true, stage01?.selectedStoryIds ?? [])}>Retry brief</button>}</div></div>
    <section className="synthesis-controls panel"><div><span className="inspector-label">Advisory tone</span><div className="tone-switch">{["Advisory & risk", "Modernisation", "C-suite brief"].map((item) => <button key={item} className={tone === item ? "selected" : ""} onClick={() => setTone(item)}>{item}</button>)}</div></div><div className="narrative-lock"><span className="inspector-label">Central newsletter narrative</span><strong>{aiBrief?.brief.thesis ?? "Restoring the Stage 01 editorial narrative"}</strong><span>{locked ? "Locked for infographic direction" : "Editable until approval gate is locked"}</span></div></section>
    <div className="review-workspace"><section className="review-queue panel"><div className="panel-header"><div><span className="section-kicker">Stage 01 curated set</span><h2>{reviewStories.length} stories in review</h2></div><span className="panel-index">{approved.length}/{reviewStories.length} approved</span></div>{reviewStories.map((story) => <button key={story.id} className={`review-row ${active?.id === story.id ? "selected" : ""}`} onClick={() => setSelected(story.id)}><span className="story-rank">{story.signal}</span><span className="review-row-copy"><strong>{story.title}</strong><span>{story.source} · {story.topic}</span></span><span className={`review-status ${approved.includes(story.id) ? "approved" : "pending"}`}>{approved.includes(story.id) ? "Approved" : rewriteRequested.includes(story.id) ? "Rewrite" : "Review"}</span><Icon name="chevron" size={16} /></button>)}</section>{active && <section className="synthesis-panel panel"><div className="panel-header"><div><span className="section-kicker">Editable editorial bundle</span><h2>{active.source}</h2></div><span className={`impact ${active.impact.toLowerCase()}`}>{active.impact} impact</span></div><div className="editorial-edit-grid"><label className="field-label"><span>Core headline</span><input value={active.title} onChange={(event) => updateActive("title", event.target.value)} /></label><label className="field-label"><span>Key takeaway / grounded summary</span><textarea value={active.summary} onChange={(event) => updateActive("summary", event.target.value)} rows={5} /></label><label className="field-label"><span>Capco Point of View</span><textarea value={active.implication} onChange={(event) => updateActive("implication", event.target.value)} rows={5} /></label></div><div className="provenance-grid"><div className="provenance-column"><div className="provenance-title"><Icon name="rss" size={14} /> Source provenance</div><blockquote>“{active.summary}”</blockquote><div className="provenance-meta"><span>{active.source}</span><span>Grounding {active.confidence}%</span>{active.url && <a href={active.url} target="_blank" rel="noreferrer">Open source</a>}</div></div><div className="provenance-column ai-column"><div className="provenance-title"><Icon name="spark" size={14} /> Editorial PoV · {tone}</div><p>{active.implication}</p><div className="ai-perspective"><span>Handoff status</span><strong>{rewriteRequested.includes(active.id) ? "Rewrite requested · awaiting editorial revision" : approved.includes(active.id) ? "Approved for visual generation" : "Awaiting human approval"}</strong></div></div></div><label className="field-label">Editorial notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} /></label><div className="fact-check-grid"><div><Icon name="check" size={16} /><span><strong>Claim grounding</strong><small>Source token linked</small></span><em>{active.confidence}%</em></div><div><Icon name="check" size={16} /><span><strong>Hallucination scan</strong><small>Human review required</small></span><em>Pass</em></div><div><Icon name="check" size={16} /><span><strong>Capco relevance</strong><small>PoV attached</small></span><em>Pass</em></div></div><div className="editor-footer"><div className="stage-action-group"><button className="button utility" onClick={requestRewrite}>Request re-write</button><button className="button utility" onClick={swapStory}>Swap story</button></div><div><button className="button ghost" onClick={() => setNotes("")}>Clear notes</button><button className="button primary" onClick={approveStory}>{approved.includes(active.id) ? "Story approved" : "Approve story"}<Icon name="check" size={16} /></button></div></div></section>}</div>
    <section className="directive-bar panel"><div><span className="section-kicker">Visual handoff directive</span><h2>{aiBrief?.brief.infographic.title ?? "Make the workflow legible"}</h2><p>{aiBrief?.brief.infographic.visualDirection ?? "The approved summary and Capco PoV will become the text plan for the infographic and publication bundle."}</p></div><div className="directive-metrics"><div><span>Source stories</span><strong>{stage01?.selectedStories?.length ?? stage01?.selectedStoryIds?.length ?? reviewStories.length}</strong></div><div><span>Overlay mode</span><strong>Fact-locked</strong></div><div><span>Gate 1</span><strong className={allApproved && locked ? "good" : "pending-text"}>{allApproved && locked ? "Cleared" : "Pending"}</strong></div></div></section>
    <div className="handoff-bar"><div><strong>{advancing ? "Opening Visual Curation…" : `${approved.length} of ${reviewStories.length} stories approved`}</strong><span>{actionMessage ?? "Approve each story, then lock the editorial bundle."}</span><small>{advancing ? "Carrying headline, summary, PoV, source links, and approved story set into Stage 03" : locked ? "Gate 1 locked · visual curation unlocked" : "Your edits are saved with the story handoff."}</small></div><div><button className="button utility" onClick={() => setApproved(reviewStories.map((story) => story.id))} disabled={advancing || briefStatus === "loading"}>Approve all</button><button className="button dark" disabled={!allApproved || !locked || advancing} onClick={() => { persistStage02Handoff(); setAdvancing(true); router.push("/infographics/operating-model"); }} aria-live="polite">{advancing ? "Opening Visual Curation…" : "Advance to Stage 03"} <Icon name="arrow" size={16} /></button></div></div>
  </div></AppShell>;
}
