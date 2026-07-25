#!/usr/bin/env python3
"""전북특별자치도교육청 수집기 (유형 A: 계획서 전용 게시판, list.jbe/view.jbe)."""
import re
from urllib.parse import urljoin
from . import base_collector as bc


def _list_url(board, page):
    url = board["config"]["list_url"]
    param = board["config"].get("page_param", "startPage")
    sep = "&" if "?" in url else "?"
    return f"{url}{sep}{param}={page}"


def collect(board, session, log):
    base = board["config"]["base"]
    max_pages = board.get("max_pages", 5)
    seen = set()
    raws = []
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
        page_ids = []
        for tr in rows:
            a = tr.select_one("a[href*='view.jbe']")
            if not a:
                continue
            tds = [td.get_text(" ", strip=True) for td in tr.select("td")]
            href = a.get("href")
            m = re.search(r"dataSid=(\d+)", href)
            if not m:
                continue
            pid = m.group(1)
            if pid in seen:
                continue
            seen.add(pid)
            page_ids.append(pid)
            title = a.get_text(" ", strip=True)
            # 컬럼: 번호, 제목, 부서, 등록일, 조회
            dept = tds[2] if len(tds) > 2 else ""
            date = ""
            for t in tds:
                mm = re.match(r"(20\d{2}-\d{2}-\d{2})", t)
                if mm:
                    date = mm.group(1)
                    break
            raws.append({
                "external_post_id": pid,
                "title": title,
                "department": dept,
                "author": "",
                "published_date": date,
                "post_url": urljoin(base, href),
                "attachments": [],
            })
        if not page_ids:
            break
    import os
    if os.environ.get("SKIP_DETAIL"):
        return raws
    # 상세 페이지에서 첨부파일 수집(정중하게, 최신 위주)
    for raw in raws:
        try:
            d = bc.soup(bc.get(session, raw["post_url"]).text)
        except Exception as e:
            log.setdefault("errors", []).append(f"view {raw['external_post_id']}: {e}")
            continue
        atts = []
        for a in d.select("a[href*='download.jbe']"):
            name = a.get_text(" ", strip=True)
            name = re.sub(r"\s*\(\s*[\d,]+\s*kb\s*\)\s*$", "", name, flags=re.I).strip()
            if name:
                atts.append({"file_name": name, "file_url": urljoin(base, a.get("href")),
                             "file_extension": (name.rsplit(".", 1)[-1].lower() if "." in name else "")})
        raw["attachments"] = atts
    return raws
