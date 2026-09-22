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
  const [briefStatus, setBriefStatus] = useState<"loading" | "ready" | "fallback" | "error">("loading");
  const [briefError, setBriefError] = useState<string | null>(null);
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
  const [signedOff, setSignedOff] = useState(false);
  const [metrics, setMetrics] = useState(["<18ms Ingestion SLA", "<340ms Agent Swarm Consensus", "99.4% Dual-Signoff Rule"]);

  async function loadBrief() {
    setBriefStatus("loading");
    setBriefError(null);
    try {
      const response = await fetch("/api/weekly-intelligence", { method: "POST" });
      if (!response.ok) throw new Error(`Brief service returned ${response.status}`);
      const result = await response.json() as WeeklyBriefResult;
      setAiBrief(result);
      setBriefStatus(result.meta.provider === "fallback" ? "fallback" : "ready");
      setBriefError(result.meta.providerError ?? null);
    } catch (error) {
      setBriefStatus("error");
      setBriefError(error instanceof Error ? error.message : "Could not load the infographic brief");
    }
  }

  useEffect(() => { void loadBrief(); }, []);
  async function generateArtwork() { setGenerating(true); try { const response = await fetch("/api/generate-art", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brief: aiBrief?.brief }) }); const result = await response.json() as { status?: string; model?: string; output?: string | null }; if (result.status === "generated" && result.output) { setArtworkUrl(result.output); setArtworkStatus(`Generated with ${result.model ?? "image model"}`); } else setArtworkStatus("Brief ready · add an image provider key to render artwork"); } catch { setArtworkStatus("Artwork generation unavailable"); } finally { setGenerating(false); } }
  const infographic = aiBrief?.brief.infographic;
  const briefLabel = briefStatus === "loading" ? "Preparing visual brief" : briefStatus === "ready" ? "AI visual brief ready" : briefStatus === "fallback" ? "Grounded local brief active" : "Visual brief unavailable";
  const briefDetail = briefStatus === "loading"
    ? "Loading the approved editorial thesis and infographic direction before the canvas is finalized."
    : briefStatus === "ready"
      ? `${aiBrief?.meta.model ?? "Configured AI provider"} supplied the headline, subtitle, and section structure for this visual.`
      : briefStatus === "fallback"
        ? "The AI provider did not finish in time, so the canvas is using a deterministic source-grounded brief. Fact-locked overlays remain safe to review."
        : "The visual brief could not be loaded. Retry before generating artwork so the image prompt has the right editorial context.";
  return <AppShell><div className="stage-page infographic-stage"><div className="stage-strip"><span className="stage-label">Editorial pipeline</span><span>/</span><strong>Stage 03: Infographic studio</strong><span>/</span><span><i className="live-dot" /> HITL Gate 2</span><span className="stage-ref">W42-GENAI-WEALTH-BANKING</span></div><section className="stage-heading"><div><span className="section-kicker">Visual specification workspace</span><h1>Infographic studio &amp; visual specification</h1><p>Generate an institutional visual layer, then anchor every number and label to the approved editorial source set.</p></div><div className="stage-heading-actions"><span className="status-chip"><span className={`status-dot ${signedOff ? "green" : briefStatus === "error" ? "red" : "orange"}`} />{signedOff ? "Gate 2 signed off" : briefLabel}</span><button className="button dark" onClick={() => setSignedOff(true)} disabled={signedOff}><Icon name="check" size={16} />{signedOff ? "Gate 2 cleared" : "Sign off visual"}</button></div></section><div className={`stage-progress ${briefStatus}`} role="status" aria-live="polite"><span className="stage-progress-icon">{briefStatus === "loading" ? <i className="stage-progress-spinner" /> : briefStatus === "ready" ? <Icon name="check" size={15} /> : briefStatus === "fallback" ? <Icon name="spark" size={15} /> : <Icon name="alert" size={15} />}</span><div><strong>{briefLabel}</strong><span>{briefDetail}</span>{briefError && <small>Provider detail: {briefError}</small>}</div><div className="stage-progress-actions">{briefStatus === "loading" && <span className="stage-progress-step">3/3 Build visual spec</span>}{briefStatus === "ready" && <span className="stage-progress-step">3/3 Visual spec ready</span>}{briefStatus === "fallback" && <><span className="stage-progress-step">3/3 Review fallback canvas</span><button className="button utility" onClick={() => void loadBrief()}>Retry AI brief</button></>}{briefStatus === "error" && <button className="button utility" onClick={() => void loadBrief()}>Retry brief</button>}</div></div><div className="infographic-editor-grid"><aside className="inspector panel"><div className="inspector-block"><div className="inspector-label">Layout archetype</div>{infographicTemplates.map((item) => <button className={`template-row ${template === item.id ? "selected" : ""}`} key={item.id} onClick={() => setTemplate(item.id)}><span><strong>{item.name}</strong><small>{item.description}</small></span><span>{item.ratio}</span></button>)}</div><div className="inspector-block"><div className="inspector-label">Image-model artwork</div><div className="variant-list">{[1, 2, 3].map((item) => <button className={`variant-card ${variant === item ? "selected" : ""}`} onClick={() => setVariant(item)} key={item}><div className={`variant-art v${item}`}><span>{item === 1 ? "Signal" : item === 2 ? "Flow" : "System"}</span></div><small>Variant 0{item}</small></button>)}</div><div className="artwork-status"><i className={`status-dot ${artworkStatus.startsWith("Generated") ? "green" : "orange"}`} />{artworkStatus}</div><button className="button primary full" onClick={generateArtwork} disabled={generating || briefStatus === "loading"}><Icon name="spark" size={15} />{generating ? "Generating artwork…" : briefStatus === "loading" ? "Waiting for visual brief…" : "Generate with image model"}</button></div><div className="inspector-block"><div className="inspector-label">Fact-locked overlays</div><p className="inspector-copy">These values are rendered as deterministic text and cannot be altered by the image model.</p>{metrics.map((metric, index) => <label className="metric-input" key={metric}><span>Metric {String(index + 1).padStart(2, "0")}</span><input value={metric} onChange={(event) => setMetrics((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} /></label>)}<div className="control-row"><span>Institutional watermark</span><span className="toggle on"><i /></span></div><div className="control-row"><span>Source footer</span><span className="toggle on"><i /></span></div></div></aside><main className="canvas-area"><div className="canvas-shell"><div className="canvas-art" style={artworkUrl ? { backgroundImage: `linear-gradient(90deg, rgba(19,31,50,.9) 0%, rgba(19,31,50,.38) 52%, rgba(19,31,50,.18) 100%), url(${artworkUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}><div className="canvas-topline"><span>CAPCO / AI INTELLIGENCE</span><span>WEEK 42 / 2026</span></div><div className="canvas-headline">{infographic?.title ?? <>The model is<br /><em>the message.</em></>}</div><div className="canvas-subline">{infographic?.subtitle ?? "Five moves from signal to governed action."}</div><div className="canvas-metrics">{metrics.map((metric) => <span key={metric}>{metric}</span>)}</div><div className="canvas-workflow"><WorkflowDiagram /></div><div className="canvas-footer"><span>Source: Capco AI Intelligence Workspace</span><span>01—05</span></div></div></div><div className="canvas-status"><span><i className="status-dot green" />Exact copy overlay locked</span><span>{artworkUrl ? "Image model artwork applied" : "Artwork brief from AI synthesis"} · Variant 0{variant} · {template === "operating-model" ? "Operating model" : "Executive snapshot"}</span><span>100%</span></div></main></div><div className="handoff-bar"><div><strong>3 fact-locked metrics ready</strong><span>for Week 42 client communication</span><small>{signedOff ? "Gate 2 cleared · Stage 04 dispatch unlocked" : "Consultant sign-off is required before dispatch"}</small></div><div><button className="button utility" onClick={() => setSaved(true)}>{saved ? "Saved to edition" : "Save visual spec"}</button><button className="button dark" disabled={!signedOff} onClick={() => { window.location.href = "/dispatch"; }}>Advance to Stage 04 <Icon name="arrow" size={16} /></button></div></div></div></AppShell>;
}
