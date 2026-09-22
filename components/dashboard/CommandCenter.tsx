"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { TrendRadarFeed, TrendRadarItem } from "@/lib/trendradar";
import { selectWeeklyCandidates, type WeeklyBriefResult } from "@/lib/weekly-intelligence";
import type { JevTriageScore } from "@/lib/jev-triage.server";

type QueueStory = {
  id: string;
  title: string;
  source: string;
  url: string | null;
  summary: string;
  topic: string;
  impact: "High" | "Medium" | "Watch";
  confidence: number;
  signal: string;
  published: string;
  implication: string;
  kind: "feed" | "ai";
  jevScore?: JevTriageScore;
};

const UTC_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatUtcDate(value: string | null, withTime = false) {
  if (!value) return withTime ? "Awaiting first sync" : "Today";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return withTime ? "Unknown snapshot time" : "Unknown";
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = UTC_MONTHS[date.getUTCMonth()];
  if (!withTime) return `${day} ${month}`;
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  return `${day} ${month} ${date.getUTCFullYear()}, ${hours}:${minutes}:${seconds} UTC`;
}

function feedStory(item: TrendRadarItem, index: number, jevScore?: JevTriageScore): QueueStory {
  const text = `${item.title} ${item.summary ?? ""}`;
  const confidence = jevScore?.composite ?? (item.kind === "rss" ? 86 : item.rank && item.rank < 20 ? 82 : 74);
  return {
    id: `feed-${item.id}`,
    title: item.title,
    source: item.source,
    url: item.url,
    summary: item.summary || "TrendRadar ranked this signal among the current feed. It is ready for editorial triage and Capco relevance review.",
    topic: /risk|security|governance|regulat/i.test(text) ? "Risk & governance" : /agent|model|llm|ai|robot|inference/i.test(text) ? "AI platforms" : "Technology",
    impact: jevScore ? jevScore.capcoImpact.score >= 72 ? "High" : jevScore.capcoImpact.score >= 45 ? "Medium" : "Watch" : confidence >= 84 ? "High" : confidence >= 78 ? "Medium" : "Watch",
    confidence,
    signal: String(index + 1).padStart(2, "0"),
    published: formatUtcDate(item.publishedAt),
    implication: "Help the client translate the visible AI signal into a decision about operating model, ownership, controls, or customer experience.",
    kind: "feed",
    jevScore,
  };
}

function briefStory(story: WeeklyBriefResult["brief"]["stories"][number], index: number): QueueStory {
  const confidence = Math.round(story.confidence);
  return {
    id: `ai-story-${index + 1}`,
    title: story.title,
    source: story.source,
    url: story.url,
    summary: story.fact,
    topic: "AI signal",
    impact: confidence >= 80 ? "High" : confidence >= 65 ? "Medium" : "Watch",
    confidence,
    signal: String(index + 1).padStart(2, "0"),
    published: "This week",
    implication: story.capcoImplication,
    kind: "ai",
  };
}

export function CommandCenter({ trendRadar }: { trendRadar: TrendRadarFeed }) {
  const [feed, setFeed] = useState(trendRadar);
  const [aiBrief, setAiBrief] = useState<WeeklyBriefResult | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [includedIds, setIncludedIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [signalFilter, setSignalFilter] = useState("All signals");
  const [synthesizing, setSynthesizing] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [showAllStories, setShowAllStories] = useState(false);
  const [jevScores, setJevScores] = useState<Record<string, JevTriageScore>>({});
  const [jevStatus, setJevStatus] = useState<"loading" | "ready" | "fallback" | "error">("loading");
  const [jevModel, setJevModel] = useState("jev-latest");
  const [sentThisWeek, setSentThisWeek] = useState<boolean | null>(null);

  async function rankWithJev() {
    setJevStatus("loading");
    try {
      const response = await fetch("/api/triage-rank", { method: "POST", cache: "no-store" });
      if (!response.ok) throw new Error("Jev triage ranking failed");
      const result = await response.json() as { scores?: JevTriageScore[]; model?: string };
      const scores = result.scores ?? [];
      setJevScores(Object.fromEntries(scores.map((score) => [score.itemId, score])));
      setJevModel(result.model ?? "jev-latest");
      setJevStatus(scores.some((score) => score.model === "local-triage-fallback") ? "fallback" : "ready");
    } catch {
      setJevStatus("error");
    }
  }

  useEffect(() => { void rankWithJev(); }, []);

  useEffect(() => {
    const openPreview = () => setShowEmail(true);
    window.addEventListener("open-email-preview", openPreview);
    return () => window.removeEventListener("open-email-preview", openPreview);
  }, []);

  useEffect(() => {
    if (feed.items.length === 0) void syncLatestFeed();
    void fetch("/api/edition-status", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((status: { sentThisWeek?: boolean } | null) => setSentThisWeek(status?.sentThisWeek ?? false)).catch(() => setSentThisWeek(null));
  }, [feed.items.length]);

  const jevOrderedItems = useMemo(() => [...feed.items].sort((a, b) => (jevScores[b.id]?.composite ?? -1) - (jevScores[a.id]?.composite ?? -1)), [feed.items, jevScores]);
  const sourceCandidates = useMemo(() => showAllStories ? jevOrderedItems : jevScores && Object.keys(jevScores).length ? jevOrderedItems.slice(0, 8) : selectWeeklyCandidates(feed, 8), [feed, jevOrderedItems, jevScores, showAllStories]);
  const queueStories = useMemo(() => aiBrief ? aiBrief.brief.stories.map(briefStory) : sourceCandidates.map((item, index) => feedStory(item, index, jevScores[item.id])), [aiBrief, sourceCandidates, jevScores]);
  const visibleStories = useMemo(() => queueStories.filter((story) => {
    const matchesQuery = !query || `${story.title} ${story.source} ${story.summary}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = signalFilter === "All signals" || story.topic === signalFilter;
    return matchesQuery && matchesFilter;
  }), [queueStories, query, signalFilter]);
  const selected = visibleStories.find((story) => story.id === selectedId) ?? visibleStories[0] ?? queueStories[0];

  async function runAISynthesis() {
    setSynthesizing(true);
    setAiError(null);
    try {
      const response = await fetch("/api/weekly-intelligence", { method: "POST" });
      if (!response.ok) throw new Error("Weekly synthesis failed");
      const result = await response.json() as WeeklyBriefResult;
      setAiBrief(result);
      setSelectedId("ai-story-1");
      setIncludedIds(result.brief.stories.slice(0, 3).map((_, index) => `ai-story-${index + 1}`));
    } catch {
      setAiError("The weekly synthesis could not be completed. Check the provider configuration and try again.");
    } finally {
      setSynthesizing(false);
    }
  }

  async function syncLatestFeed() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const response = await fetch("/api/trendradar", { method: "POST", cache: "no-store" });
      if (!response.ok) throw new Error("TrendRadar sync failed");
      const latest = await response.json() as TrendRadarFeed & { sync?: { added: number; successful: string[]; failed: string[]; attempted: number } };
      setFeed(latest);
      setAiBrief(null);
      setJevScores({});
      void rankWithJev();
      setSelectedId("");
      setIncludedIds([]);
      const failed = latest.sync?.failed.length ?? 0;
      const failedNames = latest.sync?.failed.slice(0, 2).map((item) => item.split(":")[0]).join(", ");
      setSyncMessage(`${latest.source.totalItems} stories loaded · ${latest.sync?.added ?? 0} new RSS items · ${failed ? `${failed} feeds unavailable${failedNames ? ` (${failedNames})` : ""}` : `${latest.sync?.successful.length ?? 0} feeds refreshed`}`);
    } catch {
      setSyncMessage("Could not load the latest TrendRadar snapshot.");
    } finally {
      setSyncing(false);
    }
  }

  function toggleIncluded(id: string) {
    setIncludedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  const providerLabel = aiBrief?.meta.provider === "openai-compatible" ? `Generated with ${aiBrief.meta.model}` : aiBrief ? "Grounded local draft" : jevStatus === "ready" ? `${jevModel} triage ranking active` : jevStatus === "fallback" ? "Local triage fallback active" : "Awaiting Jev triage ranking";

  return <>
    {sentThisWeek !== null && <div className={`edition-reminder ${sentThisWeek ? "sent" : "open"}`}><Icon name={sentThisWeek ? "check" : "mail"} size={15} /><span>{sentThisWeek ? "You already sent an AI intelligence edition this week." : "No edition has been sent this week yet."}</span><small>{sentThisWeek ? "You can continue editing or start a new unscheduled edition." : "The edition stays open until you authorize dispatch."}</small></div>}
    <div className="pipeline-indicator"><div><span className="pipeline-kicker">Editorial pipeline</span><span className="pipeline-slash">/</span><span className="pipeline-stage">Stage 01: Live repository</span><span className="pipeline-slash">/</span><span className="pipeline-live"><i /> Streaming {feed.source.platformCount || 11} source channels</span></div><div><span>EDITION:</span><strong>OPEN / UNSCHEDULED</strong><span className="updated-chip">Updated {feed.source.crawlTime ?? "today"}</span></div></div>
    <div className="triage-page">
      <section className="triage-heading"><div><h1>Automated Source Ingestion &amp; Content Triage</h1><p>Continuous multi-feed ingestion from TrendRadar with AI relevance scoring, Capco context, and human approval before editorial synthesis.</p></div><div className="triage-heading-actions"><button className="button ghost small" onClick={syncLatestFeed} disabled={syncing}><Icon name="refresh" size={15} /> {syncing ? "Syncing latest…" : "Sync latest TrendRadar"}</button><div className="parser-health"><Icon name="check" size={15} /> Parsers: 100% OK</div><div className="language-health"><Icon name="check" size={14} /> English-only</div></div></section>
      <section className="kpi-grid"><div className="kpi-card"><div><span>Ingested stories</span><Icon name="rss" size={17} /></div><strong>{feed.source.totalItems}</strong><small>{feed.source.rssItems} RSS · {feed.source.hotListItems} ranked signals</small></div><div className="kpi-card"><div><span>Fact grounding confidence</span><Icon name="check" size={17} /></div><strong>{aiBrief ? "82%" : "—"}</strong><small>{aiBrief ? `${aiBrief.meta.groundedSources} source groups grounded` : "Run synthesis to score claims"}</small></div><div className="kpi-card"><div><span>Edition curation progress</span><Icon name="layers" size={17} /></div><strong>{includedIds.length}<em> / 8</em></strong><div className="progress-track"><i style={{ width: `${Math.min(100, includedIds.length / 8 * 100)}%` }} /></div><small>Target: 8 stories · {Math.round(Math.min(100, includedIds.length / 8 * 100))}% quota</small></div><div className="kpi-card"><div><span>Pipeline status</span><Icon name="refresh" size={17} /></div><strong>{syncing ? "Syncing" : "Ready"}</strong><small>{feed.source.syncedAt ? `Snapshot synced ${formatUtcDate(feed.source.syncedAt, true)}` : "Awaiting first sync"}</small></div></section>
      <section className="triage-controls"><div className="triage-search"><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ingested stories, sources, or citations..." /><span>⌘K</span></div><div className="triage-actions"><button className="button utility" onClick={() => setIncludedIds(visibleStories.map((story) => story.id))}><Icon name="check" size={15} /> Include visible</button><button className="button utility" onClick={() => setIncludedIds([])}><Icon name="close" size={15} /> Clear selection</button><button className="button utility danger" onClick={() => { setQuery(""); setSignalFilter("All signals"); }}><Icon name="refresh" size={15} /> Reset filters</button></div><div className="triage-filters"><span>Signal:</span>{["All signals", "AI platforms", "Risk & governance", "Technology"].map((filter) => <button className={signalFilter === filter ? "selected" : ""} key={filter} onClick={() => setSignalFilter(filter)}>{filter}</button>)}</div></section>
      <section className="triage-grid"><div className="queue-column"><div className="queue-heading"><div><h2>Ingested stories</h2><span>{showAllStories ? "All TrendRadar items" : "Curated top signals"} · sorted by {aiBrief ? "AI relevance" : "TrendRadar ranking"}</span></div><div className="queue-heading-actions"><span>Showing {visibleStories.length} of {queueStories.length} items</span><button className="button utility" onClick={() => setShowAllStories((current) => !current)}>{showAllStories ? "Show curated 8" : `Show all ${feed.source.totalItems}`}</button></div></div>{visibleStories.map((story) => <article className={`queue-card ${selected?.id === story.id ? "selected" : ""}`} key={story.id} onClick={() => setSelectedId(story.id)}><div className="queue-accent" /><div className="queue-card-main"><div className="queue-tags"><span className="topic-tag">{story.topic}</span><span className={`impact-tag ${story.impact.toLowerCase()}`}>Impact: {story.impact}</span><span className="grounding-tag"><Icon name="check" size={12} /> Grounding: {story.confidence}%</span><span>{story.published} · {story.source}</span></div><h3>{story.title}</h3><p>{story.summary}</p><div className="queue-meta"><span>Relevance: {story.confidence}/100</span>{story.url && <span>Source link available</span>}<span className="inspect-link">{selected?.id === story.id ? "Inspector open" : "Inspect source"} <Icon name="arrow" size={14} /></span></div></div><div className="queue-card-action"><button className={includedIds.includes(story.id) ? "include-button included" : "include-button"} onClick={(event) => { event.stopPropagation(); toggleIncluded(story.id); }}><Icon name={includedIds.includes(story.id) ? "check" : "plus"} size={14} />{includedIds.includes(story.id) ? "Included" : "Select"}</button><small>{includedIds.includes(story.id) ? `Slot ${String(includedIds.indexOf(story.id) + 1).padStart(2, "0")} / 08` : "Candidate"}</small></div></article>)}</div><aside className="triage-inspector"><div className="inspector-header"><div><span className="inspector-icon"><Icon name="spark" size={17} /></span><div><strong>AI triage assessment</strong><small>{aiBrief ? providerLabel : "Inspector active · awaiting synthesis"}</small></div></div><span className="match-score">{selected ? `${selected.confidence}% match` : "—"}</span></div>{selected ? <><div className="focus-card"><div>{selected.published} · {selected.source}</div><h2>{selected.title}</h2><span>{selected.topic} · {selected.kind === "ai" ? "AI-selected" : "TrendRadar candidate"}</span></div><div className="claims-block"><span className="inspector-label">Extracted core claims &amp; metrics</span><div className="claim-grid"><div><small>Relevance</small><strong>{selected.confidence}/100</strong><span>Signal fit for the edition</span></div><div><small>Source type</small><strong>{selected.kind === "ai" ? "AI" : "Feed"}</strong><span>{selected.source}</span></div></div><div className="claim-note"><Icon name="check" size={17} /><div><strong>Capco relevance</strong><span>{selected.implication}</span></div></div></div><div className="angle-card"><div><span>Capco editorial angle</span><small>{aiBrief ? "AI-generated recommendation" : "Editorial framing"}</small></div><p>{selected.implication}</p></div><div className="verification-row"><div><Icon name="check" size={19} /><span><strong>Source origin verified</strong><small>Link and feed metadata available</small></span></div>{selected.url && <a href={selected.url} target="_blank" rel="noreferrer">View source</a>}</div><div className="inspector-actions"><button className="button primary full" onClick={aiBrief ? () => { window.location.href = "/editions/week-42-2026"; } : runAISynthesis}><Icon name="check" size={16} />{aiBrief ? "Push to editorial synthesis" : synthesizing ? "Synthesizing…" : "Run AI triage & synthesis"}</button><div><button className="button utility" onClick={() => toggleIncluded(selected.id)}>{includedIds.includes(selected.id) ? "Remove from batch" : "Add to batch"}</button><button className="button utility danger" onClick={() => setSelectedId(visibleStories.find((story) => story.id !== selected.id)?.id ?? selected.id)}>Discard</button></div></div></> : <div className="empty-inspector">Select a signal from the queue to inspect its grounding and Capco relevance.</div>}</aside></section>
    </div>
    <div className="handoff-bar"><div><strong>{includedIds.length} of 8 stories confirmed</strong><span>for the current editorial batch</span><small>TrendRadar snapshot · {feed.source.totalItems} items · {providerLabel}</small></div><div><button className="button utility">Save draft repository</button><button className="button dark" onClick={runAISynthesis} disabled={synthesizing}>{synthesizing ? "Synthesizing…" : aiBrief ? "Regenerate AI brief" : "Advance to Stage 02"}<Icon name="arrow" size={16} /></button></div></div>
    {syncMessage && <div className={`sync-toast ${syncMessage.startsWith("Could") ? "error" : ""}`}><Icon name={syncMessage.startsWith("Could") ? "close" : "check"} size={14} />{syncMessage}</div>}
    {aiError && <div className="toast-error">{aiError}</div>}
    {showEmail && <div className="modal-backdrop" onClick={() => setShowEmail(false)}><div className="email-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><div className="section-kicker">Preview / consultant · {aiBrief ? "AI-generated draft" : "sample draft"}</div><h2>Weekly edition email</h2></div><button className="icon-button" onClick={() => setShowEmail(false)} aria-label="Close"><Icon name="close" size={18} /></button></div><div className="email-preview"><div className="email-masthead"><span>CAPCO</span><span>AI SIGNALS / WEEK 38</span></div><h3>{aiBrief?.brief.headline ?? "Run synthesis to create the weekly communication"}</h3><p>{aiBrief?.brief.capcoPerspective ?? "The email preview will use the approved AI brief, Capco perspective, and cited source set."}</p>{aiBrief && <div className="email-thesis"><span>WEEKLY THESIS</span><strong>{aiBrief.brief.thesis}</strong></div>}<div className="email-rule" />{queueStories.slice(0, 3).map((story) => <div className="email-item" key={story.id}><span>{story.signal}</span><div><strong>{story.title}</strong><p>{story.implication}</p></div></div>)}</div><div className="modal-footer"><button className="button primary" onClick={() => setShowEmail(false)}>Looks good <Icon name="check" size={16} /></button><button className="text-button" onClick={() => setShowEmail(false)}>Back to workspace</button></div></div></div>}
  </>;
}
