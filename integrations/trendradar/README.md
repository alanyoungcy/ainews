# TrendRadar bridge

The AI News workspace consumes a normalized snapshot at
`data/trendradar/latest.json`.

The scheduled workflow at `.github/workflows/trendradar-sync.yml` checks out
`alanyoungcy/trendradar-capco`, runs its native GitHub Actions-compatible
command (`uv run python -m trendradar`), reads the newest
`output/news/YYYY-MM-DD.db` file, and commits the normalized feed back into
this repository.

The bridge deliberately keeps TrendRadar responsible for collection and
ranking. The Next.js application can then use the feed for topic selection,
grounded summaries, and the weekly infographic generation step.

The workflow uses the public TrendRadar repository and does not require a
TrendRadar token. If the TrendRadar configuration is changed to use AI
filtering or notifications, add those values as secrets in the AI News
repository and pass them through the workflow environment.
