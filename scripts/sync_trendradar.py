#!/usr/bin/env python3
"""Normalize a TrendRadar SQLite snapshot for the Capco AI News workspace.

TrendRadar writes one SQLite database per day to output/news/YYYY-MM-DD.db.
This adapter keeps the integration deliberately small: it preserves the
headline, source, rank, URLs, and crawl timestamps, while leaving summaries
and editorial interpretation to the next AI stage in the Capco workspace.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


REPOSITORY = "https://github.com/alanyoungcy/trendradar-capco"
SCHEMA_VERSION = 1


def read_snapshot(db_path: Path) -> dict:
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

    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    return {
        "schemaVersion": SCHEMA_VERSION,
        "source": {
            "repository": REPOSITORY,
            "workflow": "Get Hot News",
            "databaseDate": db_path.stem,
            "crawlTime": crawl["crawl_time"] if crawl else None,
            "totalItems": int(crawl["total_items"] if crawl else len(rows)),
            "platformCount": int(platform_count),
            "syncedAt": generated_at,
        },
        "items": [
            {
                "id": str(row["id"]),
                "title": row["title"],
                "sourceId": row["platform_id"],
                "source": row["platform_name"] or row["platform_id"],
                "rank": int(row["rank"]),
                "url": row["url"] or row["mobile_url"] or None,
                "firstSeenAt": row["first_crawl_time"],
                "lastSeenAt": row["last_crawl_time"],
                "crawlCount": int(row["crawl_count"] or 0),
            }
            for row in rows
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", required=True, type=Path, help="TrendRadar output/news/*.db path")
    parser.add_argument("--output", required=True, type=Path, help="Normalized JSON output path")
    args = parser.parse_args()

    payload = read_snapshot(args.db)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Synced {len(payload['items'])} TrendRadar items from {args.db} to {args.output}")


if __name__ == "__main__":
    main()
