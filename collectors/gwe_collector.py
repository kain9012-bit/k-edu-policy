#!/usr/bin/env python3
"""강원특별자치도교육청 수집기 (list.do?key=... / goView(id) → view.do?bbsSn=id).
제목이 '[부서] 계획명' 형태라 부서를 접두어에서 추출한다."""
import os, re
from . import base_collector as bc

DEPT_RE = re.compile(r"^\[([^\]]+)\]\s*")
GOVIEW_RE = re.compile(r"goView\(\s*'(\d+)'")


def _list_url(board, page):
    url = board["config"]["list_url"]
    param = board["config"].get("page_param", "pageIndex")
    sep = "&" if "?" in url else "?"
    return f"{url}{sep}{param}={page}"


def _view_url(board, pid):
    return board["config"]["view_url"] + pid


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
        rows = s.select("table tbody tr")
        if not rows:
            break
        added = 0
        for tr in rows:
            a = tr.select_one("a[onclick*='goView']")
            if not a:
                continue
            m = GOVIEW_RE.search(a.get("onclick") or "")
            if not m or m.group(1) in seen:
                continue
            pid = m.group(1)
            seen.add(pid); added += 1
            raw_title = re.sub(r"\s+", " ", a.get_text(" ", strip=True)).strip()
            dept = ""
            dm = DEPT_RE.match(raw_title)
            if dm:
                dept = dm.group(1).strip()
                title = DEPT_RE.sub("", raw_title).strip()
            else:
                title = raw_title
            tds = [td.get_text(" ", strip=True) for td in tr.select("td")]
            # 날짜는 pick_date 로 고른다. 셀을 훑어 처음 걸린 값을 쓰면
            # 제목에 적힌 날짜('2026.9.1.자 …')를 게시일로 잘못 집는다.
            date = bc.pick_date(tds)
            author = ""
            for t in tds:
                if bc.parse_date(t):
                    continue
                if t and not t.isdigit() and len(t) <= 8 and t not in raw_title and not re.search(r"계획|알림", t):
                    author = author or t
            raws.append({
                "external_post_id": pid,
                "title": title,
                "department": dept,
                "author": author,
                "published_date": date,
                "post_url": _view_url(board, pid),
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
        for a in d.select("a[href*='FileDown'], a[href*='fileDown'], a[href*='/file/'], a[onclick*='fileDown'], a[onclick*='fnDown']"):
            name = re.sub(r"\s*\(\s*[\d.,]+\s*[kmgkib]*b?\s*\)\s*$", "", a.get_text(" ", strip=True), flags=re.I).strip()
            if name and "." in name and len(name) > 3:
                href = a.get("href") or ""
                atts.append({"file_name": name,
                             "file_url": (bc.ROOT and (board["config"]["base"] + href if href.startswith("/") else href)) or raw["post_url"],
                             "file_extension": name.rsplit(".", 1)[-1].lower()})
        uniq, names = [], set()
        for x in atts:
            if x["file_name"] not in names:
                names.add(x["file_name"]); uniq.append(x)
        raw["attachments"] = uniq
    return raws
