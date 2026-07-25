#!/usr/bin/env python3
"""대구광역시교육청 수집기 (교육청안내 > 공개자료실, selectNttList.do).
경기와 같은 벤더지만 첫 요청에 빈 응답을 주는 세션 워밍업 특성이 있어 재시도를 강화한다."""
import os, re, time
from . import base_collector as bc


def _fetch_rows(session, url, tries=6):
    """data-id 행이 나올 때까지 재시도(대구 세션 워밍업 대응)."""
    last = None
    for _ in range(tries):
        try:
            r = session.get(url, timeout=20)
            s = bc.soup(r.text)
            if s.select("table tbody tr a[data-id]"):
                time.sleep(0.5)
                return s
            last = s
        except Exception:
            pass
        time.sleep(1.0)
    return last


def _list_url(board, page):
    url = board["config"]["list_url"]
    param = board["config"].get("page_param", "currPage")
    sep = "&" if "?" in url else "?"
    return f"{url}{sep}{param}={page}"


def collect(board, session, log):
    view_url = board["config"]["view_url"]
    max_pages = board.get("max_pages", 5)
    # 워밍업(첫 빈 응답 흘려보내기)
    try:
        session.get(board["config"].get("base", "https://www.dge.go.kr") + "/main/main.do", timeout=15)
    except Exception:
        pass
    seen, raws = set(), []
    for page in range(1, max_pages + 1):
        s = _fetch_rows(session, _list_url(board, page))
        if s is None:
            log["error_count"] += 1
            log.setdefault("errors", []).append(f"list p{page}: 빈 응답")
            break
        added = 0
        for tr in s.select("table tbody tr"):
            a = tr.select_one("a[data-id]")
            if not a:
                continue
            pid = a.get("data-id")
            if not pid or pid in seen:
                continue
            seen.add(pid); added += 1
            title = re.sub(r"^제목\s*", "", re.sub(r"\s+", " ", a.get_text(" ", strip=True))).strip()
            tds = [re.sub(r"\s+", " ", td.get_text(" ", strip=True)) for td in tr.select("td")]
            dept = ""
            date = ""
            for t in tds:
                mm = re.search(r"(20\d{2}[-.]\d{2}[-.]\d{2})", t)
                if mm:
                    date = mm.group(1).replace(".", "-")
                else:
                    tt = re.sub(r"^(부서|게시자|작성자|담당)\s*", "", t).strip()
                    if tt and tt != title and "과" in tt and len(tt) <= 12 and not tt.isdigit():
                        dept = dept or tt
            raws.append({
                "external_post_id": pid, "title": title, "department": dept, "author": "",
                "published_date": date, "post_url": view_url + pid, "attachments": [],
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
        for a in d.select("a[onclick*='fnFileDown'], a[href*='FileDown'], a[href*='fileDown'], a[href*='download']"):
            name = re.sub(r"\s*\(\s*[\d.,]+\s*[kmgib]*b?\s*\)\s*$", "", a.get_text(" ", strip=True), flags=re.I).strip()
            if name and "." in name and len(name) > 3 and name not in names:
                names.add(name); href = a.get("href") or ""
                atts.append({"file_name": name,
                             "file_url": (board["config"]["base"] + href if href.startswith("/") else (href or raw["post_url"])),
                             "file_extension": name.rsplit(".", 1)[-1].lower()})
        raw["attachments"] = atts
    return raws
