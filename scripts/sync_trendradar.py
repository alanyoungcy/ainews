#!/usr/bin/env python3
"""Normalize a TrendRadar SQLite snapshot for the Capco AI News workspace.

TrendRadar writes one SQLite database per day to output/news/YYYY-MM-DD.db
and output/rss/YYYY-MM-DD.db. This adapter preserves both hot-list and RSS
records while leaving summaries and editorial interpretation to the next AI
stage in the Capco workspace.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


REPOSITORY = "https://github.com/alanyoungcy/trendradar-capco"
SCHEMA_VERSION = 1


def read_snapshot(db_path: Path, rss_db_path: Path | None = None) -> dict:
    if not db_path.exists():
        raise FileNotFoundError(f"TrendRadar database not found: {db_path}")

    with sqlite3.connect(db_path) as connection:
        connection.row_factory = sqlite3.Row
        crawl = connection.execute(
            "SELECT crawl_time, total_items FROM crawl_records ORDER BY id DESC LIMIT 1"
        ).fetchone()
        rows = connection.execute(
            """
            SELECT
              news_items.id,
              news_items.title,
              news_items.platform_id,
              news_items.rank,
              news_items.url,
              news_items.mobile_url,
              news_items.first_crawl_time,
              news_items.last_crawl_time,
              news_items.crawl_count,
              platforms.name AS platform_name
            FROM news_items
            LEFT JOIN platforms ON platforms.id = news_items.platform_id
            ORDER BY news_items.rank ASC, news_items.last_crawl_time DESC, news_items.id ASC
            """
        ).fetchall()
        platform_count = connection.execute(
            "SELECT COUNT(*) FROM platforms WHERE is_active = 1"
        ).fetchone()[0]

    rss_rows: list[sqlite3.Row] = []
    rss_feed_count = 0
    if rss_db_path and rss_db_path.is_file():
        with sqlite3.connect(rss_db_path) as connection:
            connection.row_factory = sqlite3.Row
            rss_rows = connection.execute(
                """
                SELECT
                  rss_items.id,
                  rss_items.title,
                  rss_items.feed_id,
                  rss_items.url,
                  rss_items.published_at,
                  rss_items.summary,
                  rss_items.author,
                  rss_items.first_crawl_time,
                  rss_items.last_crawl_time,
                  rss_items.crawl_count,
                  rss_feeds.name AS feed_name
                FROM rss_items
                LEFT JOIN rss_feeds ON rss_feeds.id = rss_items.feed_id
                ORDER BY rss_items.published_at DESC, rss_items.id ASC
                """
            ).fetchall()
            rss_feed_count = connection.execute(
                "SELECT COUNT(*) FROM rss_feeds WHERE is_active = 1"
            ).fetchone()[0]

    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    return {
        "schemaVersion": SCHEMA_VERSION,
        "source": {
            "repository": REPOSITORY,
            "workflow": "Get Hot News",
            "databaseDate": db_path.stem,
            "crawlTime": crawl["crawl_time"] if crawl else None,
            "totalItems": len(rows) + len(rss_rows),
            "hotListItems": len(rows),
            "rssItems": len(rss_rows),
            "platformCount": int(platform_count),
            "rssFeedCount": int(rss_feed_count),
            "syncedAt": generated_at,
        },
        "items": [
            *[
                {
                    "id": str(row["id"]),
                    "kind": "hotlist",
                    "title": row["title"],
                    "sourceId": row["platform_id"],
                    "source": row["platform_name"] or row["platform_id"],
                    "rank": int(row["rank"]),
                    "url": row["url"] or row["mobile_url"] or None,
                    "publishedAt": None,
                    "summary": None,
                    "author": None,
                    "firstSeenAt": row["first_crawl_time"],
                    "lastSeenAt": row["last_crawl_time"],
                    "crawlCount": int(row["crawl_count"] or 0),
                }
                for row in rows
            ],
            *[
                {
                    "id": f"rss-{row['id']}",
                    "kind": "rss",
                    "title": row["title"],
                    "sourceId": row["feed_id"],
                    "source": row["feed_name"] or row["feed_id"],
                    "rank": None,
                    "url": row["url"] or None,
                    "publishedAt": row["published_at"],
                    "summary": row["summary"],
                    "author": row["author"],
                    "firstSeenAt": row["first_crawl_time"],
                    "lastSeenAt": row["last_crawl_time"],
                    "crawlCount": int(row["crawl_count"] or 0),
                }
                for row in rss_rows
            ],
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", required=True, type=Path, help="TrendRadar output/news/*.db path")
    parser.add_argument("--rss-db", type=Path, help="TrendRadar output/rss/*.db path")
    parser.add_argument("--output", required=True, type=Path, help="Normalized JSON output path")
    args = parser.parse_args()

    payload = read_snapshot(args.db, args.rss_db)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Synced {len(payload['items'])} TrendRadar items from {args.db} to {args.output}")


if __name__ == "__main__":
    main()
