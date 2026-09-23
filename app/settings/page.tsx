"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell/AppShell";
import { Icon } from "@/components/ui/Icon";
import { DEFAULT_JEV_CRITERIA, type JevCriterion } from "@/lib/jev-settings";

type SaveState = "loading" | "idle" | "saving" | "saved" | "error";

function moveItem(items: JevCriterion[], from: number, to: number) {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export default function SettingsPage() {
  const [criteria, setCriteria] = useState<JevCriterion[]>(DEFAULT_JEV_CRITERIA);
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [message, setMessage] = useState("Loading Jev ranking configuration…");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [newCriterion, setNewCriterion] = useState({ label: "", instruction: "", weight: 10 });

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
  </div></AppShell>;
}
