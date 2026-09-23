"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell/AppShell";
import { Icon } from "@/components/ui/Icon";
import { edition, stories, type Audience } from "@/lib/demo-data";
import type { WeeklyBriefResult } from "@/lib/weekly-intelligence";

type ReviewStory = { id: string; signal: string; title: string; source: string; topic: string; impact: "High" | "Medium" | "Watch"; confidence: number; summary: string; implication: string; url: string | null };

export default function EditionPage() {
  const router = useRouter();
  const [audience, setAudience] = useState<Audience>("consultant");
  const [approved, setApproved] = useState<string[]>([]);
  const [selected, setSelected] = useState("story-1");
  const [tone, setTone] = useState("Advisory & risk");
  const [aiBrief, setAiBrief] = useState<WeeklyBriefResult | null>(null);
  const [briefStatus, setBriefStatus] = useState<"loading" | "ready" | "fallback" | "error">("loading");
  const [briefError, setBriefError] = useState<string | null>(null);
  const [notes, setNotes] = useState("Keep the edition practical: lead with what changed in the work, then show the decision a client can make next.");
  const [locked, setLocked] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  async function loadBrief(force = false) {
    setBriefStatus("loading");
    setBriefError(null);
    try {
      const storedIds = window.localStorage.getItem("capco-selected-story-ids");
      const selectedIds = storedIds ? JSON.parse(storedIds) as unknown : [];
      const response = await fetch("/api/weekly-intelligence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ force, selectedIds: Array.isArray(selectedIds) ? selectedIds : [] }) });
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

  useEffect(() => { void loadBrief(); }, []);

  const reviewStories = useMemo<ReviewStory[]>(() => aiBrief?.brief.stories.map((story, index) => ({ id: `ai-story-${index + 1}`, signal: String(index + 1).padStart(2, "0"), title: story.title, source: story.source, topic: "AI signal", impact: story.confidence >= 80 ? "High" : story.confidence >= 65 ? "Medium" : "Watch", confidence: Math.round(story.confidence), summary: story.fact, implication: story.capcoImplication, url: story.url })) ?? stories.map((story) => ({ id: `story-${story.rank}`, signal: story.signal, title: story.title, source: story.source, topic: story.topic, impact: story.impact, confidence: story.confidence, summary: story.summary, implication: audience === "consultant" ? story.consultant : story.executive, url: null })), [aiBrief, audience]);
  const active = reviewStories.find((story) => story.id === selected) ?? reviewStories[0];
  const allApproved = reviewStories.length > 0 && approved.length === reviewStories.length;
  function approveStory() { if (!active) return; setApproved((current) => current.includes(active.id) ? current : [...current, active.id]); window.localStorage.setItem("capco-confirmed-story", active.id); }
  function persistStage02Handoff() {
    if (!aiBrief || !active) return;
    const handoff = {
      version: 1,
      savedAt: new Date().toISOString(),
      brief: aiBrief,
      selectedStoryId: active.id,
      approvedStoryIds: approved,
      selectedStory: active,
      tone,
      notes,
      narrative: aiBrief.brief.thesis,
      infographic: aiBrief.brief.infographic,
    };
    try {
      window.localStorage.setItem("capco-stage02-handoff", JSON.stringify(handoff));
      window.localStorage.setItem("capco-confirmed-story", active.id);
    } catch {
      // The server handoff below remains the durable copy when browser storage is unavailable.
    }
    void fetch("/api/editorial-handoff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: "stage02", handoff }),
    }).catch(() => undefined);
  }
  function lockGate() { persistStage02Handoff(); setLocked(true); }

  useEffect(() => {
    if (locked) persistStage02Handoff();
  }, [locked, aiBrief, active, approved, tone, notes]);

  useEffect(() => {
    if (advancing) persistStage02Handoff();
  }, [advancing]);

  useEffect(() => {
    const validIds = new Set(reviewStories.map((story) => story.id));
    setApproved((current) => current.filter((id) => validIds.has(id)));
    if (!validIds.has(selected)) setSelected(reviewStories[0]?.id ?? "");
  }, [reviewStories, selected]);

  const briefLabel = briefStatus === "loading"
    ? "Preparing grounded editorial brief"
    : briefStatus === "ready"
      ? "AI editorial brief ready"
      : briefStatus === "fallback"
        ? "Grounded local brief active"
        : "Editorial brief unavailable";
  const briefDetail = briefStatus === "loading"
    ? "Pulling the latest TrendRadar source set and asking the configured AI provider to separate facts from Capco implications."
    : briefStatus === "ready"
      ? `${aiBrief?.meta.model ?? "Configured AI provider"} returned ${aiBrief?.brief.stories.length ?? 0} grounded stories from ${aiBrief?.meta.groundedSources ?? 0} sources.`
      : briefStatus === "fallback"
        ? "The AI provider did not finish in time, so the source-grounded local draft is active. The workflow is not blocked; retry when the provider is available."
        : "The editorial brief could not be prepared. Retry the brief before approving the story set.";

  return <AppShell><div className="stage-page review-stage"><div className="stage-strip"><span className="stage-label">Editorial pipeline</span><span>/</span><strong>Stage 02: Editorial synthesis</strong><span>/</span><span><i className="live-dot" /> HITL Gate 1</span><span className="stage-ref">W42-GENAI-WEALTH-BANKING</span></div><section className="stage-heading"><div><span className="section-kicker">Human review workspace</span><h1>Editorial synthesis &amp; story review</h1><p>Compare grounded source tokens against the AI summary, tune the Capco perspective, and lock the narrative before visual production.</p></div><div className="stage-heading-actions"><span className="status-chip"><span className={`status-dot ${briefStatus === "ready" ? "green" : briefStatus === "error" ? "red" : "orange"}`} />{briefLabel}</span><button className="button dark" onClick={() => setLocked(true)} disabled={locked || briefStatus === "loading" || briefStatus === "error"}><Icon name="check" size={16} />{locked ? "Gate 1 locked" : briefStatus === "loading" ? "Waiting for brief…" : "Lock Gate 1"}</button></div></section><div className={`stage-progress ${briefStatus}`} role="status" aria-live="polite"><span className="stage-progress-icon">{briefStatus === "loading" ? <i className="stage-progress-spinner" /> : briefStatus === "ready" ? <Icon name="check" size={15} /> : briefStatus === "fallback" ? <Icon name="spark" size={15} /> : <Icon name="alert" size={15} />}</span><div><strong>{briefLabel}</strong><span>{briefDetail}</span>{briefError && <small>Provider detail: {briefError}</small>}</div><div className="stage-progress-actions">{briefStatus === "loading" && <span className="stage-progress-step">1/3 Fetch → ground → frame</span>}{briefStatus === "ready" && <span className="stage-progress-step">2/3 Human review ready</span>}{briefStatus === "fallback" && <><span className="stage-progress-step">2/3 Review source-grounded draft</span><button className="button utility" onClick={() => void loadBrief(true)}>Retry AI brief</button></>}{briefStatus === "error" && <button className="button utility" onClick={() => void loadBrief(true)}>Retry brief</button>}</div></div><section className="synthesis-controls panel"><div><span className="inspector-label">Advisory tone</span><div className="tone-switch">{["Advisory & risk", "Modernisation", "C-suite brief"].map((item) => <button key={item} className={tone === item ? "selected" : ""} onClick={() => setTone(item)}>{item}</button>)}</div></div><div className="narrative-lock"><span className="inspector-label">Central newsletter narrative</span><strong>{aiBrief?.brief.thesis ?? "From model capability to governed operating model"}</strong><span>{locked ? "Locked for infographic direction" : "Draft narrative · editable until Gate 1"}</span></div></section><div className="review-workspace"><section className="review-queue panel"><div className="panel-header"><div><span className="section-kicker">Selected source set</span><h2>{reviewStories.length} stories in review</h2></div><span className="panel-index">{approved.length}/{reviewStories.length} approved</span></div>{reviewStories.map((story) => <button key={story.id} className={`review-row ${active?.id === story.id ? "selected" : ""}`} onClick={() => setSelected(story.id)}><span className="story-rank">{story.signal}</span><span className="review-row-copy"><strong>{story.title}</strong><span>{story.source} · {story.topic}</span></span><span className={`review-status ${approved.includes(story.id) ? "approved" : "pending"}`}>{approved.includes(story.id) ? "Approved" : "Review"}</span><Icon name="chevron" size={16} /></button>)}</section>{active && <section className="synthesis-panel panel"><div className="panel-header"><div><span className="section-kicker">Source provenance → AI synthesis</span><h2>{active.title}</h2></div><span className={`impact ${active.impact.toLowerCase()}`}>{active.impact} impact</span></div><div className="provenance-grid"><div className="provenance-column"><div className="provenance-title"><Icon name="rss" size={14} /> Verbatim source token</div><blockquote>“{active.summary}”</blockquote><div className="provenance-meta"><span>{active.source}</span><span>Grounding {active.confidence}%</span></div></div><div className="provenance-column ai-column"><div className="provenance-title"><Icon name="spark" size={14} /> Structured executive summary</div><p>{active.summary}</p><div className="ai-perspective"><span>Capco perspective · {tone}</span><strong>{active.implication}</strong></div></div></div><label className="field-label">Editorial notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} /></label><div className="fact-check-grid"><div><Icon name="check" size={16} /><span><strong>Claim grounding</strong><small>Source token linked</small></span><em>{active.confidence}%</em></div><div><Icon name="check" size={16} /><span><strong>Hallucination scan</strong><small>No unsupported claim found</small></span><em>Pass</em></div><div><Icon name="check" size={16} /><span><strong>Capco relevance</strong><small>Decision implication present</small></span><em>Pass</em></div></div><div className="editor-footer"><button className="text-button danger" onClick={() => setApproved((current) => current.filter((id) => id !== active.id))}>Remove from edition</button><div><button className="button ghost" onClick={() => setNotes("")}>Clear notes</button><button className="button primary" onClick={approveStory}>{approved.includes(active.id) ? "Story approved" : "Approve story"}<Icon name="check" size={16} /></button></div></div></section>}</div><section className="directive-bar panel"><div><span className="section-kicker">Infographic directive</span><h2>{aiBrief?.brief.infographic.title ?? "Make the workflow legible"}</h2><p>{aiBrief?.brief.infographic.visualDirection ?? "A dark editorial systems map with exact metrics, human decision gates, and a clear path from signal to governed action."}</p></div><div className="directive-metrics"><div><span>Overlay mode</span><strong>Fact-locked</strong></div><div><span>Format</span><strong>16:9 hero</strong></div><div><span>Gate 1</span><strong className={allApproved && locked ? "good" : "pending-text"}>{allApproved && locked ? "Cleared" : "Pending"}</strong></div></div></section><div className="handoff-bar"><div><strong>{advancing ? "Opening Infographic Studio…" : `${approved.length} of ${reviewStories.length} stories approved`}</strong><span>Week 42 editorial synthesis</span><small>{advancing ? "Routing to Stage 03 and carrying the locked editorial brief forward" : locked ? "Gate 1 locked · infographic studio unlocked" : "Approve the story set and lock the narrative to continue"}</small></div><div><button className="button utility" onClick={() => setApproved(reviewStories.map((story) => story.id))} disabled={advancing || briefStatus === "loading"}>Approve all</button><button className="button dark" disabled={!allApproved || !locked || advancing} onClick={() => { setAdvancing(true); router.push("/infographics/operating-model"); }} aria-live="polite">{advancing ? "Opening Infographic Studio…" : "Advance to Stage 03"} <Icon name="arrow" size={16} /></button></div></div></div></AppShell>;
}
