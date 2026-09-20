"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { edition, stories, type Audience } from "@/lib/demo-data";
import { Icon } from "@/components/ui/Icon";
import { WorkflowDiagram } from "@/components/workflow/WorkflowDiagram";
import type { TrendRadarFeed } from "@/lib/trendradar";

export function CommandCenter({ trendRadar }: { trendRadar: TrendRadarFeed }) {
  const [audience, setAudience] = useState<Audience>("consultant");
  const [selectedStory, setSelectedStory] = useState(stories[0].id);
  const [visualReady, setVisualReady] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const story = useMemo(() => stories.find((item) => item.id === selectedStory) ?? stories[0], [selectedStory]);
  const trendRadarStatus = trendRadar.source.syncedAt
    ? { label: `${trendRadar.source.totalItems} items synced` }
    : { label: "Awaiting first sync" };

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
      <div className="dashboard-grid">
        <section className="stories-panel panel"><div className="panel-header"><div><div className="section-kicker">01 / Ranked signals</div><h2>What changed this week</h2></div><button className="icon-button" aria-label="Refresh stories"><Icon name="refresh" size={17} /></button></div><div className="story-list">{stories.map((item) => <button className={`story-row ${selectedStory === item.id ? "selected" : ""}`} key={item.id} onClick={() => setSelectedStory(item.id)}><span className="story-rank">{item.signal}</span><span className="story-main"><span className="story-title">{item.title}</span><span className="story-source">{item.source} <span>·</span> {item.topic}</span></span><span className={`impact ${item.impact.toLowerCase()}`}>{item.impact}</span><Icon name="arrow" size={16} /></button>)}</div><div className="selected-story-detail"><div className="detail-label">Selected signal · {story.source}</div><h3>{story.title}</h3><p>{story.summary}</p><div className="detail-insight"><span>WHY IT MATTERS</span><strong>{story.whyItMatters}</strong></div><Link href={`/editions/${edition.id}?story=${story.id}`} className="inline-link">Open in review <Icon name="arrow" size={14} /></Link></div></section>
        <section className="workflow-panel panel"><div className="panel-header"><div><div className="section-kicker">02 / Workflow translation</div><h2>How this changes the work</h2></div><span className="panel-index">01—05</span></div><p className="panel-intro">The editorial readout translated into the operating motion a client can act on next.</p><WorkflowDiagram /><div className="workflow-footer"><span>Signal in</span><span>Decision path</span><span>Value out</span></div></section>
      </div>
      <section className="visual-panel panel"><div className="panel-header"><div><div className="section-kicker">03 / Infographic output</div><h2>Operating model / signal to action</h2></div><div className="visual-header-actions"><span className="template-tag">16:9 · Operating model</span><Link href="/infographics/operating-model" className="text-button">Open editor <Icon name="arrow" size={15} /></Link></div></div><div className="infographic-preview"><div className="preview-art"><div className="preview-rings" /><div className="preview-kicker">CAPCO / AI INTELLIGENCE</div><div className="preview-title">The model is<br /><em>the message.</em></div><div className="preview-caption">Five moves from signal to governed action.</div><div className="preview-footer"><span>WEEK 38 / 2026</span><span>01—05</span></div></div><div className="preview-copy"><div className="preview-copy-label">Exact overlay copy</div><h3>{visualReady ? "Artwork variant selected" : "Visual direction ready"}</h3><p>Abstract systems, a clear decision path, and reserved zones for exact copy keep the visual expressive without outsourcing facts to the image model.</p><div className="preview-stats"><div><span>Artwork</span><strong>{visualReady ? "Generated" : "Briefed"}</strong></div><div><span>Overlay</span><strong>Deterministic</strong></div><div><span>Sources</span><strong>4 cited</strong></div></div><Link href="/infographics/operating-model" className="button dark">Inspect canvas <Icon name="arrow" size={16} /></Link></div></div></section>
      <footer className="page-footer"><span>Capco AI Intelligence Workspace</span><span>Model run 2026.09.14 · grounded on 4 sources</span></footer>
    </div>
    {showEmail && <div className="modal-backdrop" onClick={() => setShowEmail(false)}><div className="email-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><div className="section-kicker">Preview / {audience}</div><h2>Weekly edition email</h2></div><button className="icon-button" onClick={() => setShowEmail(false)} aria-label="Close"><Icon name="close" size={18} /></button></div><div className="email-preview"><div className="email-masthead"><span>CAPCO</span><span>AI SIGNALS / WEEK 38</span></div><h3>{audience === "consultant" ? "Four signals to take into client conversations" : "The operating model is the AI strategy"}</h3><p>{audience === "consultant" ? story.consultant : story.executive}</p><div className="email-rule" />{stories.slice(0, 3).map((item) => <div className="email-item" key={item.id}><span>{item.signal}</span><div><strong>{item.title}</strong><p>{audience === "consultant" ? item.consultant : item.executive}</p></div></div>)}</div><div className="modal-footer"><button className="button primary" onClick={() => setShowEmail(false)}>Looks good <Icon name="check" size={16} /></button><button className="text-button" onClick={() => setShowEmail(false)}>Back to workspace</button></div></div></div>}
  </>;
}
