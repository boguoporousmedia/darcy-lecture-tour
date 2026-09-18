#!/usr/bin/env python3
"""Run simple release checks against the rendered public website."""

from __future__ import annotations

import json
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "_site"
REQUIRED_PAGES = (
    "index.html",
    "visits/index.html",
)
REMOVED_PAGES = (
    "about.html",
    "ideas/index.html",
)
REQUIRED_ASSETS = (
    "assets/visits.js",
    "data/public-visits.json",
)
FORBIDDEN_TEXT = (
    "drive.google.com",
    "private_notes",
    "host_email",
    "future_itinerary",
    "Paperwork/",
    "Scheduling/",
    "2027 MOU_Darcy Lecture Series_Guo",
    "&lt;h3&gt;PFAS Fate and Transport",
)


class LinkCollector(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag != "a":
            return
        href = dict(attrs).get("href")
        if href:
            self.links.append(href)


def resolve_internal_link(page: Path, href: str) -> Path | None:
    parsed = urlsplit(href)
    if parsed.scheme or parsed.netloc or href.startswith(("#", "mailto:", "tel:")):
        return None

    path = unquote(parsed.path)
    if not path:
        return None
    target = SITE / path.lstrip("/") if path.startswith("/") else page.parent / path
    if path.endswith("/"):
        target /= "index.html"
    return target.resolve()


def main() -> None:
    failures: list[str] = []

    if not SITE.is_dir():
        raise SystemExit("_site/ does not exist. Run `quarto render` first.")

    for relative in REQUIRED_PAGES:
        if not (SITE / relative).is_file():
            failures.append(f"Missing required page: {relative}")

    for relative in REMOVED_PAGES:
        if (SITE / relative).exists():
            failures.append(f"Removed page still present in rendered site: {relative}")

    for relative in REQUIRED_ASSETS:
        if not (SITE / relative).is_file():
            failures.append(f"Missing required asset: {relative}")

    visits_data_path = SITE / "data/public-visits.json"
    if visits_data_path.is_file():
        try:
            visits_data = json.loads(visits_data_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as error:
            failures.append(f"Invalid public visit JSON: {error}")
            visits_data = []

        if not isinstance(visits_data, list):
            failures.append("Public visit data must be a JSON array.")
            visits_data = []

        required_visit_fields = {
            "date",
            "institution",
            "city",
            "country",
            "latitude",
            "longitude",
            "publish_status",
        }
        private_visit_fields = {"private_notes", "host_email", "future_itinerary"}
        for index, visit in enumerate(visits_data):
            if not isinstance(visit, dict):
                failures.append(f"Public visit record {index} is not an object.")
                continue

            missing = required_visit_fields - visit.keys()
            if missing:
                failures.append(f"Public visit record {index} is missing: {', '.join(sorted(missing))}")
            if visit.get("publish_status") != "published":
                failures.append(f"Public visit record {index} is not explicitly published.")
            exposed = private_visit_fields & visit.keys()
            if exposed:
                failures.append(f"Public visit record {index} exposes private fields: {', '.join(sorted(exposed))}")

            try:
                if date.fromisoformat(str(visit.get("date"))) > date.today():
                    failures.append(f"Public visit record {index} has a future date.")
            except ValueError:
                failures.append(f"Public visit record {index} has an invalid date.")

            for coordinate in ("latitude", "longitude"):
                if not isinstance(visit.get(coordinate), (int, float)):
                    failures.append(f"Public visit record {index} has an invalid {coordinate}.")

    visits_page = SITE / "visits/index.html"
    if visits_page.is_file():
        visits_html = visits_page.read_text(encoding="utf-8")
        for element_id in ('id="visit-map"', 'id="visit-list"'):
            if element_id not in visits_html:
                failures.append(f"Visits page is missing required element: {element_id}")

    html_pages = sorted(SITE.rglob("*.html"))
    for page in html_pages:
        content = page.read_text(encoding="utf-8")
        relative = page.relative_to(SITE)

        for forbidden in FORBIDDEN_TEXT:
            if forbidden.lower() in content.lower():
                failures.append(f"Forbidden public text in {relative}: {forbidden}")

        collector = LinkCollector()
        collector.feed(content)
        for href in collector.links:
            target = resolve_internal_link(page, href)
            if target is None:
                continue
            if SITE.resolve() not in target.parents and target != SITE.resolve():
                failures.append(f"Link escapes public site in {relative}: {href}")
            elif not target.exists():
                failures.append(f"Broken internal link in {relative}: {href}")

    if failures:
        raise SystemExit("\n".join(failures))

    print(f"Validated {len(html_pages)} HTML pages; required pages, links, and privacy checks passed.")


if __name__ == "__main__":
    main()
