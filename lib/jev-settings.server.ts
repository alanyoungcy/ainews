import fs from "node:fs";
import path from "node:path";
import { DEFAULT_JEV_CRITERIA, normalizeJevSettings, type JevSettings } from "@/lib/jev-settings";

function settingsPath() {
  return path.join(process.cwd(), "data", "trendradar", "jev-settings.json");
}

export function getJevSettings(): JevSettings {
  try {
    return normalizeJevSettings(JSON.parse(fs.readFileSync(settingsPath(), "utf8")));
  } catch {
    return { version: 1, updatedAt: null, criteria: DEFAULT_JEV_CRITERIA };
  }
}

export function writeJevSettings(criteria: unknown): JevSettings {
  const settings: JevSettings = { version: 1, updatedAt: new Date().toISOString(), criteria: normalizeJevSettings({ criteria }).criteria };
  try {
    fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
    fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), "utf8");
  } catch {
    // Hosted read-only filesystems retain the live request configuration only.
  }
  return settings;
}
