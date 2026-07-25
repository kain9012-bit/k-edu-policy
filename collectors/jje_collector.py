#!/usr/bin/env python3
"""제주특별자치도교육청 수집기 (유형 A: 사업별 기본계획 통합 게시판, list.jje/view.jje).
전북과 동일 벤더(skoinfo)라 구조가 같고, 날짜 표기(YY.MM.DD)만 정규화한다."""
import os, re
from urllib.parse import urljoin
from . import base_collector as bc


def _list_url(board, page):
    url = board["config"]["list_url"]
    param = board["config"].get("page_param", "startPage")
    sep = "&" if "?" in url else "?"
    return f"{url}{sep}{param}={page}"


def _norm_date(t):
    m = re.search(r"(\d{2,4})[.\-](\d{1,2})[.\-](\d{1,2})", t)
    if not m:
        return ""
    y, mo, d = m.groups()
    if len(y) == 2:
        y = "20" + y
    return f"{y}-{int(mo):02d}-{int(d):02d}"


def collect(board, session, log):
    base = board["config"]["base"]
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
        rows = s.select("table tbody tr")
        if not rows:
            break
        added = 0
        for tr in rows:
            a = tr.select_one("a[href*='view.jje']")
            if not a:
                continue
            href = a.get("href")
            m = re.search(r"dataSid=(\d+)", href)
            if not m or m.group(1) in seen:
                continue
            pid = m.group(1)
            seen.add(pid); added += 1
            tds = [td.get_text(" ", strip=True) for td in tr.select("td")]
            date = next((_norm_date(t) for t in tds if re.search(r"\d{2}[.\-]\d{1,2}[.\-]\d{1,2}", t)), "")
            # 부서: 날짜/번호가 아닌, 제목 뒤 텍스트 칸
            dept = ""
            for t in tds:
                if t and not t.isdigit() and t != a.get_text(" ", strip=True) and not re.search(r"\d{2}[.\-]\d", t):
                    dept = t
            raws.append({
                "external_post_id": pid,
                "title": a.get_text(" ", strip=True),
                "department": dept,
                "author": "",
                "published_date": date,
                "post_url": urljoin(base, href),
                "attachments": [],
            })
        if added == 0:
            break
    if os.environ.get("SKIP_DETAIL"):
        return raws
    for raw in raws:
        try:
            d = bc.soup(bc.get(session, raw["post_url"]).text)
        except Exception as e:
            log.setdefault("errors", []).append(f"view {raw['external_post_id']}: {e}")
            continue
        atts = []
        for a in d.select("a[href*='download.jje']"):
            name = re.sub(r"\s*\(\s*[\d,]+\s*kb\s*\)\s*$", "", a.get_text(" ", strip=True), flags=re.I).strip()
            if name:
                atts.append({"file_name": name, "file_url": urljoin(base, a.get("href")),
                             "file_extension": (name.rsplit(".", 1)[-1].lower() if "." in name else "")})
        raw["attachments"] = atts
    return raws
