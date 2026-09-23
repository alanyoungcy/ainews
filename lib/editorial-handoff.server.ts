import fs from "node:fs";
import path from "node:path";

export type EditorialHandoffStage = "stage02" | "stage03";

type EditorialHandoffStore = Partial<Record<EditorialHandoffStage, unknown>>;

function handoffPath() {
  return path.join(process.cwd(), "data", "trendradar", "editorial-handoff.json");
}

function readStore(): EditorialHandoffStore {
  try {
    const value = JSON.parse(fs.readFileSync(handoffPath(), "utf8")) as EditorialHandoffStore;
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

export function readEditorialHandoff(stage?: EditorialHandoffStage) {
  const store = readStore();
  return stage ? store[stage] ?? null : store;
}

export function writeEditorialHandoff(stage: EditorialHandoffStage, value: unknown) {
  try {
    const filePath = handoffPath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const store = readStore();
    store[stage] = value;
    fs.writeFileSync(filePath, JSON.stringify(store), "utf8");
  } catch {
    // Hosted runtimes may be read-only; the browser handoff remains available.
  }
}
