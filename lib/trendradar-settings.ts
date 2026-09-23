import configuredSources from "@/config/english-rss.json";

export type TrendRadarSource = {
  id: string;
  name: string;
  homepage: string;
  url: string;
  enabled: boolean;
};

export type TrendRadarSchedule = {
  label: string;
  cron: string;
  timezone: string;
};

export type TrendRadarSettings = {
  version: 1;
  updatedAt: string | null;
  schedule: TrendRadarSchedule;
  sources: TrendRadarSource[];
};

export const DEFAULT_TREND_RADAR_SCHEDULE: TrendRadarSchedule = {
  label: "Weekly · Monday",
  cron: "15 1 * * 1",
  timezone: "UTC",
};

export const DEFAULT_TREND_RADAR_SOURCES: TrendRadarSource[] = configuredSources.map((source) => ({ ...source, enabled: true }));

export function normalizeTrendRadarSettings(value: unknown): TrendRadarSettings {
  const input = value && typeof value === "object" ? value as Partial<TrendRadarSettings> : {};
  const scheduleInput = input.schedule && typeof input.schedule === "object" ? input.schedule as Partial<TrendRadarSchedule> : {};
  const sources = Array.isArray(input.sources) ? input.sources : DEFAULT_TREND_RADAR_SOURCES;
  const normalizedSources = sources.map((source) => {
    const item = source && typeof source === "object" ? source as Partial<TrendRadarSource> : {};
    return {
      id: String(item.id ?? "source").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-") || "source",
      name: String(item.name ?? "Unnamed source").trim() || "Unnamed source",
      homepage: String(item.homepage ?? item.url ?? "").trim(),
      url: String(item.url ?? "").trim(),
      enabled: item.enabled !== false,
    };
  }).filter((source) => source.url);
  const requestedCron = String(scheduleInput.cron ?? DEFAULT_TREND_RADAR_SCHEDULE.cron).trim();
  const cron = /^[0-9*/?,\- ]+$/.test(requestedCron) ? requestedCron : DEFAULT_TREND_RADAR_SCHEDULE.cron;
  return {
    version: 1,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : null,
    schedule: {
      label: String(scheduleInput.label ?? DEFAULT_TREND_RADAR_SCHEDULE.label),
      cron: cron || DEFAULT_TREND_RADAR_SCHEDULE.cron,
      timezone: String(scheduleInput.timezone ?? DEFAULT_TREND_RADAR_SCHEDULE.timezone),
    },
    sources: normalizedSources,
  };
}
