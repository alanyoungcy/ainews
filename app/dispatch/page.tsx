"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell/AppShell";
import { Icon } from "@/components/ui/Icon";
import type { WeeklyBriefResult, WeeklyStory } from "@/lib/weekly-intelligence";

const checks = [
  ["Checksum validation", "Edition assets match the approved visual spec"],
  ["Legal disclaimer", "Capco advisory disclaimer is present"],
  ["Recipient list", "Tier-1 wealth and banking distribution verified"],
  ["Non-public data scan", "No restricted client data detected"],
] as const;

type DispatchHandoff = {
  version: 1;
  savedAt: string;
  brief: WeeklyBriefResult | null;
  selectedStory: WeeklyStory & { id: string };
  visualStyle: { id: string; name: string };
  layout: { id: string; name: string };
  infographic: WeeklyBriefResult["brief"]["infographic"] | null;
  metrics: string[];
  artworkUrl: string | null;
  watermark: boolean;
  legalScrim: boolean;
};

const fallbackBlocks = [
  { label: "01", title: "Selected signal", body: "The approved Stage 02 story will appear here." },
  { label: "02", title: "Capco implication", body: "The approved Capco perspective will appear here." },
  { label: "03", title: "Visual direction", body: "The Stage 03 template and layout will appear here." },
];

export default function DispatchPage() {
  const [mode, setMode] = useState("Desktop");
  const [checked, setChecked] = useState<string[]>([]);
  const [scheduled, setScheduled] = useState(false);
  const [dispatched, setDispatched] = useState(false);
  const [handoff, setHandoff] = useState<DispatchHandoff | null>(null);
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
  const [artworkState, setArtworkState] = useState<"loading" | "ready" | "missing">("loading");
  const allChecked = checked.length === checks.length;
  const toggle = (label: string) => setChecked((current) => current.includes(label) ? current.filter((item) => item !== label) : [...current, label]);

  useEffect(() => { if (dispatched) void fetch("/api/edition-status", { method: "POST" }); }, [dispatched]);
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      let localArtwork: string | null = null;
      let localHandoff: DispatchHandoff | null = null;
      try {
        localArtwork = window.localStorage.getItem("capco-infographic-artwork");
        const rawHandoff = window.localStorage.getItem("capco-stage03-handoff");
        if (rawHandoff) {
          const parsed = JSON.parse(rawHandoff) as DispatchHandoff;
          if (parsed?.selectedStory?.title) localHandoff = parsed;
        }
      } catch {
        // Continue to the server handoff and visual-memory fallbacks.
      }

      let remoteHandoff: DispatchHandoff | null = null;
      try {
        const response = await fetch("/api/editorial-handoff?stage=stage03", { cache: "no-store" });
        if (response.ok) {
          const payload = await response.json() as { handoff?: DispatchHandoff | null };
          if (payload.handoff?.selectedStory?.title) remoteHandoff = payload.handoff;
        }
      } catch {
        // The local handoff remains a valid fallback for offline review.
      }

      if (cancelled) return;
      const resolvedHandoff = remoteHandoff ?? localHandoff;
      const resolvedArtwork = resolvedHandoff?.artworkUrl ?? (resolvedHandoff ? localArtwork : null);
      if (resolvedHandoff) setHandoff(resolvedHandoff);
      if (resolvedArtwork) {
        setArtworkUrl(resolvedArtwork);
        setArtworkState("ready");
      }
      if (!resolvedArtwork) setArtworkState("missing");
    }
    void restore();
    return () => { cancelled = true; };
  }, []);

  const selectedStory = handoff?.selectedStory;
  const editionTitle = handoff?.infographic?.title ?? selectedStory?.title ?? "GenAI in Tier-1 Wealth & Banking";
  const editionSummary = selectedStory?.fact ?? handoff?.infographic?.subtitle ?? "The approved Stage 02 summary will populate this edition preview.";
  const editionPerspective = selectedStory?.capcoImplication ?? handoff?.brief?.brief.capcoPerspective ?? "The approved Capco perspective will populate this edition preview.";
  const contextBlocks = useMemo(() => {
    if (!handoff) return fallbackBlocks;
    return [
      { label: "01", title: "Selected signal", body: selectedStory?.fact ?? editionSummary },
      { label: "02", title: "Capco implication", body: editionPerspective },
      { label: "03", title: "Visual specification", body: `${handoff.visualStyle.name} · ${handoff.layout.name}` },
    ];
  }, [editionPerspective, editionSummary, handoff, selectedStory]);

  return <AppShell><div className="stage-page dispatch-stage"><div className="stage-strip"><span className="stage-label">Editorial pipeline</span><span>/</span><strong>Stage 04: Dispatch &amp; newsletter</strong><span>/</span><span><i className="live-dot" /> HITL Gate 3</span><span className="stage-ref">{handoff ? "STAGE 03 HANDOFF LINKED" : "AWAITING STAGE 03"}</span></div><section className="stage-heading"><div><span className="section-kicker">Edition staging workspace</span><h1>Client dispatch &amp; newsletter</h1><p>Preview the approved story, Capco perspective, visual specification, and generated infographic before authorizing client delivery.</p></div><div className="stage-heading-actions"><span className="status-chip"><span className={`status-dot ${dispatched ? "green" : "orange"}`} />{dispatched ? "Dispatched" : allChecked ? "Ready for clearance" : "Pending compliance"}</span><button className="button dark" disabled={!allChecked} onClick={() => setDispatched(true)}><Icon name="mail" size={16} />{dispatched ? "Dispatch complete" : "Authorize dispatch"}</button></div></section><div className="dispatch-grid"><section className="dispatch-preview panel"><div className="panel-header"><div><span className="section-kicker">Multi-channel preview</span><h2>{editionTitle}</h2></div><span className="panel-index">{handoff ? "Stage 03 · Draft" : "Awaiting handoff"}</span></div><div className="preview-tabs">{["Desktop", "Mobile", "PDF 1-pager", "HTML source"].map((item) => <button key={item} className={mode === item ? "selected" : ""} onClick={() => setMode(item)}>{item}</button>)}</div><div className={`newsletter-frame ${mode.toLowerCase().replaceAll(" ", "-")}`}><div className="newsletter-top"><span>CAPCO INTELLIGENCE</span><span>{handoff ? "STAGE 03 / APPROVED VISUAL" : "DRAFT / HANDOFF PENDING"}</span></div><div className="newsletter-hero"><div><span className="newsletter-kicker">WEEKLY ADVISORY SIGNALS</span><h3>{editionTitle}</h3><p>{editionSummary}</p></div><div className={`newsletter-art ${artworkUrl ? "has-artwork" : ""}`}>{artworkUrl && <img className="newsletter-art-image" src={artworkUrl} alt="Generated infographic for the selected story" onError={() => { setArtworkUrl(null); setArtworkState("missing"); }} />}<span>CAPCO<br /><em>AI</em></span><i /><b /></div></div><div className="newsletter-context"><span>{selectedStory ? `Source: ${selectedStory.source}` : "Source: Stage 02 story handoff pending"}</span><span>{handoff ? `${handoff.visualStyle.name} · ${handoff.layout.name}` : "Visual specification pending"}</span></div><div className="newsletter-rule" /><div className="newsletter-columns">{contextBlocks.map((block) => <div key={block.label}><span className="newsletter-number">{block.label}</span><strong>{block.title}</strong><p>{block.body}</p></div>)}</div><div className="newsletter-foot"><span>{handoff?.legalScrim === false ? "Draft visual · legal review required" : "Source-grounded · legal review required"}</span><span>{selectedStory?.url ? "Source link retained" : "Capco AI Intelligence Workspace"}</span></div></div><div className="preview-status"><span><i className={`status-dot ${handoff ? "green" : "orange"}`} />{handoff ? "Stage 03 story handoff embedded" : "Waiting for Stage 03 handoff"}</span><span>{mode} view · {artworkState === "ready" ? "Generated infographic embedded" : artworkState === "loading" ? "Loading generated artwork…" : "No generated artwork found"}</span></div></section><aside className="dispatch-side"><section className="export-panel panel"><div className="panel-header"><div><span className="section-kicker">Export hub</span><h2>Client-ready formats</h2></div></div><button className="export-row" onClick={() => setScheduled(true)}><span className="export-icon"><Icon name="download" size={17} /></span><span><strong>PowerPoint deck</strong><small>Editable vectors · 16:9 slide</small></span><Icon name="arrow" size={15} /></button><button className="export-row" onClick={() => setScheduled(true)}><span className="export-icon"><Icon name="download" size={17} /></span><span><strong>Executive PDF</strong><small>Print-ready · 300 DPI</small></span><Icon name="arrow" size={15} /></button><button className="export-row" onClick={() => setScheduled(true)}><span className="export-icon"><Icon name="external" size={17} /></span><span><strong>Responsive HTML</strong><small>Newsletter source · tracked links</small></span><Icon name="arrow" size={15} /></button>{scheduled && <div className="export-toast"><Icon name="check" size={14} /> Export jobs queued for this edition.</div>}</section><section className="compliance-panel panel"><div className="panel-header"><div><span className="section-kicker">HITL Gate 3</span><h2>Security &amp; compliance</h2></div><span className="panel-index">{checked.length}/4 passed</span></div>{checks.map(([label, detail]) => <button key={label} className={`check-row ${checked.includes(label) ? "checked" : ""}`} onClick={() => toggle(label)}><span className="check-box"><Icon name="check" size={13} /></span><span><strong>{label}</strong><small>{detail}</small></span><em>{checked.includes(label) ? "Pass" : "Review"}</em></button>)}</section><section className="source-lock-card dispatch-context"><span>Handoff context</span><strong>{selectedStory?.title ?? "Stage 03 not linked"}</strong><p>{handoff ? `${selectedStory?.confidence ?? 0}% grounding · ${handoff.visualStyle.name} · ${handoff.layout.name}` : "Advance from Stage 03 after visual sign-off to carry the selected story into dispatch."}</p></section></aside></div><div className="handoff-bar"><div><strong>{allChecked ? "4 of 4 checks passed" : `${checked.length} of 4 checks passed`}</strong><span>{selectedStory ? `Dispatching · ${selectedStory.title}` : "Stage 03 story handoff required"}</span><small>{dispatched ? "Dispatch authorized and queued" : handoff ? "Story, summary, perspective, visual style, layout, and artwork are linked" : "Complete Stage 03 sign-off before authorizing delivery"}</small></div><div><button className="button utility" onClick={() => setChecked(checks.map(([label]) => label))}>Pass all checks</button><button className="button dark" disabled={!allChecked} onClick={() => setDispatched(true)}>{dispatched ? "View dispatch log" : "Authorize & send"}<Icon name="arrow" size={16} /></button></div></div></div></AppShell>;
}
