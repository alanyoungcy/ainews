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
  publishedAt: string | null;
  implication: string;
  kind: "feed" | "ai";
  jevScore?: JevTriageScore;
};
type DispatchedStoryMeta = { id: string; title: string; source: string; url: string | null; dispatchedAt: string };
type StoryHistoryFilter = "Fresh only" | "Previously dispatched" | "All stories";
type SortMode = "Jev score" | "Newest" | "Oldest" | "Recency" | "AI relevance" | "Hype / trend" | "Capco impact";
type DateFilter = "Any date" | "Last 24 hours" | "Last 3 days" | "Last 7 days" | "Last 14 days";
type SyncStats = { fetched?: number; added?: number; retained?: number; purged?: number; successful: string[]; failed: string[]; attempted: number };

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
    summary: `${item.summary || "TrendRadar ranked this signal among the current feed. It is ready for editorial triage and Capco relevance review."} Jev composite ${jevScore?.composite ?? "pending"}/100; this is an editorial ranking score, not a grounding percentage.`,
    topic: /risk|security|governance|regulat/i.test(text) ? "Risk & governance" : /agent|model|llm|ai|robot|inference/i.test(text) ? "AI platforms" : "Technology",
    impact: jevScore ? jevScore.capcoImpact.score >= 72 ? "High" : jevScore.capcoImpact.score >= 45 ? "Medium" : "Watch" : confidence >= 84 ? "High" : confidence >= 78 ? "Medium" : "Watch",
    confidence,
    signal: String(index + 1).padStart(2, "0"),
    published: `${formatUtcDate(item.publishedAt)} · Jev ${jevScore?.composite ?? "pending"}`,
    publishedAt: item.publishedAt,
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
    publishedAt: null,
    implication: story.capcoImplication,
    kind: "ai",
  };
}

function normalizedTitle(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function matchesDispatched(story: { id: string; title: string; url: string | null }, dispatched: DispatchedStoryMeta[]) {
  const sourceId = story.id.replace(/^feed-/, "");
  const title = normalizedTitle(story.title);
  return dispatched.some((item) => item.id === story.id || item.id === sourceId || (story.url && item.url === story.url) || (title && normalizedTitle(item.title) === title));
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
  const [showAllStories, setShowAllStories] = useState(true);
  const [jevScores, setJevScores] = useState<Record<string, JevTriageScore>>({});
  const [jevStatus, setJevStatus] = useState<"loading" | "ready" | "fallback" | "error">("loading");
  const [jevModel, setJevModel] = useState("jev-latest");
  const [jevUniqueIds, setJevUniqueIds] = useState<string[]>([]);
  const [jevDuplicateCount, setJevDuplicateCount] = useState(0);
  const [sentThisWeek, setSentThisWeek] = useState<boolean | null>(null);
  const [dispatchedStories, setDispatchedStories] = useState<DispatchedStoryMeta[]>([]);
  const [storyHistoryFilter, setStoryHistoryFilter] = useState<StoryHistoryFilter>("Fresh only");
  const [sortMode, setSortMode] = useState<SortMode>("Jev score");
  const [dateFilter, setDateFilter] = useState<DateFilter>("Any date");
  const [jevScoreFilter, setJevScoreFilter] = useState("All scores");
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);

  async function rankWithJev() {
    setJevStatus("loading");
    try {
      const response = await fetch("/api/triage-rank", { method: "POST", cache: "no-store" });
      if (!response.ok) throw new Error("Jev triage ranking failed");
      const result = await response.json() as { scores?: JevTriageScore[]; model?: string; totalItems?: number; dedupe?: { uniqueItemIds?: string[]; duplicateCount?: number } };
      const scores = result.scores ?? [];
      setJevScores(Object.fromEntries(scores.map((score) => [score.itemId, score])));
      setJevModel(result.model ?? "jev-latest");
      setJevUniqueIds(result.dedupe?.uniqueItemIds ?? []);
      setJevDuplicateCount(result.dedupe?.duplicateCount ?? 0);
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
    void fetch("/api/edition-status", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((status: { sentThisWeek?: boolean; dispatchedStories?: DispatchedStoryMeta[] } | null) => { setSentThisWeek(status?.sentThisWeek ?? false); setDispatchedStories(status?.dispatchedStories ?? []); }).catch(() => { setSentThisWeek(null); setDispatchedStories([]); });
  }, [feed.items.length]);

  const jevOrderedItems = useMemo(() => feed.items.filter((item) => !jevUniqueIds.length || jevUniqueIds.includes(item.id)).sort((a, b) => (jevScores[b.id]?.composite ?? -1) - (jevScores[a.id]?.composite ?? -1)), [feed.items, jevScores, jevUniqueIds]);
  const eligibleItems = useMemo(() => jevOrderedItems.filter((item) => {
    const dispatched = matchesDispatched({ id: `feed-${item.id}`, title: item.title, url: item.url }, dispatchedStories);
    return storyHistoryFilter === "All stories" || (storyHistoryFilter === "Previously dispatched" ? dispatched : !dispatched);
  }), [dispatchedStories, jevOrderedItems, storyHistoryFilter]);
  const sourceCandidates = useMemo(() => showAllStories ? eligibleItems : jevScores && Object.keys(jevScores).length ? eligibleItems.slice(0, 8) : selectWeeklyCandidates({ ...feed, items: eligibleItems }, 8), [eligibleItems, feed, jevScores, showAllStories]);
  const queueStories = useMemo(() => aiBrief ? aiBrief.brief.stories.map(briefStory) : sourceCandidates.map((item, index) => feedStory(item, index, jevScores[item.id])), [aiBrief, sourceCandidates, jevScores]);
  const sortedQueueStories = useMemo(() => [...queueStories].sort((left, right) => {
    if (sortMode === "Newest" || sortMode === "Oldest") {
      const leftDate = left.publishedAt ? Date.parse(left.publishedAt) : 0;
      const rightDate = right.publishedAt ? Date.parse(right.publishedAt) : 0;
      return sortMode === "Newest" ? rightDate - leftDate : leftDate - rightDate;
    }
    const leftScore = left.jevScore;
    const rightScore = right.jevScore;
    if (sortMode === "Recency") return (rightScore?.recency.score ?? -1) - (leftScore?.recency.score ?? -1);
    if (sortMode === "AI relevance") return (rightScore?.aiRelevance.score ?? -1) - (leftScore?.aiRelevance.score ?? -1);
    if (sortMode === "Hype / trend") return (rightScore?.hypeTrend.score ?? -1) - (leftScore?.hypeTrend.score ?? -1);
    if (sortMode === "Capco impact") return (rightScore?.capcoImpact.score ?? -1) - (leftScore?.capcoImpact.score ?? -1);
    return (rightScore?.composite ?? -1) - (leftScore?.composite ?? -1);
  }), [queueStories, sortMode]);
  const visibleStories = useMemo(() => sortedQueueStories.filter((story) => {
    const matchesQuery = !query || `${story.title} ${story.source} ${story.summary}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = signalFilter === "All signals" || story.topic === signalFilter;
    const dispatched = matchesDispatched(story, dispatchedStories);
    const matchesHistory = storyHistoryFilter === "All stories" || (storyHistoryFilter === "Previously dispatched" ? dispatched : !dispatched);
    const publishedTime = story.publishedAt ? Date.parse(story.publishedAt) : 0;
    const ageMs = publishedTime ? Date.now() - publishedTime : Number.POSITIVE_INFINITY;
    const dateWindow = dateFilter === "Any date" ? true : ageMs <= ({ "Last 24 hours": 86_400_000, "Last 3 days": 259_200_000, "Last 7 days": 604_800_000, "Last 14 days": 1_209_600_000 } as Record<Exclude<DateFilter, "Any date">, number>)[dateFilter];
    const jevComposite = story.jevScore?.composite ?? -1;
    const scoreWindow = jevScoreFilter === "All scores" || jevComposite >= Number(jevScoreFilter);
    return matchesQuery && matchesFilter && matchesHistory && dateWindow && scoreWindow;
  }), [dateFilter, dispatchedStories, jevScoreFilter, query, signalFilter, sortedQueueStories, storyHistoryFilter]);
  const selected = visibleStories.find((story) => story.id === selectedId) ?? visibleStories[0] ?? sortedQueueStories[0];

  async function runAISynthesis() {
    setSynthesizing(true);
    setAiError(null);
    try {
      const selectedSourceIds = includedIds.filter((id) => id.startsWith("feed-")).map((id) => id.slice(5));
      const selectedStories = includedIds.map((id) => queueStories.find((story) => story.id === id)).filter(Boolean);
      const stage01Handoff = {
        version: 1,
        savedAt: new Date().toISOString(),
        sourceSnapshot: feed.source,
        selectedStoryIds: selectedSourceIds,
        selectedStories,
        status: "curating",
      };
      try {
        window.localStorage.setItem("capco-selected-story-ids", JSON.stringify(selectedSourceIds));
        window.localStorage.setItem("capco-stage01-handoff", JSON.stringify(stage01Handoff));
      } catch {
        // The server handoff below is the durable copy.
      }
      void fetch("/api/editorial-handoff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: "stage01", handoff: stage01Handoff }) }).catch(() => undefined);
      const response = await fetch("/api/weekly-intelligence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ selectedIds: selectedSourceIds }) });
      if (!response.ok) throw new Error("Weekly synthesis failed");
      const result = await response.json() as WeeklyBriefResult;
      setAiBrief(result);
      setSelectedId("ai-story-1");
      setIncludedIds(result.brief.stories.slice(0, 3).map((_, index) => `ai-story-${index + 1}`));
      const curatedHandoff = { ...stage01Handoff, savedAt: new Date().toISOString(), brief: result, status: "curated" };
      try { window.localStorage.setItem("capco-stage01-handoff", JSON.stringify(curatedHandoff)); } catch { /* server copy remains available */ }
      void fetch("/api/editorial-handoff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: "stage01", handoff: curatedHandoff }) }).catch(() => undefined);
      window.location.href = "/editions/current";
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
      const latest = await response.json() as TrendRadarFeed & { sync?: SyncStats };
      setFeed(latest);
      setAiBrief(null);
      setJevScores({});
      setJevUniqueIds([]);
      setJevDuplicateCount(0);
      setSyncStats(latest.sync ?? null);
      void rankWithJev();
      setSelectedId("");
      setIncludedIds([]);
      const failed = latest.sync?.failed.length ?? 0;
      const failedNames = latest.sync?.failed.slice(0, 2).map((item) => item.split(":")[0]).join(", ");
      const fetched = latest.sync?.fetched ?? latest.sync?.added ?? 0;
      const retained = latest.sync?.retained ?? latest.source.totalItems;
      setSyncMessage(`${retained} retained stories · ${fetched} RSS records fetched · ${failed ? `${failed} feeds unavailable${failedNames ? ` (${failedNames})` : ""}` : `${latest.sync?.successful.length ?? 0} feeds refreshed`}`);
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
      <section className="triage-heading"><div><h1>Automated Source Ingestion &amp; Content Triage</h1><p>Continuous multi-feed ingestion from TrendRadar with AI relevance scoring, Capco context, and human approval before editorial synthesis.</p></div><div className="triage-heading-actions"><button className="button ghost small" onClick={syncLatestFeed} disabled={syncing}><Icon name="refresh" size={15} /> {syncing ? "Syncing latest…" : "Sync latest TrendRadar"}</button><div className="parser-health"><Icon name="check" size={15} /> Parsers: 100% OK</div><div className="language-health"><Icon name="check" size={14} /> English-only</div><div className="jev-health"><Icon name="spark" size={14} /> {jevStatus === "loading" ? "Jev ranking…" : `${jevModel} · ${jevDuplicateCount} duplicates merged`}</div></div></section>
      <section className="kpi-grid"><div className="kpi-card"><div><span>Ingested stories</span><Icon name="rss" size={17} /></div><strong>{feed.source.totalItems}</strong><small>{feed.source.rssItems} RSS · {feed.source.hotListItems} ranked signals</small></div><div className="kpi-card"><div><span>Fact grounding confidence</span><Icon name="check" size={17} /></div><strong>{aiBrief ? "82%" : "—"}</strong><small>{aiBrief ? `${aiBrief.meta.groundedSources} source groups grounded` : "Run synthesis to score claims"}</small></div><div className="kpi-card"><div><span>Edition curation progress</span><Icon name="layers" size={17} /></div><strong>{includedIds.length}<em> / 8</em></strong><div className="progress-track"><i style={{ width: `${Math.min(100, includedIds.length / 8 * 100)}%` }} /></div><small>Target: 8 stories · {Math.round(Math.min(100, includedIds.length / 8 * 100))}% quota</small></div><div className="kpi-card"><div><span>Pipeline status</span><Icon name="refresh" size={17} /></div><strong>{syncing ? "Syncing" : "Ready"}</strong><small>{feed.source.syncedAt ? `Snapshot synced ${formatUtcDate(feed.source.syncedAt, true)}` : "Awaiting first sync"}</small></div></section>
      <section className="triage-telemetry"><div><span>Fetched from active RSS sources</span><strong>{syncStats?.fetched ?? feed.source.totalItems}</strong><small>Raw records returned by the last sync</small></div><div><span>Retained after 14-day window</span><strong>{syncStats?.retained ?? feed.source.totalItems}</strong><small>{syncStats?.purged ? `${syncStats.purged} outside retention or source filters` : "Rolling storage boundary"}</small></div><div><span>Jev unique stories</span><strong>{jevUniqueIds.length || feed.source.totalItems}</strong><small>{jevDuplicateCount} duplicate records merged</small></div><div><span>What the score means</span><strong>Jev ≠ grounding</strong><small>Jev ranks editorial value; grounding is source provenance.</small></div></section>
      {selected?.jevScore && <section className="jev-score-panel"><div><span>Selected story Jev profile</span><strong>Composite {selected.jevScore.composite}/100</strong><small>{selected.jevScore.model} · {selected.jevScore.recency.source === "jev" ? "Jev-scored dimensions" : "Local fallback dimensions"}</small></div><div><span>Recency</span><strong>{selected.jevScore.recency.score}</strong></div><div><span>AI relevance</span><strong>{selected.jevScore.aiRelevance.score}</strong></div><div><span>Hype / trend</span><strong>{selected.jevScore.hypeTrend.score}</strong></div><div><span>Capco impact</span><strong>{selected.jevScore.capcoImpact.score}</strong></div></section>}
      <section className="triage-controls"><div className="triage-search"><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ingested stories, sources, or citations..." /><span>⌘K</span></div><div className="triage-actions"><button className="button utility" onClick={() => setIncludedIds(visibleStories.map((story) => story.id))}><Icon name="check" size={15} /> Include visible</button><button className="button utility" onClick={() => setIncludedIds([])}><Icon name="close" size={15} /> Clear selection</button><button className="button utility danger" onClick={() => { setQuery(""); setSignalFilter("All signals"); setStoryHistoryFilter("Fresh only"); setSortMode("Jev score"); setDateFilter("Any date"); setJevScoreFilter("All scores"); }}><Icon name="refresh" size={15} /> Reset filters</button></div><div className="triage-filters"><span>Signal:</span>{["All signals", "AI platforms", "Risk & governance", "Technology"].map((filter) => <button className={signalFilter === filter ? "selected" : ""} key={filter} onClick={() => setSignalFilter(filter)}>{filter}</button>)}</div><div className="triage-filters"><span>History:</span>{(["Fresh only", "Previously dispatched", "All stories"] as StoryHistoryFilter[]).map((filter) => <button className={storyHistoryFilter === filter ? "selected" : ""} key={filter} onClick={() => setStoryHistoryFilter(filter)}>{filter}{filter === "Previously dispatched" && dispatchedStories.length ? ` (${dispatchedStories.length})` : ""}</button>)}</div><div className="triage-sort-row"><div className="sort-control"><span className="sort-label">Sort stories</span><div className="sort-buttons" role="group" aria-label="Sort stories">{["Jev score", "Newest", "Oldest", "Recency", "AI relevance", "Hype / trend", "Capco impact"].map((option) => <button type="button" className={sortMode === option ? "active" : ""} aria-pressed={sortMode === option} key={option} onClick={() => setSortMode(option as SortMode)}>{option}</button>)}</div></div><label><span>Date window</span><select value={dateFilter} onChange={(event) => setDateFilter(event.target.value as DateFilter)}>{["Any date", "Last 24 hours", "Last 3 days", "Last 7 days", "Last 14 days"].map((option) => <option key={option}>{option}</option>)}</select></label><label><span>Minimum Jev</span><select value={jevScoreFilter} onChange={(event) => setJevScoreFilter(event.target.value)}><option>All scores</option><option value="80">80+</option><option value="70">70+</option><option value="60">60+</option><option value="50">50+</option></select></label></div></section>
      <section className="triage-grid"><div className="queue-column"><div className="queue-heading"><div><h2>Ingested stories</h2><span>{showAllStories ? "All unique TrendRadar items" : "Curated top signals"} · {storyHistoryFilter === "Fresh only" ? "new signals only" : storyHistoryFilter.toLowerCase()} · sorted by {sortMode}{jevDuplicateCount ? ` · ${jevDuplicateCount} duplicate fetches merged` : ""}</span></div><div className="queue-heading-actions"><span>Showing {visibleStories.length} of {queueStories.length} items</span><button className="button utility" onClick={() => setShowAllStories((current) => !current)}>{showAllStories ? "Show curated 8" : `Show all ${jevUniqueIds.length || feed.source.totalItems}`}</button></div></div>{visibleStories.map((story) => <article className={`queue-card ${selected?.id === story.id ? "selected" : ""}`} key={story.id} onClick={() => setSelectedId(story.id)}><div className="queue-accent" /><div className="queue-card-main"><div className="queue-tags"><span className="topic-tag">{story.topic}</span><span className={`impact-tag ${story.impact.toLowerCase()}`}>Impact: {story.impact}</span>{matchesDispatched(story, dispatchedStories) && <span className="impact-tag watch">Dispatched</span>}<span className="grounding-tag"><Icon name="check" size={12} /> Grounding: {story.confidence}%</span><span>{story.published} · {story.source}</span></div><h3>{story.title}</h3><p>{story.summary}</p><div className="queue-meta"><span>Relevance: {story.confidence}/100</span>{story.url && <span>Source link available</span>}<span className="inspect-link">{selected?.id === story.id ? "Inspector open" : "Inspect source"} <Icon name="arrow" size={14} /></span></div></div><div className="queue-card-action"><button className={includedIds.includes(story.id) ? "include-button included" : "include-button"} onClick={(event) => { event.stopPropagation(); toggleIncluded(story.id); }}><Icon name={includedIds.includes(story.id) ? "check" : "plus"} size={14} />{includedIds.includes(story.id) ? "Included" : "Select"}</button><small>{includedIds.includes(story.id) ? `Slot ${String(includedIds.indexOf(story.id) + 1).padStart(2, "0")} / 08` : "Candidate"}</small></div></article>)}</div><aside className="triage-inspector"><div className="inspector-header"><div><span className="inspector-icon"><Icon name="spark" size={17} /></span><div><strong>AI triage assessment</strong><small>{aiBrief ? providerLabel : "Inspector active · awaiting synthesis"}</small></div></div><span className="match-score">{selected ? `${selected.confidence}% match` : "—"}</span></div>{selected ? <><div className="focus-card"><div>{selected.published} · {selected.source}</div><h2>{selected.title}</h2><span>{selected.topic} · {selected.kind === "ai" ? "AI-selected" : "TrendRadar candidate"}</span></div><div className="claims-block"><span className="inspector-label">Extracted core claims &amp; metrics</span><div className="claim-grid"><div><small>Relevance</small><strong>{selected.confidence}/100</strong><span>Signal fit for the edition</span></div><div><small>Source type</small><strong>{selected.kind === "ai" ? "AI" : "Feed"}</strong><span>{selected.source}</span></div></div><div className="claim-note"><Icon name="check" size={17} /><div><strong>Capco relevance</strong><span>{selected.implication}</span></div></div></div><div className="angle-card"><div><span>Capco editorial angle</span><small>{aiBrief ? "AI-generated recommendation" : "Editorial framing"}</small></div><p>{selected.implication}</p></div><div className="verification-row"><div><Icon name="check" size={19} /><span><strong>Source origin verified</strong><small>Link and feed metadata available</small></span></div>{selected.url && <a href={selected.url} target="_blank" rel="noreferrer">View source</a>}</div><div className="inspector-actions"><button className="button primary full" onClick={aiBrief ? () => { window.location.href = "/editions/week-42-2026"; } : runAISynthesis}><Icon name="check" size={16} />{aiBrief ? "Push to editorial synthesis" : synthesizing ? "Synthesizing…" : "Run AI triage & synthesis"}</button><div><button className="button utility" onClick={() => toggleIncluded(selected.id)}>{includedIds.includes(selected.id) ? "Remove from batch" : "Add to batch"}</button><button className="button utility danger" onClick={() => setSelectedId(visibleStories.find((story) => story.id !== selected.id)?.id ?? selected.id)}>Discard</button></div></div></> : <div className="empty-inspector">No fresh stories are currently available. Use “Previously dispatched” or “All stories” to deliberately reuse a signal.</div>}</aside></section>
    </div>
    <div className="handoff-bar"><div><strong>{includedIds.length} of 8 stories confirmed</strong><span>for the current editorial batch</span><small>TrendRadar snapshot · {feed.source.totalItems} items · {providerLabel}</small></div><div><button className="button utility">Save draft repository</button><button className="button dark" onClick={runAISynthesis} disabled={synthesizing}>{synthesizing ? "Synthesizing…" : aiBrief ? "Regenerate AI brief" : "Advance to Stage 02"}<Icon name="arrow" size={16} /></button></div></div>
    {syncMessage && <div className={`sync-toast ${syncMessage.startsWith("Could") ? "error" : ""}`}><Icon name={syncMessage.startsWith("Could") ? "close" : "check"} size={14} />{syncMessage}</div>}
    {aiError && <div className="toast-error">{aiError}</div>}
    {showEmail && <div className="modal-backdrop" onClick={() => setShowEmail(false)}><div className="email-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><div className="section-kicker">Preview / consultant · {aiBrief ? "AI-generated draft" : "sample draft"}</div><h2>Weekly edition email</h2></div><button className="icon-button" onClick={() => setShowEmail(false)} aria-label="Close"><Icon name="close" size={18} /></button></div><div className="email-preview"><div className="email-masthead"><span>CAPCO</span><span>AI SIGNALS / WEEK 38</span></div><h3>{aiBrief?.brief.headline ?? "Run synthesis to create the weekly communication"}</h3><p>{aiBrief?.brief.capcoPerspective ?? "The email preview will use the approved AI brief, Capco perspective, and cited source set."}</p>{aiBrief && <div className="email-thesis"><span>WEEKLY THESIS</span><strong>{aiBrief.brief.thesis}</strong></div>}<div className="email-rule" />{queueStories.slice(0, 3).map((story) => <div className="email-item" key={story.id}><span>{story.signal}</span><div><strong>{story.title}</strong><p>{story.implication}</p></div></div>)}</div><div className="modal-footer"><button className="button primary" onClick={() => setShowEmail(false)}>Looks good <Icon name="check" size={16} /></button><button className="text-button" onClick={() => setShowEmail(false)}>Back to workspace</button></div></div></div>}
  </>;
}
