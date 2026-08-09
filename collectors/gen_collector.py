#!/usr/bin/env python3
"""광주광역시교육청 수집기 (xboard/board.php 방식).
목록: board.php?tbnum=NN&page=N, 상세: board.php?...mode=view&number=NNN"""
import os, re
from urllib.parse import urljoin
from . import base_collector as bc

NUM_RE = re.compile(r"number=(\d+)")


def _list_url(board, page):
    url = board["config"]["list_url"]
    param = board["config"].get("page_param", "page")
    sep = "&" if "?" in url else "?"
    return f"{url}{sep}{param}={page}"


def collect(board, session, log):
    max_pages = board.get("max_pages", 5)
    seen, raws = set(), []
    for page in range(1, max_pages + 1):
        try:
            r = bc.get(session, _list_url(board, page))
        except Exception as e:
            log["error_count"] += 1
            log.setdefault("errors", []).append(f"list p{page}: {e}")
            break
        s = bc.soup(r.text)
        rows = s.select("table tbody tr") or s.select("table tr")
        added = 0
        for tr in rows:
            a = tr.select_one("a[href*='mode=view']")
            if not a:
                continue
            m = NUM_RE.search(a.get("href") or "")
            if not m or m.group(1) in seen:
                continue
            pid = m.group(1)
            seen.add(pid); added += 1
            title = re.sub(r"\s+", " ", a.get_text(" ", strip=True)).strip()
            tds = [re.sub(r"\s+", " ", td.get_text(" ", strip=True)) for td in tr.select("td")]
            date = ""
            dept = ""
            for t in tds:
                mm = bc.parse_date(t)
                if mm:
                    date = date or mm
                elif t and t != title and re.search(r"(과|관|담당관|단|실)$", t) and len(t) <= 12:
                    dept = dept or t
            raws.append({
                "external_post_id": pid, "title": title, "department": dept, "author": "",
                "published_date": date,
                "post_url": urljoin(board["config"]["list_url"], a.get("href")),
                "attachments": [],
            })
        if added == 0:
            break
    if os.environ.get("SKIP_DETAIL"):
        return raws
    for raw in raws:
        try:
            d = bc.soup(bc.get(session, raw["post_url"]).text)
        except Exception:
            continue
        atts, names = [], set()
        for a in d.select("a[href*='download'], a[href*='filedown'], a[href*='file_down']"):
            name = re.sub(r"\s*\(\s*[\d.,]+\s*[kmgib]*b?\s*\)\s*$", "", a.get_text(" ", strip=True), flags=re.I).strip()
            if name and "." in name and len(name) > 3 and name not in names:
                names.add(name)
                atts.append({"file_name": name,
                             "file_url": urljoin(raw["post_url"], a.get("href") or ""),
                             "file_extension": name.rsplit(".", 1)[-1].lower()})
        raw["attachments"] = atts
    return raws
