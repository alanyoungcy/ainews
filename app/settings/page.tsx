"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell/AppShell";
import { Icon } from "@/components/ui/Icon";
import { DEFAULT_JEV_CRITERIA, type JevCriterion } from "@/lib/jev-settings";
import { DEFAULT_TREND_RADAR_SCHEDULE, DEFAULT_TREND_RADAR_SOURCES, type TrendRadarSchedule, type TrendRadarSettings, type TrendRadarSource } from "@/lib/trendradar-settings";

type SaveState = "loading" | "idle" | "saving" | "saved" | "error";

function moveItem(items: JevCriterion[], from: number, to: number) {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function TrendRadarSettingsPanel({ settings, saveState, message, newSource, onSchedule, onSource, onAdd, onRemove, onNewSource, onSave }: {
  settings: TrendRadarSettings;
  saveState: SaveState;
  message: string;
  newSource: { name: string; url: string; homepage: string };
  onSchedule: (patch: Partial<TrendRadarSchedule>) => void;
  onSource: (id: string, patch: Partial<TrendRadarSource>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onNewSource: (value: { name: string; url: string; homepage: string }) => void;
  onSave: () => void;
}) {
  return <section className="panel trend-settings-panel"><div className="jev-settings-intro"><div><div className="section-kicker">TrendRadar / TechRadar fetch</div><h2>Sources and timing</h2><p>Choose which English RSS/Atom sources are pulled by the local Sync button and the GitHub Actions workflow. Stories are retained for only 14 days.</p></div><div className="settings-heading-actions"><span className={`settings-save-state ${saveState}`}><i />{message}</span><button className="button dark" onClick={onSave} disabled={saveState === "loading" || saveState === "saving"}><Icon name="check" size={15} />{saveState === "saving" ? "Saving…" : "Save fetch settings"}</button></div></div><div className="trend-schedule-grid"><label className="studio-field"><span>Schedule label</span><input value={settings.schedule.label} onChange={(event) => onSchedule({ label: event.target.value })} /></label><label className="studio-field"><span>GitHub Actions cron</span><input value={settings.schedule.cron} onChange={(event) => onSchedule({ cron: event.target.value })} placeholder="15 1 * * 1" /></label><label className="studio-field"><span>Timezone</span><input value={settings.schedule.timezone} onChange={(event) => onSchedule({ timezone: event.target.value })} /></label></div><div className="trend-source-list">{settings.sources.map((source) => <article className={`trend-source-row ${source.enabled ? "" : "disabled"}`} key={source.id}><div className="trend-source-toggle"><button className={`criterion-toggle ${source.enabled ? "on" : ""}`} onClick={() => onSource(source.id, { enabled: !source.enabled })}>{source.enabled ? "Active" : "Off"}</button></div><div className="trend-source-fields"><input aria-label={`${source.name} source name`} value={source.name} onChange={(event) => onSource(source.id, { name: event.target.value })} /><input aria-label={`${source.name} RSS URL`} value={source.url} onChange={(event) => onSource(source.id, { url: event.target.value })} /><small>{source.homepage}</small></div><button className="icon-button" title="Remove source" aria-label={`Remove ${source.name}`} onClick={() => onRemove(source.id)} disabled={settings.sources.length <= 1}>×</button></article>)}</div><div className="trend-add-source"><div><span className="section-kicker">Add a source</span><strong>RSS or Atom feed</strong><small>It will be included in the next local sync when active.</small></div><input placeholder="Source name" value={newSource.name} onChange={(event) => onNewSource({ ...newSource, name: event.target.value })} /><input placeholder="RSS / Atom URL" value={newSource.url} onChange={(event) => onNewSource({ ...newSource, url: event.target.value })} /><input placeholder="Homepage (optional)" value={newSource.homepage} onChange={(event) => onNewSource({ ...newSource, homepage: event.target.value })} /><button className="button utility" onClick={onAdd}><Icon name="plus" size={14} /> Add source</button></div><div className="jev-settings-footer"><span><Icon name="refresh" size={15} /> Local sync uses active sources immediately. GitHub Actions uses the committed workflow and source config.</span><span>{settings.sources.filter((source) => source.enabled).length} active · 14-day rolling retention</span></div></section>;
}

export default function SettingsPage() {
  const [criteria, setCriteria] = useState<JevCriterion[]>(DEFAULT_JEV_CRITERIA);
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [message, setMessage] = useState("Loading Jev ranking configuration…");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [newCriterion, setNewCriterion] = useState({ label: "", instruction: "", weight: 10 });
  const [trendSettings, setTrendSettings] = useState<TrendRadarSettings>({ version: 1, updatedAt: null, schedule: DEFAULT_TREND_RADAR_SCHEDULE, sources: DEFAULT_TREND_RADAR_SOURCES });
  const [trendSaveState, setTrendSaveState] = useState<SaveState>("loading");
  const [trendMessage, setTrendMessage] = useState("Loading TrendRadar fetch configuration…");
  const [newSource, setNewSource] = useState({ name: "", url: "", homepage: "" });

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/jev-settings", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Could not load settings");
      return response.json() as Promise<{ criteria?: JevCriterion[] }>;
    }).then((result) => {
      if (cancelled) return;
      if (Array.isArray(result.criteria) && result.criteria.length) setCriteria(result.criteria);
      setSaveState("idle");
      setMessage("Changes apply to the next Jev triage run.");
    }).catch(() => {
      if (cancelled) return;
      setSaveState("error");
      setMessage("Could not load the saved configuration. Defaults are available locally.");
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/trendradar-settings", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Could not load TrendRadar settings");
      return response.json() as Promise<TrendRadarSettings>;
    }).then((result) => {
      if (cancelled) return;
      setTrendSettings(result);
      setTrendSaveState("idle");
      setTrendMessage("Source and schedule changes apply to the next sync.");
    }).catch(() => {
      if (cancelled) return;
      setTrendSaveState("error");
      setTrendMessage("Could not load saved fetch settings. Defaults are available locally.");
    });
    return () => { cancelled = true; };
  }, []);

  const totalWeight = useMemo(() => criteria.filter((criterion) => criterion.enabled).reduce((sum, criterion) => sum + Math.max(0, criterion.weight), 0), [criteria]);

  function updateCriterion(id: string, patch: Partial<JevCriterion>) {
    setCriteria((current) => current.map((criterion) => criterion.id === id ? { ...criterion, ...patch } : criterion));
    setSaveState("idle");
    setMessage("Unsaved changes");
  }

  function reorder(fromId: string, toId: string) {
    setCriteria((current) => {
      const from = current.findIndex((criterion) => criterion.id === fromId);
      const to = current.findIndex((criterion) => criterion.id === toId);
      return from === -1 || to === -1 ? current : moveItem(current, from, to);
    });
    setSaveState("idle");
    setMessage("Ranking order changed · save to apply");
  }

  function addCriterion() {
    const label = newCriterion.label.trim();
    const instruction = newCriterion.instruction.trim();
    if (!label || !instruction) {
      setMessage("Add a name and a Jev instruction first.");
      setSaveState("error");
      return;
    }
    const baseId = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "custom-criterion";
    const id = criteria.some((criterion) => criterion.id === baseId) ? `${baseId}-${Date.now().toString(36).slice(-4)}` : baseId;
    setCriteria((current) => [...current, { id, label, description: "Custom editorial criterion.", instruction, weight: Math.max(0, Math.min(100, Number(newCriterion.weight) || 0)), enabled: true }]);
    setNewCriterion({ label: "", instruction: "", weight: 10 });
    setSaveState("idle");
    setMessage("New criterion added · save to apply");
  }

  function resetDefaults() {
    setCriteria(DEFAULT_JEV_CRITERIA.map((criterion) => ({ ...criterion })));
    setSaveState("idle");
    setMessage("Default Jev criteria restored locally · save to apply");
  }

  function updateTrendSchedule(patch: Partial<TrendRadarSchedule>) {
    setTrendSettings((current) => ({ ...current, schedule: { ...current.schedule, ...patch } }));
    setTrendSaveState("idle");
    setTrendMessage("Unsaved TrendRadar fetch changes");
  }

  function updateTrendSource(id: string, patch: Partial<TrendRadarSource>) {
    setTrendSettings((current) => ({ ...current, sources: current.sources.map((source) => source.id === id ? { ...source, ...patch } : source) }));
    setTrendSaveState("idle");
    setTrendMessage("Unsaved source changes");
  }

  function addTrendSource() {
    const name = newSource.name.trim();
    const url = newSource.url.trim();
    if (!name || !url) {
      setTrendSaveState("error");
      setTrendMessage("Add a source name and RSS/Atom URL first.");
      return;
    }
    const baseId = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "custom-source";
    const id = trendSettings.sources.some((source) => source.id === baseId) ? `${baseId}-${Date.now().toString(36).slice(-4)}` : baseId;
    setTrendSettings((current) => ({ ...current, sources: [...current.sources, { id, name, url, homepage: newSource.homepage.trim() || url, enabled: true }] }));
    setNewSource({ name: "", url: "", homepage: "" });
    setTrendSaveState("idle");
    setTrendMessage("New source added · save to apply");
  }

  function removeTrendSource(id: string) {
    if (trendSettings.sources.length <= 1) return;
    setTrendSettings((current) => ({ ...current, sources: current.sources.filter((source) => source.id !== id) }));
    setTrendSaveState("idle");
    setTrendMessage("Source removed · save to apply");
  }

  async function saveTrendSettings() {
    setTrendSaveState("saving");
    setTrendMessage("Saving TrendRadar sources and schedule…");
    try {
      const response = await fetch("/api/trendradar-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(trendSettings) });
      if (!response.ok) throw new Error("Save failed");
      const result = await response.json() as TrendRadarSettings;
      setTrendSettings(result);
      setTrendSaveState("saved");
      setTrendMessage("Saved. The next sync will use these sources; commit the generated config for GitHub Actions.");
    } catch {
      setTrendSaveState("error");
      setTrendMessage("Could not save TrendRadar settings. Check the server and try again.");
    }
  }

  async function save() {
    setSaveState("saving");
    setMessage("Saving Jev ranking configuration…");
    try {
      const response = await fetch("/api/jev-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ criteria }) });
      if (!response.ok) throw new Error("Save failed");
      const result = await response.json() as { criteria?: JevCriterion[] };
      if (result.criteria?.length) setCriteria(result.criteria);
      setSaveState("saved");
      setMessage("Saved. The next triage run will use this ranking model.");
    } catch {
      setSaveState("error");
      setMessage("Could not save. Check the server and try again.");
    }
  }

  return <AppShell><header className="topbar"><div><div className="topbar-kicker">Workspace settings</div><div className="topbar-period">Editorial defaults</div></div></header><div className="page-wrap settings-page"><div className="review-heading"><div><div className="section-kicker">Settings / workspace</div><h1>Configure the intelligence engine</h1><p>Shape how Jev ranks stories before they enter the Capco editorial workflow.</p></div><div className="settings-heading-actions"><span className={`settings-save-state ${saveState}`}><i />{message}</span><button className="button dark" onClick={() => void save()} disabled={saveState === "loading" || saveState === "saving"}><Icon name="check" size={15} />{saveState === "saving" ? "Saving…" : "Save Jev configuration"}</button></div></div>
    <section className="panel jev-settings-panel"><div className="jev-settings-intro"><div><div className="section-kicker">Jev triage model</div><h2>Ranking criteria</h2><p>Drag a criterion to set its priority. Scores are normalized across enabled criteria, so the numeric weights do not need to add up to 100. Priority order breaks ties after the weighted composite.</p></div><div className="jev-weight-total"><span>Active weight</span><strong>{totalWeight}</strong><small>normalized at runtime</small></div></div><div className="jev-criteria-list" onDragOver={(event) => event.preventDefault()}>{criteria.map((criterion, index) => <article key={criterion.id} className={`jev-criterion-row ${criterion.enabled ? "" : "disabled"} ${draggedId === criterion.id ? "dragging" : ""}`} draggable onDragStart={() => setDraggedId(criterion.id)} onDragEnd={() => setDraggedId(null)} onDrop={() => { if (draggedId) reorder(draggedId, criterion.id); setDraggedId(null); }}><div className="jev-drag-handle" title="Drag to reorder" aria-label={`Drag ${criterion.label} to reorder`}><span>⋮⋮</span></div><div className="jev-criterion-order">{String(index + 1).padStart(2, "0")}</div><div className="jev-criterion-copy"><input aria-label={`${criterion.label} name`} value={criterion.label} onChange={(event) => updateCriterion(criterion.id, { label: event.target.value })} /><p>{criterion.description}</p><textarea aria-label={`${criterion.label} Jev instruction`} value={criterion.instruction} onChange={(event) => updateCriterion(criterion.id, { instruction: event.target.value })} rows={2} /></div><label className="jev-weight-field"><span>Weight</span><input type="number" min="0" max="100" step="1" value={criterion.weight} onChange={(event) => updateCriterion(criterion.id, { weight: Number(event.target.value) })} /><small>points</small></label><div className="jev-criterion-actions"><button className="icon-button" title="Move up" aria-label={`Move ${criterion.label} up`} onClick={() => setCriteria((current) => moveItem(current, index, index - 1))} disabled={index === 0}>↑</button><button className="icon-button" title="Move down" aria-label={`Move ${criterion.label} down`} onClick={() => setCriteria((current) => moveItem(current, index, index + 1))} disabled={index === criteria.length - 1}>↓</button><button className={`criterion-toggle ${criterion.enabled ? "on" : ""}`} onClick={() => updateCriterion(criterion.id, { enabled: !criterion.enabled })}>{criterion.enabled ? "Active" : "Off"}</button></div></article>)}</div><div className="jev-add-criterion"><div><span className="section-kicker">Add a criterion</span><strong>What else should Jev notice?</strong><small>Examples: regulatory exposure, enterprise adoption, implementation readiness.</small></div><input placeholder="Criterion name" value={newCriterion.label} onChange={(event) => setNewCriterion((current) => ({ ...current, label: event.target.value }))} /><textarea placeholder="Describe how Jev should score it" value={newCriterion.instruction} onChange={(event) => setNewCriterion((current) => ({ ...current, instruction: event.target.value }))} rows={2} /><label className="jev-new-weight"><span>Weight</span><input type="number" min="0" max="100" value={newCriterion.weight} onChange={(event) => setNewCriterion((current) => ({ ...current, weight: Number(event.target.value) }))} /></label><button className="button utility" onClick={addCriterion}><Icon name="plus" size={14} /> Add criterion</button></div><div className="jev-settings-footer"><span><Icon name="spark" size={15} /> Jev evaluates each enabled criterion against the story’s title, summary, source, and timestamps.</span><button className="text-button" onClick={resetDefaults}>Reset defaults</button></div></section>
    <div className="settings-grid"><section className="panel settings-section"><div className="section-kicker">Delivery</div><h2>Audience defaults</h2><div className="settings-row"><div><strong>Primary edition</strong><span>Use the consultant edition as the review starting point.</span></div><div className="audience-toggle"><button className="selected">Consultant</button><button>Executive</button></div></div><div className="settings-row"><div><strong>Default email sender</strong><span>Capco AI Intelligence Workspace</span></div><button className="text-button">Edit <Icon name="arrow" size={15} /></button></div></section><section className="panel settings-section"><div className="section-kicker">Guardrails</div><h2>Grounding &amp; output</h2><div className="settings-row"><div><strong>Require citations</strong><span>Block approval when a summary has no source reference.</span></div><span className="toggle on"><i /></span></div><div className="settings-row"><div><strong>Lock exact infographic copy</strong><span>Keep text deterministic when artwork is regenerated.</span></div><span className="toggle on"><i /></span></div></section></div>
    <TrendRadarSettingsPanel settings={trendSettings} saveState={trendSaveState} message={trendMessage} newSource={newSource} onSchedule={updateTrendSchedule} onSource={updateTrendSource} onAdd={addTrendSource} onRemove={removeTrendSource} onNewSource={setNewSource} onSave={() => void saveTrendSettings()} />
  </div></AppShell>;
}
