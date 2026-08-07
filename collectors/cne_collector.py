#!/usr/bin/env python3
"""충청남도교육청 수집기 (boardCnts/list.do, GET 페이징 방식).
대전과 같은 벤더지만 목록이 POST가 아니라 GET(page 파라미터)으로 동작한다."""
import os, re
from . import base_collector as bc

GOVIEW_RE = re.compile(r"goView\('(\d+)','(\d+)'")


def _list_url(board, page):
    url = board["config"]["list_url"]
    param = board["config"].get("page_param", "page")
    sep = "&" if "?" in url else "?"
    return f"{url}{sep}{param}={page}"


def collect(board, session, log):
    view_url = board["config"]["view_url"]
    max_pages = board.get("max_pages", 3)
    seen, raws = set(), []
    for page in range(1, max_pages + 1):
        try:
            r = bc.get(session, _list_url(board, page))
        except Exception as e:
            log["error_count"] += 1
            log.setdefault("errors", []).append(f"list p{page}: {e}")
            break
        s = bc.soup(r.text)
        rows = s.select("table tbody tr")
        added = 0
        for tr in rows:
            a = tr.select_one("a[onclick*='goView']")
            if not a:
                continue
            m = GOVIEW_RE.search(a.get("onclick") or "")
            if not m or m.group(2) in seen:
                continue
            seq = m.group(2)
            seen.add(seq); added += 1
            tds = [re.sub(r"\s+", " ", td.get_text(" ", strip=True)) for td in tr.select("td")]
            date = next((t.replace(".", "-") for t in tds
                         if re.fullmatch(r"20\d{2}[-.]\d{2}[-.]\d{2}", t)), "")
            dept = next((t for t in tds if re.search(r"(과|관|담당관|단|실)$", t) and len(t) <= 12), "")
            raws.append({
                "external_post_id": seq,
                "title": re.sub(r"\s+", " ", a.get_text(" ", strip=True)).strip(),
                "department": dept, "author": "",
                "published_date": date,
                "post_url": view_url + seq,
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
        for a in d.select("a[href*='FileDown'], a[href*='fileDown'], a[href*='/fileDownload'], a[onclick*='fileDown']"):
            name = re.sub(r"\s*\(\s*[\d.,]+\s*[kmgib]*b?\s*\)\s*$", "", a.get_text(" ", strip=True), flags=re.I).strip()
            if name and "." in name and len(name) > 3 and name not in names:
                names.add(name); href = a.get("href") or ""
                atts.append({"file_name": name,
                             "file_url": (board["config"]["base"] + href if href.startswith("/") else (href or raw["post_url"])),
                             "file_extension": name.rsplit(".", 1)[-1].lower()})
        raw["attachments"] = atts
    return raws
