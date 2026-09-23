"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell/AppShell";
import { Icon } from "@/components/ui/Icon";
import type { WeeklyBriefResult, WeeklyStory } from "@/lib/weekly-intelligence";

const checks = [
  ["Checksum validation", "Story bundle and final visual are linked"],
  ["Legal disclaimer", "Capco advisory disclaimer is present"],
  ["Recipient list", "Configured distribution channels verified"],
  ["Non-public data scan", "No restricted client data detected"],
] as const;
type Channel = "Mobile" | "Email" | "HTML / Web";
type Overlay = { id: string; label: string; value: string; x: number; y: number; width: number; kind: string };
type Stage01Source = { id: string; title?: string; source?: string; url?: string | null };
type DispatchHandoff = { version: number; savedAt: string; brief: WeeklyBriefResult | null; selectedStory: WeeklyStory & { id: string }; stories?: Array<WeeklyStory & { id: string }>; stage02?: { stage01?: { selectedStoryIds?: string[]; selectedStories?: Stage01Source[] } | null } | null; visualStyle: { id: string; name: string }; layout: { id: string; name: string }; infographic: WeeklyBriefResult["brief"]["infographic"] | null; metrics: string[]; overlays?: Overlay[]; artworkUrl: string | null; referenceImage?: string | null; watermark: boolean; legalScrim: boolean; status?: string };

function readLocalHandoff() { try { const raw = window.localStorage.getItem("capco-stage03-handoff"); return raw ? JSON.parse(raw) as DispatchHandoff : null; } catch { return null; } }

export default function DispatchPage() {
  const [channel, setChannel] = useState<Channel>("Email");
  const [checked, setChecked] = useState<string[]>([]);
  const [scheduled, setScheduled] = useState(false);
  const [dispatched, setDispatched] = useState(false);
  const [handoff, setHandoff] = useState<DispatchHandoff | null>(null);
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
  const [artworkState, setArtworkState] = useState<"loading" | "ready" | "missing">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const allChecked = checked.length === checks.length;

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      let local = readLocalHandoff();
      try { const response = await fetch("/api/editorial-handoff?stage=stage03", { cache: "no-store" }); if (response.ok) { const payload = await response.json() as { handoff?: DispatchHandoff | null }; if (payload.handoff?.selectedStory?.title) local = payload.handoff; } } catch { /* local remains available */ }
      if (cancelled) return;
      if (local?.selectedStory?.title) { setHandoff(local); if (local.artworkUrl) { setArtworkUrl(local.artworkUrl); setArtworkState("ready"); } else setArtworkState("missing"); }
      else { setArtworkState("missing"); setMessage("Stage 03 has not confirmed a visual bundle yet. Return to Visual Curation to continue."); }
    }
    void restore();
    return () => { cancelled = true; };
  }, []);

  const selectedStory = handoff?.selectedStory;
  const editionTitle = handoff?.infographic?.title ?? selectedStory?.title ?? "Awaiting approved edition";
  const editionSummary = selectedStory?.fact ?? handoff?.infographic?.subtitle ?? "The approved Stage 02 summary will appear here.";
  const editionPerspective = selectedStory?.capcoImplication ?? handoff?.brief?.brief.capcoPerspective ?? "The approved Capco PoV will appear here.";
  const contextBlocks = useMemo(() => handoff ? [{ label: "01", title: "Selected signal", body: selectedStory?.fact ?? editionSummary }, { label: "02", title: "Capco PoV", body: editionPerspective }, { label: "03", title: "Visual specification", body: `${handoff.visualStyle.name} · ${handoff.layout.name}` }] : [], [editionPerspective, editionSummary, handoff, selectedStory]);

  function toggle(label: string) { setChecked((current) => current.includes(label) ? current.filter((item) => item !== label) : [...current, label]); }
  function downloadBundle(kind: "html" | "json" | "image") {
    if (!handoff) return;
    if (kind === "image" && artworkUrl) { const link = document.createElement("a"); link.href = artworkUrl; link.target = "_blank"; link.rel = "noreferrer"; link.click(); setMessage("High-resolution infographic opened for download."); return; }
    const body = kind === "json" ? JSON.stringify(handoff, null, 2) : `<!doctype html><html><head><meta charset="utf-8"><title>${editionTitle}</title></head><body><h1>${editionTitle}</h1><p>${editionSummary}</p><h2>Capco PoV</h2><p>${editionPerspective}</p><p>Source: ${selectedStory?.source ?? "TrendRadar"}</p></body></html>`;
    const blob = new Blob([body], { type: kind === "json" ? "application/json" : "text/html" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = kind === "json" ? "capco-edition-bundle.json" : "capco-edition.html"; link.click(); URL.revokeObjectURL(link.href); setMessage("Edition bundle downloaded.");
  }
  async function dispatchBundle() {
    if (!allChecked || !handoff) return;
    const stage01 = handoff.stage02?.stage01;
    const selectedSourceIds = stage01?.selectedStoryIds ?? [];
    const sourceStories = stage01?.selectedStories ?? [];
    const stories = selectedSourceIds.map((sourceId) => {
      const match = sourceStories.find((story) => story.id === sourceId || story.id === `feed-${sourceId}`);
      return {
        id: sourceId,
        title: match?.title ?? (sourceId === handoff.selectedStory.id ? handoff.selectedStory.title : handoff.selectedStory.title),
        source: match?.source ?? handoff.selectedStory.source,
        url: match?.url ?? (sourceId === handoff.selectedStory.id ? handoff.selectedStory.url : handoff.selectedStory.url),
      };
    });
    if (!stories.length) stories.push({ id: handoff.selectedStory.id, title: handoff.selectedStory.title, source: handoff.selectedStory.source, url: handoff.selectedStory.url });
    setDispatched(true);
    setMessage("Dispatch authorized and queued for the configured channels. Source stories are now flagged as dispatched.");
    await fetch("/api/edition-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stories }) }).catch(() => undefined);
  }

  return <AppShell><div className="stage-page dispatch-stage">
    <div className="stage-strip"><span className="stage-label">Editorial pipeline</span><span>/</span><strong>Stage 04: Preview &amp; publishing</strong><span>/</span><span><i className="live-dot" /> HITL Gate 3</span><span className="stage-ref">{handoff ? "STAGE 03 BUNDLE LINKED" : "AWAITING STAGE 03"}</span></div>
    <section className="stage-heading"><div><span className="section-kicker">Multi-format preview &amp; publishing</span><h1>Prepare the client communication</h1><p>Review the same approved story, Capco PoV, citations, and confirmed infographic across mobile, email, and web before downloading or dispatching.</p></div><div className="stage-heading-actions"><span className="status-chip"><span className={`status-dot ${dispatched ? "green" : handoff ? "orange" : "red"}`} />{dispatched ? "Dispatch queued" : handoff ? "Ready for channel review" : "Awaiting visual bundle"}</span><button className="button dark" disabled={!allChecked || !handoff} onClick={() => void dispatchBundle()}><Icon name="mail" size={16} />{dispatched ? "Dispatch complete" : "Dispatch"}</button></div></section>
    <div className="dispatch-grid"><section className="dispatch-preview panel"><div className="panel-header"><div><span className="section-kicker">Live channel preview</span><h2>{editionTitle}</h2></div><span className="panel-index">{handoff ? "Stage 03 · Confirmed" : "Bundle pending"}</span></div><div className="preview-tabs">{(["Mobile", "Email", "HTML / Web"] as Channel[]).map((item) => <button key={item} className={channel === item ? "selected" : ""} onClick={() => setChannel(item)}>{item}</button>)}</div><div className={`publication-frame ${channel.toLowerCase().replaceAll(" ", "-").replace("/", "")}`}><div className="newsletter-top"><span>CAPCO INTELLIGENCE</span><span>{handoff ? "APPROVED EDITORIAL BUNDLE" : "HANDOFF PENDING"}</span></div><div className="publication-hero"><div><span className="newsletter-kicker">WEEKLY ADVISORY SIGNALS</span><h3>{editionTitle}</h3><p>{editionSummary}</p><div className="source-links">{selectedStory?.url && <a href={selectedStory.url} target="_blank" rel="noreferrer">Primary source ↗</a>}<span>{selectedStory?.source ?? "Source links pending"}</span></div></div><div className={`newsletter-art ${artworkUrl ? "has-artwork" : ""}`}>{artworkUrl && <img className="newsletter-art-image" src={artworkUrl} alt="Confirmed infographic for the selected story" onError={() => { setArtworkUrl(null); setArtworkState("missing"); }} />}<span>CAPCO<br /><em>AI</em></span><i /><b /></div></div><div className="publication-pov"><span>CAPCO POINT OF VIEW</span><strong>{editionPerspective}</strong></div><div className="newsletter-context"><span>{selectedStory ? `Source: ${selectedStory.source}` : "Source handoff pending"}</span><span>{handoff ? `${handoff.visualStyle.name} · ${handoff.layout.name}` : "Visual specification pending"}</span></div><div className="newsletter-rule" /><div className="newsletter-columns">{contextBlocks.map((block) => <div key={block.label}><span className="newsletter-number">{block.label}</span><strong>{block.title}</strong><p>{block.body}</p></div>)}</div><div className="publication-references"><span>References</span><p>{selectedStory?.url ?? "Approved source citations will appear here."}</p></div><div className="newsletter-foot"><span>{handoff?.legalScrim === false ? "Draft visual · legal review required" : "Source-grounded · legal review required"}</span><span>{selectedStory?.url ? "Source link retained" : "Capco AI Intelligence Workspace"}</span></div></div><div className="preview-status"><span><i className={`status-dot ${handoff ? "green" : "orange"}`} />{handoff ? "Story, PoV, citations, and visual linked" : "Waiting for Stage 03 handoff"}</span><span>{channel} view · {artworkState === "ready" ? "Confirmed infographic embedded" : "No confirmed infographic"}</span></div></section>
      <aside className="dispatch-side"><section className="export-panel panel"><div className="panel-header"><div><span className="section-kicker">Download</span><h2>Export the bundle</h2></div></div><button className="export-row" onClick={() => downloadBundle("html")} disabled={!handoff}><span className="export-icon"><Icon name="download" size={17} /></span><span><strong>HTML / email bundle</strong><small>Responsive template · citations retained</small></span><Icon name="arrow" size={15} /></button><button className="export-row" onClick={() => downloadBundle("image")} disabled={!artworkUrl}><span className="export-icon"><Icon name="download" size={17} /></span><span><strong>High-resolution image asset</strong><small>Generated artwork · editor overlays disabled</small></span><Icon name="arrow" size={15} /></button><button className="export-row" onClick={() => downloadBundle("json")} disabled={!handoff}><span className="export-icon"><Icon name="download" size={17} /></span><span><strong>Editorial bundle JSON</strong><small>Story, PoV, sources, layout, and visual settings</small></span><Icon name="arrow" size={15} /></button>{message && <div className="export-toast"><Icon name="check" size={14} /> {message}</div>}</section><section className="compliance-panel panel"><div className="panel-header"><div><span className="section-kicker">HITL Gate 3</span><h2>Publishing clearance</h2></div><span className="panel-index">{checked.length}/4 passed</span></div>{checks.map(([label, detail]) => <button key={label} className={`check-row ${checked.includes(label) ? "checked" : ""}`} onClick={() => toggle(label)}><span className="check-box"><Icon name="check" size={13} /></span><span><strong>{label}</strong><small>{detail}</small></span><em>{checked.includes(label) ? "Pass" : "Review"}</em></button>)}</section><section className="source-lock-card dispatch-context"><span>Publishing context</span><strong>{selectedStory?.title ?? "Stage 03 not linked"}</strong><p>{handoff ? `${selectedStory?.confidence ?? 0}% grounding · ${handoff.visualStyle.name} · ${handoff.layout.name}` : "Confirm the visual in Stage 03 to unlock publishing."}</p></section></aside>
    </div>
    <div className="handoff-bar"><div><strong>{allChecked ? "4 of 4 publishing checks passed" : `${checked.length} of 4 publishing checks passed`}</strong><span>{selectedStory ? `Publishing · ${selectedStory.title}` : "Stage 03 story handoff required"}</span><small>{dispatched ? "Dispatch authorized and queued" : handoff ? "Story, summary, PoV, citations, layout, and artwork are linked" : "Complete Stage 03 visual confirmation before publishing"}</small></div><div><button className="button utility" onClick={() => setChecked(checks.map(([label]) => label))} disabled={!handoff}>Pass all checks</button><button className="button dark" disabled={!allChecked || !handoff} onClick={() => void dispatchBundle()}>{dispatched ? "View dispatch log" : "Dispatch edition"}<Icon name="arrow" size={16} /></button></div></div>
  </div></AppShell>;
}
