import fs from "node:fs";
import path from "node:path";

type MemoryEntry = {
  key: string;
  savedAt: string;
  result: Record<string, unknown>;
};

function memoryPath() {
  return path.join(process.cwd(), "data", "trendradar", "infographic-memory.json");
}

function hashKey(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

export function infographicMemoryKey(payload: unknown) {
  function stable(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)]));
    }
    return value;
  }
  return hashKey(JSON.stringify(stable(payload)));
}

export function readInfographicMemory(key: string) {
  try {
    const entries = JSON.parse(fs.readFileSync(memoryPath(), "utf8")) as MemoryEntry[];
    const entry = entries.find((candidate) => candidate.key === key);
    return entry?.result ?? null;
  } catch {
    return null;
  }
}

export function writeInfographicMemory(key: string, result: Record<string, unknown>) {
  try {
    const filePath = memoryPath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    let entries: MemoryEntry[] = [];
    try {
      entries = JSON.parse(fs.readFileSync(filePath, "utf8")) as MemoryEntry[];
    } catch {
      entries = [];
    }
    const next = [{ key, savedAt: new Date().toISOString(), result }, ...entries.filter((entry) => entry.key !== key)].slice(0, 12);
    fs.writeFileSync(filePath, JSON.stringify(next), "utf8");
  } catch {
    // Hosted runtimes may be read-only; the request still returns the live result.
  }
}
