import fs from "node:fs";
import path from "node:path";
import { normalizeTrendRadarSettings, type TrendRadarSettings } from "@/lib/trendradar-settings";

function settingsPath() {
  return path.join(process.cwd(), "data", "trendradar", "settings.json");
}

function rssConfigPath() {
  return path.join(process.cwd(), "config", "english-rss.json");
}

function workflowPath() {
  return path.join(process.cwd(), ".github", "workflows", "trendradar-sync.yml");
}

export function getTrendRadarSettings(): TrendRadarSettings {
  try {
    return normalizeTrendRadarSettings(JSON.parse(fs.readFileSync(settingsPath(), "utf8")));
  } catch {
    return normalizeTrendRadarSettings({});
  }
}

export function writeTrendRadarSettings(value: unknown) {
  const settings = normalizeTrendRadarSettings({ ...(value as object ?? {}), updatedAt: new Date().toISOString() });
  try {
    fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
    fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), "utf8");
    fs.writeFileSync(rssConfigPath(), `${JSON.stringify(settings.sources.filter((source) => source.enabled).map(({ enabled: _enabled, ...source }) => source), null, 2)}\n`, "utf8");
    const workflow = fs.readFileSync(workflowPath(), "utf8");
    const updatedWorkflow = workflow.replace(/(schedule:\s*\n\s*- cron:\s*)"[^"]+"/, `$1"${settings.schedule.cron}"`);
    if (updatedWorkflow !== workflow) fs.writeFileSync(workflowPath(), updatedWorkflow, "utf8");
  } catch {
    // Hosted deployments may be read-only; the request still returns the new settings.
  }
  return settings;
}
