# TrendRadar bridge

The AI News workspace consumes a normalized snapshot at
`data/trendradar/latest.json`.

The scheduled workflow at `.github/workflows/trendradar-sync.yml` checks out
`alanyoungcy/trendradar-capco`, runs its native GitHub Actions-compatible
command (`uv run python -m trendradar`), reads the newest
`output/news/YYYY-MM-DD.db` and `output/rss/YYYY-MM-DD.db` files, and commits
the normalized feed back into this repository.

The bridge deliberately keeps TrendRadar responsible for collection and
ranking. The Next.js application can then use the feed for topic selection,
grounded summaries, and the weekly infographic generation step.

## AI editorial layer

The dashboard's `Run AI synthesis` action reads the normalized feed and creates
a weekly Capco communication: a thesis, selected AI stories, Capco
implications, recommended actions, citations, and an infographic brief. The
infographic editor sends that brief to the configured image model so artwork is
generated from the same editorial point of view while the exact overlay copy
stays deterministic.

Copy `.env.example` to `.env.local` and set `AI_API_KEY` to enable provider-backed
synthesis and image generation. If no key is present, the app intentionally
shows a clearly labelled grounded local draft instead of inventing uncited
claims.

The workflow uses the public TrendRadar repository and does not require a
TrendRadar token. If the TrendRadar configuration is changed to use AI
filtering or notifications, add those values as secrets in the AI News
repository and pass them through the workflow environment.
