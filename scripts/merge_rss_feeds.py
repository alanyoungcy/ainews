#!/usr/bin/env python3
"""Merge configured English RSS/Atom feeds into a normalized TrendRadar feed."""

from __future__ import annotations

import argparse
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path


def text_for(element: ET.Element, names: set[str]) -> str | None:
    for child in element.iter():
        if child is element:
            continue
        if child.tag.rsplit("}", 1)[-1].lower() in names:
            value = " ".join("".join(child.itertext()).split())
            if value:
                return value
    return None


def link_for(element: ET.Element) -> str | None:
    for child in element.iter():
        if child is element or child.tag.rsplit("}", 1)[-1].lower() != "link":
            continue
        if child.attrib.get("href"):
            return child.attrib["href"]
        value = " ".join("".join(child.itertext()).split())
        if value:
            return value
    return None


def contains_cjk(value: str | None) -> bool:
    return bool(re.search(r"[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]", value or ""))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True, type=Path)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    feed = json.loads(args.input.read_text(encoding="utf-8"))
    sources = json.loads(args.config.read_text(encoding="utf-8"))
    existing_urls = {item.get("url") for item in feed["items"] if item.get("url")}
    added = []
    failed = []
    for source in sources:
        try:
            request = urllib.request.Request(source["url"], headers={"User-Agent": "Capco-AI-News/1.0"})
            with urllib.request.urlopen(request, timeout=15) as response:
                root = ET.fromstring(response.read())
            nodes = [node for node in root.iter() if node.tag.rsplit("}", 1)[-1].lower() in {"item", "entry"}]
            for index, node in enumerate(nodes):
                title = text_for(node, {"title"}) or "Untitled RSS item"
                url = link_for(node)
                summary = text_for(node, {"description", "summary", "encoded", "content"})
                if contains_cjk(f"{title} {summary or ''} {source['name']}") or not url or url in existing_urls:
                    continue
                existing_urls.add(url)
                added.append({
                    "id": f"rss-live-{source['id']}-{index}", "kind": "rss", "title": title,
                    "sourceId": source["id"], "source": source["name"], "rank": None,
                    "url": url, "publishedAt": text_for(node, {"pubdate", "published", "updated"}),
                    "summary": summary, "author": text_for(node, {"author", "creator"}),
                    "firstSeenAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
                    "lastSeenAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(), "crawlCount": 1,
                })
        except Exception as error:  # noqa: BLE001 - one broken feed must not block the rest
            failed.append(f"{source['name']}: {error}")
    feed["items"].extend(added)
    rss_items = [item for item in feed["items"] if item["kind"] == "rss"]
    feed["source"].update({"totalItems": len(feed["items"]), "rssItems": len(rss_items), "rssFeedCount": len({item["sourceId"] for item in rss_items}), "workflow": "TrendRadar + configured English RSS", "syncedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat()})
    args.output.write_text(json.dumps(feed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Merged {len(added)} RSS items; {len(failed)} feeds failed")


if __name__ == "__main__":
    main()
