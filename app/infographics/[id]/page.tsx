"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell/AppShell";
import { Icon } from "@/components/ui/Icon";
import { WorkflowDiagram } from "@/components/workflow/WorkflowDiagram";
import { infographicTemplates } from "@/lib/demo-data";
import type { WeeklyBriefResult } from "@/lib/weekly-intelligence";

export default function InfographicPage() {
  const [template, setTemplate] = useState("operating-model");
  const [variant, setVariant] = useState(1);
  const [saved, setSaved] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [artworkStatus, setArtworkStatus] = useState("Artwork brief ready");
  const [aiBrief, setAiBrief] = useState<WeeklyBriefResult | null>(null);
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/weekly-intelligence", { method: "POST" })
      .then((response) => response.ok ? response.json() as Promise<WeeklyBriefResult> : null)
      .then((result) => { if (!cancelled && result) setAiBrief(result); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  async function generateArtwork() {
    setGenerating(true);
    try {
      const response = await fetch("/api/generate-art", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brief: aiBrief?.brief }) });
      const result = await response.json() as { status?: string; model?: string; output?: string | null };
      if (result.status === "generated" && result.output) {
        setArtworkUrl(result.output);
        setArtworkStatus(`Generated with ${result.model ?? "image model"}`);
      } else {
        setArtworkStatus("Brief ready · add an image provider key to render artwork");
      }
    } catch {
      setArtworkStatus("Artwork generation unavailable");
    } finally {
      setGenerating(false);
    }
  }
  const infographic = aiBrief?.brief.infographic;
  return <AppShell><header className="topbar"><div><div className="topbar-kicker">Infographic editor</div><div className="topbar-period">{infographic?.title ?? "Operating model / signal to action"}</div></div><div className="topbar-actions"><span className="status-chip"><span className="status-dot green" /> {aiBrief ? `${aiBrief.meta.groundedSources} sources grounded` : "Loading AI brief"}</span><button className="button ghost small" onClick={generateArtwork} disabled={generating}><Icon name="spark" size={15} />{generating ? "Generating…" : "Generate artwork"}</button><button className="button dark small" onClick={() => setSaved(true)}>{saved ? "Export queued" : "Export"} <Icon name="download" size={15} /></button></div></header><div className="page-wrap infographic-page"><div className="editor-toolbar"><div><div className="section-kicker">Canvas / 16:9 · AI brief → deterministic overlay</div><h1>{infographic?.title ?? "Make the workflow legible"}</h1><p className="editor-subtitle">{infographic?.subtitle ?? "The weekly communication will become a visual story once the brief is approved."}</p></div><div className="toolbar-actions"><button className="icon-button"><Icon name="refresh" size={17} /></button><button className="button ghost small">Share review <Icon name="external" size={15} /></button></div></div><div className="infographic-editor-grid"><aside className="inspector panel"><div className="inspector-block"><div className="inspector-label">Template</div>{infographicTemplates.map((item) => <button className={`template-row ${template === item.id ? "selected" : ""}`} key={item.id} onClick={() => setTemplate(item.id)}><span><strong>{item.name}</strong><small>{item.description}</small></span><span>{item.ratio}</span></button>)}</div><div className="inspector-block"><div className="inspector-label">Artwork variants</div><div className="variant-list">{[1, 2, 3].map((item) => <button className={`variant-card ${variant === item ? "selected" : ""}`} onClick={() => setVariant(item)} key={item}><div className={`variant-art v${item}`}><span>{item === 1 ? "Signal" : item === 2 ? "Flow" : "System"}</span></div><small>Variant 0{item}</small></button>)}</div><div className="artwork-status"><i className={`status-dot ${artworkStatus.startsWith("Generated") ? "green" : "orange"}`} />{artworkStatus}</div></div><div className="inspector-block"><div className="inspector-label">AI visual direction</div><p className="inspector-copy">{infographic?.visualDirection ?? "A dark editorial systems map with a clear human decision path and quiet zones for exact copy."}</p><div className="control-row"><span>Warm orange accent</span><span className="color-swatch orange-swatch" /></div><div className="control-row"><span>Logo lockup</span><span className="toggle on"><i /></span></div><div className="control-row"><span>Source footer</span><span className="toggle on"><i /></span></div></div></aside><main className="canvas-area"><div className="canvas-shell"><div className="canvas-art" style={artworkUrl ? { backgroundImage: `linear-gradient(90deg, rgba(19,31,50,.9) 0%, rgba(19,31,50,.38) 52%, rgba(19,31,50,.18) 100%), url(${artworkUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}><div className="canvas-topline"><span>CAPCO / AI INTELLIGENCE</span><span>WEEK 38 / 2026</span></div><div className="canvas-headline">{infographic?.title ?? <>The model is<br /><em>the message.</em></>}</div><div className="canvas-subline">{infographic?.subtitle ?? "Five moves from signal to governed action."}</div><div className="canvas-workflow"><WorkflowDiagram /></div><div className="canvas-footer"><span>Source: Capco AI Intelligence Workspace</span><span>01—05</span></div></div></div><div className="canvas-status"><span><i className="status-dot green" />Exact copy overlay locked</span><span>{artworkUrl ? "Image model artwork applied" : "Artwork brief from AI synthesis"} · Variant 0{variant} · {template === "operating-model" ? "Operating model" : "Executive snapshot"}</span><span>100%</span></div></main></div></div></AppShell>;
}
