import fs from "node:fs";
import path from "node:path";

type StoredEditionStatus = { sentAt: string | null };

function statusPath() {
  return path.join(process.cwd(), "data", "edition-status.json");
}

function readStatus(): StoredEditionStatus {
  try {
    return JSON.parse(fs.readFileSync(statusPath(), "utf8")) as StoredEditionStatus;
  } catch {
    return { sentAt: null };
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
  return { sentAt: stored.sentAt, currentWeek: weekKey(now), sentThisWeek: stored.sentAt ? weekKey(new Date(stored.sentAt)) === weekKey(now) : false };
}

export function markEditionSent() {
  const sentAt = new Date().toISOString();
  try {
    const filePath = statusPath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({ sentAt }), "utf8");
  } catch {
    // Keep the in-request result usable on read-only hosts.
  }
  return getEditionStatus();
}
