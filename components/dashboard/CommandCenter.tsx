"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { edition, stories, type Audience } from "@/lib/demo-data";
import { Icon } from "@/components/ui/Icon";
import { WorkflowDiagram } from "@/components/workflow/WorkflowDiagram";
import type { TrendRadarFeed } from "@/lib/trendradar";
import type { WeeklyBriefResult } from "@/lib/weekly-intelligence";

type DisplayStory = {
  id: string;
  rank: number;
  title: string;
  source: string;
  topic: string;
  impact: "High" | "Medium" | "Watch";
  signal: string;
  summary: string;
  whyItMatters: string;
  consultant: string;
  executive: string;
  confidence: number;
  url: string | null;
};

function briefStoriesToDisplay(brief: WeeklyBriefResult | null): DisplayStory[] {
  if (!brief?.brief.stories?.length) return stories.map((item) => ({ ...item, url: null }));
  return brief.brief.stories.map((item, index) => {
    const confidence = Math.round(item.confidence);
    return {
      id: `ai-story-${index + 1}`,
      rank: index + 1,
      title: item.title,
      source: item.source,
      topic: "AI signal",
      impact: confidence >= 80 ? "High" : confidence >= 65 ? "Medium" : "Watch",
      signal: String(index + 1).padStart(2, "0"),
      summary: item.fact,
      whyItMatters: item.capcoImplication,
      consultant: item.capcoImplication,
      executive: item.capcoImplication,
      confidence,
      url: item.url,
    };
  });
}

export function CommandCenter({ trendRadar }: { trendRadar: TrendRadarFeed }) {
  const [audience, setAudience] = useState<Audience>("consultant");
  const [selectedStory, setSelectedStory] = useState(stories[0].id);
  const [visualReady, setVisualReady] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [aiBrief, setAiBrief] = useState<WeeklyBriefResult | null>(null);
  const [synthesizing, setSynthesizing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const displayStories = useMemo(() => briefStoriesToDisplay(aiBrief), [aiBrief]);
  const story = useMemo(() => displayStories.find((item) => item.id === selectedStory) ?? displayStories[0], [displayStories, selectedStory]);
  const trendRadarStatus = trendRadar.source.syncedAt
    ? { label: `${trendRadar.source.totalItems} items synced` }
    : { label: "Awaiting first sync" };

  async function runAISynthesis() {
    setSynthesizing(true);
    setAiError(null);
    try {
      const response = await fetch("/api/weekly-intelligence", { method: "POST" });
      if (!response.ok) throw new Error("Weekly synthesis failed");
      setAiBrief(await response.json() as WeeklyBriefResult);
    } catch {
      setAiError("The weekly synthesis could not be completed. Check the provider configuration and try again.");
    } finally {
      setSynthesizing(false);
    }
  }

  return <>
    <header className="topbar">
      <div><div className="topbar-kicker">Reporting period</div><div className="topbar-period">08–14 September 2026 <Icon name="chevron" size={15} /></div></div>
      <div className="topbar-actions"><div className="status-chip"><span className="status-dot green" /> 5 sources healthy</div><div className="status-chip"><span className="status-dot orange" /> Draft for review</div><div className="topbar-divider" /><div className="audience-toggle" role="group" aria-label="Audience"><button className={audience === "consultant" ? "selected" : ""} onClick={() => setAudience("consultant")}>Consultant</button><button className={audience === "executive" ? "selected" : ""} onClick={() => setAudience("executive")}>Executive</button></div></div>
    </header>
    <div className="page-wrap">
      <section className="hero-block">
        <div className="hero-copy"><div className="section-kicker">Weekly intelligence / 38</div><h1>AI signals <span>/ Week 38</span></h1><p>{edition.outlook}</p><div className="hero-meta"><span>Last refreshed 08:42</span><span className="meta-separator">·</span><span>4 stories selected</span><span className="meta-separator">·</span><span>Confidence 88%</span></div></div>
        <div className="hero-actions"><Link className="button primary" href={`/editions/${edition.id}`}>Review edition <Icon name="arrow" size={16} /></Link><button className="button ghost" onClick={() => setVisualReady(true)}><Icon name="spark" size={16} />{visualReady ? "Visual ready" : "Generate visual"}</button><button className="text-button" onClick={() => setShowEmail(true)}><Icon name="mail" size={16} />Preview email</button></div>
      </section>
      <div className="signal-strip"><div><span className="strip-label">Editorial posture</span><strong>From capability to choreography</strong></div><div><span className="strip-label">TrendRadar feed</span><strong>{trendRadarStatus.label}</strong></div><div><span className="strip-label">Next review</span><strong>Today · 14:00 HKT</strong></div></div>
      <section className={`ai-synthesis panel ${aiBrief ? "ready" : ""}`}><div className="ai-synthesis-copy"><div className="section-kicker">AI synthesis / weekly communication</div><h2>{aiBrief?.brief.headline ?? "Turn the feed into a Capco point of view"}</h2><p>{aiBrief?.brief.capcoPerspective ?? `AI will select the strongest signals from ${trendRadar.source.totalItems} TrendRadar items, ground the claims in source links, and shape the implications for Capco clients.`}</p>{aiBrief && <div className="ai-meta"><span><i className={`status-dot ${aiBrief.meta.provider === "fallback" ? "orange" : "green"}`} />{aiBrief.meta.provider === "fallback" ? "Grounded local draft" : `Generated with ${aiBrief.meta.model}`}</span><span>{aiBrief.meta.groundedItems} items grounded</span><span>{aiBrief.meta.groundedSources} sources</span>{aiBrief.meta.providerError && <span>Provider unavailable · local draft used</span>}</div>}{aiError && <div className="ai-error">{aiError}</div>}</div><div className="ai-synthesis-action"><div className="ai-badge"><Icon name="spark" size={15} /><span>{aiBrief ? "Brief ready for review" : "Model-assisted"}</span></div><button className="button primary" onClick={runAISynthesis} disabled={synthesizing}>{synthesizing ? "Synthesizing…" : aiBrief ? "Regenerate brief" : "Run AI synthesis"} <Icon name="arrow" size={16} /></button>{aiBrief && <Link href={`/editions/${edition.id}`} className="text-button">Open review workspace <Icon name="arrow" size={14} /></Link>}</div></section>
      <section className="communication-panel panel"><div className="communication-main"><div className="section-kicker">AI output / editorial draft</div><h2>{aiBrief ? "A weekly communication you can send" : "The weekly communication appears here"}</h2><p>{aiBrief?.brief.thesis ?? "Run the synthesis to create the short thesis, Capco implications, actions, and citations that will flow into the edition and email preview."}</p>{aiBrief && <div className="action-list"><span className="detail-label">Recommended next moves</span>{aiBrief.brief.actions.map((action) => <div className="action-item" key={action}><span className="action-mark"><Icon name="check" size={12} /></span><span>{action}</span></div>)}</div>}</div><div className="communication-brief"><div className="detail-label">Infographic brief</div><h3>{aiBrief?.brief.infographic.title ?? "Signal → governed action"}</h3><p>{aiBrief?.brief.infographic.subtitle ?? "The image model will receive the visual direction after the editorial brief is ready."}</p><div className="brief-sections">{(aiBrief?.brief.infographic.sections ?? ["Signal", "Interpretation", "Decision rights", "Control points", "Client action"]).map((section) => <span key={section}>{section}</span>)}</div><div className="ai-pipeline"><span><Icon name="rss" size={13} /> TrendRadar</span><Icon name="arrow" size={13} /><span><Icon name="spark" size={13} /> Synthesis</span><Icon name="arrow" size={13} /><span><Icon name="layers" size={13} /> Artwork</span></div></div></section>
      <div className="dashboard-grid">
        <section className="stories-panel panel"><div className="panel-header"><div><div className="section-kicker">01 / {aiBrief ? "AI-selected signals" : "Ranked signals"}</div><h2>What changed this week</h2></div><div className="panel-index">{displayStories.length} stories</div></div><div className="story-list">{displayStories.map((item) => <button className={`story-row ${selectedStory === item.id ? "selected" : ""}`} key={item.id} onClick={() => setSelectedStory(item.id)}><span className="story-rank">{item.signal}</span><span className="story-main"><span className="story-title">{item.title}</span><span className="story-source">{item.source} <span>·</span> {item.topic}</span></span><span className={`impact ${item.impact.toLowerCase()}`}>{item.impact}</span><Icon name="arrow" size={16} /></button>)}</div>{story && <div className="selected-story-detail"><div className="detail-label">Selected signal · {story.source}</div><h3>{story.title}</h3><p>{story.summary}</p><div className="detail-insight"><span>WHY IT MATTERS FOR CAPCO</span><strong>{story.whyItMatters}</strong></div>{story.url ? <a href={story.url} target="_blank" rel="noreferrer" className="inline-link">Open source article <Icon name="external" size={14} /></a> : <Link href={`/editions/${edition.id}?story=${story.id}`} className="inline-link">Open in review <Icon name="arrow" size={14} /></Link>}</div>}</section>
        <section className="workflow-panel panel"><div className="panel-header"><div><div className="section-kicker">02 / Workflow translation</div><h2>How this changes the work</h2></div><span className="panel-index">01—05</span></div><p className="panel-intro">The editorial readout translated into the operating motion a client can act on next.</p><WorkflowDiagram /><div className="workflow-footer"><span>Signal in</span><span>Decision path</span><span>Value out</span></div></section>
      </div>
      <section className="visual-panel panel"><div className="panel-header"><div><div className="section-kicker">03 / Infographic output</div><h2>{aiBrief?.brief.infographic.title ?? "Operating model / signal to action"}</h2></div><div className="visual-header-actions"><span className="template-tag">16:9 · AI brief → artwork</span><Link href="/infographics/operating-model" className="text-button">Open editor <Icon name="arrow" size={15} /></Link></div></div><div className="infographic-preview"><div className="preview-art"><div className="preview-rings" /><div className="preview-kicker">CAPCO / AI INTELLIGENCE</div><div className="preview-title">{aiBrief ? aiBrief.brief.infographic.title : <>The model is<br /><em>the message.</em></>}</div><div className="preview-caption">{aiBrief?.brief.infographic.subtitle ?? "Five moves from signal to governed action."}</div><div className="preview-footer"><span>WEEK 38 / 2026</span><span>01—05</span></div></div><div className="preview-copy"><div className="preview-copy-label">Exact overlay copy</div><h3>{visualReady ? "Artwork variant selected" : aiBrief ? "Brief is ready for image generation" : "Visual direction ready"}</h3><p>{aiBrief?.brief.infographic.visualDirection ?? "Abstract systems, a clear decision path, and reserved zones for exact copy keep the visual expressive without outsourcing facts to the image model."}</p><div className="preview-stats"><div><span>Artwork</span><strong>{visualReady ? "Generated" : "Briefed"}</strong></div><div><span>Overlay</span><strong>Deterministic</strong></div><div><span>Sources</span><strong>{aiBrief ? `${aiBrief.meta.groundedSources} cited` : "4 cited"}</strong></div></div><Link href="/infographics/operating-model" className="button dark">Inspect canvas <Icon name="arrow" size={16} /></Link></div></div></section>
      <footer className="page-footer"><span>Capco AI Intelligence Workspace</span><span>Model run 2026.09.14 · grounded on 4 sources</span></footer>
    </div>
    {showEmail && <div className="modal-backdrop" onClick={() => setShowEmail(false)}><div className="email-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><div className="section-kicker">Preview / {audience} · {aiBrief ? "AI-generated draft" : "sample draft"}</div><h2>Weekly edition email</h2></div><button className="icon-button" onClick={() => setShowEmail(false)} aria-label="Close"><Icon name="close" size={18} /></button></div><div className="email-preview"><div className="email-masthead"><span>CAPCO</span><span>AI SIGNALS / WEEK 38</span></div><h3>{aiBrief?.brief.headline ?? (audience === "consultant" ? "Four signals to take into client conversations" : "The operating model is the AI strategy")}</h3><p>{aiBrief ? aiBrief.brief.capcoPerspective : audience === "consultant" ? story.consultant : story.executive}</p>{aiBrief && <div className="email-thesis"><span>WEEKLY THESIS</span><strong>{aiBrief.brief.thesis}</strong></div>}<div className="email-rule" />{displayStories.slice(0, 3).map((item) => <div className="email-item" key={item.id}><span>{item.signal}</span><div><strong>{item.title}</strong><p>{audience === "consultant" ? item.consultant : item.executive}</p></div></div>)}</div><div className="modal-footer"><button className="button primary" onClick={() => setShowEmail(false)}>Looks good <Icon name="check" size={16} /></button><button className="text-button" onClick={() => setShowEmail(false)}>Back to workspace</button></div></div></div>}
  </>;
}
