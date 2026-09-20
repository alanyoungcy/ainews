"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell/AppShell";
import { edition, stories, type Audience } from "@/lib/demo-data";
import { Icon } from "@/components/ui/Icon";
import type { WeeklyBriefResult } from "@/lib/weekly-intelligence";

export default function EditionPage() {
  const [audience, setAudience] = useState<Audience>("consultant");
  const [approved, setApproved] = useState<string[]>([]);
  const [selected, setSelected] = useState(stories[0].id);
  const [aiBrief, setAiBrief] = useState<WeeklyBriefResult | null>(null);
  useEffect(() => {
    fetch("/api/weekly-intelligence", { method: "POST" })
      .then((response) => response.ok ? response.json() as Promise<WeeklyBriefResult> : null)
      .then((result) => { if (result) setAiBrief(result); })
      .catch(() => undefined);
  }, []);
  const reviewStories = useMemo(() => aiBrief?.brief.stories.map((story, index) => ({
    id: `ai-story-${index + 1}`,
    signal: String(index + 1).padStart(2, "0"),
    title: story.title,
    source: story.source,
    topic: "AI signal",
    impact: story.confidence >= 80 ? "High" : story.confidence >= 65 ? "Medium" : "Watch",
    confidence: Math.round(story.confidence),
    published: "This week",
    consultant: story.capcoImplication,
    executive: story.capcoImplication,
    whyItMatters: story.capcoImplication,
    url: story.url,
  })) ?? stories.map((story) => ({ ...story, url: null })), [aiBrief]);
  const active = reviewStories.find((story) => story.id === selected) ?? reviewStories[0];
  return <AppShell><header className="topbar"><div><div className="topbar-kicker">Edition review</div><div className="topbar-period">{edition.period}</div></div><div className="topbar-actions"><div className="status-chip"><span className="status-dot orange" /> {approved.length}/{reviewStories.length} approved</div><div className="audience-toggle"><button className={audience === "consultant" ? "selected" : ""} onClick={() => setAudience("consultant")}>Consultant</button><button className={audience === "executive" ? "selected" : ""} onClick={() => setAudience("executive")}>Executive</button></div></div></header><div className="page-wrap review-page"><div className="review-heading"><div><div className="section-kicker">Weekly edition / {edition.id}</div><h1>Review the story set</h1><p>{aiBrief ? "AI-selected TrendRadar signals with Capco implications, ready for human approval." : "Shape the source material into a concise, audience-ready edition before approval."}</p></div><div className="review-actions"><span className="status-chip"><span className={`status-dot ${aiBrief ? "green" : "orange"}`} /> {aiBrief ? `${aiBrief.meta.provider === "fallback" ? "Grounded local draft" : `Generated with ${aiBrief.meta.model}`}` : "Loading AI brief"}</span><button className="button primary" onClick={() => setApproved(reviewStories.map((story) => story.id))}><Icon name="check" size={16} />Approve edition</button></div></div><div className="review-grid"><section className="review-list panel"><div className="panel-header"><div><div className="section-kicker">Story set</div><h2>{reviewStories.length} selected stories</h2></div><span className="panel-index">{approved.length} approved</span></div>{reviewStories.map((story) => <button key={story.id} className={`review-row ${selected === story.id ? "selected" : ""}`} onClick={() => setSelected(story.id)}><span className="story-rank">{story.signal}</span><span className="review-row-copy"><strong>{story.title}</strong><span>{story.source} · {story.topic}</span></span><span className={`review-status ${approved.includes(story.id) ? "approved" : "pending"}`}>{approved.includes(story.id) ? "Approved" : "Review"}</span><Icon name="chevron" size={16} /></button>)}</section><section className="editor-panel panel"><div className="panel-header"><div><div className="section-kicker">Selected story · {active.source}</div><h2>{active.title}</h2></div><span className={`impact ${active.impact.toLowerCase()}`}>{active.impact} impact</span></div><div className="editor-meta"><span>Confidence {active.confidence}%</span><span>Published {active.published}</span><span>Topic {active.topic}</span></div><label className="field-label">{audience === "consultant" ? "Consultant summary" : "Executive summary"}<textarea defaultValue={audience === "consultant" ? active.consultant : active.executive} rows={5} /></label><label className="field-label">Why it matters<textarea defaultValue={active.whyItMatters} rows={3} /></label><div className="citation-block"><div className="citation-title">Grounding & citations</div><div className="citation-row"><span className="citation-check"><Icon name="check" size={13} /></span><span>Claim references {active.source}</span><span className="citation-confidence">{active.confidence}% confidence</span></div><div className="citation-link"><Icon name="external" size={14} />{active.url ? <a href={active.url} target="_blank" rel="noreferrer">Open source article</a> : "Source article / opened in a review tab"}</div></div><div className="editor-footer"><button className="text-button danger">Remove story</button><div><button className="button ghost">Save draft</button><button className="button primary" onClick={() => setApproved((current) => current.includes(active.id) ? current : [...current, active.id])}>{approved.includes(active.id) ? "Approved" : "Approve story"} <Icon name="check" size={16} /></button></div></div></section></div></div></AppShell>;
}
