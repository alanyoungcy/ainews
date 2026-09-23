import fs from "node:fs";
import path from "node:path";

export type DispatchedStory = {
  id: string;
  title: string;
  source: string;
  url: string | null;
  dispatchedAt: string;
};

type StoredEditionStatus = { sentAt: string | null; dispatchedStories: DispatchedStory[] };

function statusPath() {
  return path.join(process.cwd(), "data", "edition-status.json");
}

function readStatus(): StoredEditionStatus {
  try {
    const parsed = JSON.parse(fs.readFileSync(statusPath(), "utf8")) as Partial<StoredEditionStatus>;
    return { sentAt: parsed.sentAt ?? null, dispatchedStories: Array.isArray(parsed.dispatchedStories) ? parsed.dispatchedStories : [] };
  } catch {
    return { sentAt: null, dispatchedStories: [] };
  }
}

function weekKey(value: Date) {
  const date = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function getEditionStatus() {
  const stored = readStatus();
  const now = new Date();
  return {
    sentAt: stored.sentAt,
    currentWeek: weekKey(now),
    sentThisWeek: stored.sentAt ? weekKey(new Date(stored.sentAt)) === weekKey(now) : false,
    dispatchedStoryIds: stored.dispatchedStories.map((story) => story.id),
    dispatchedStories: stored.dispatchedStories,
  };
}

export function markEditionSent(stories: Array<Omit<DispatchedStory, "dispatchedAt"> | DispatchedStory> = []) {
  const sentAt = new Date().toISOString();
  const existing = readStatus();
  const incoming = stories.map((story) => ({ ...story, dispatchedAt: "dispatchedAt" in story && story.dispatchedAt ? story.dispatchedAt : sentAt }));
  const merged = [...existing.dispatchedStories];
  for (const story of incoming) {
    const duplicate = merged.findIndex((item) => item.id === story.id || (story.url && item.url === story.url));
    if (duplicate >= 0) merged[duplicate] = { ...merged[duplicate], ...story, dispatchedAt: merged[duplicate].dispatchedAt };
    else merged.push(story);
  }
  try {
    const filePath = statusPath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({ sentAt, dispatchedStories: merged }, null, 2), "utf8");
  } catch {
    // Keep the in-request result usable on read-only hosts.
  }
  return getEditionStatus();
}
