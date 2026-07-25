#!/usr/bin/env python3
"""대전광역시교육청 수집기 (정보마당 > 통합자료실, boardCnts/list.do).
목록 페이징이 boardForm POST(page 필드) 방식이라 세션 POST로 순회한다."""
import os, re, time
from . import base_collector as bc

GOVIEW_RE = re.compile(r"goView\('(\d+)','(\d+)'")


def collect(board, session, log):
    cfg = board["config"]
    params = cfg["params"]                 # {s, m, boardID}
    view_url = cfg["view_url"]             # ...&boardSeq=
    post_url = cfg["post_url"]             # .../boardCnts/list.do
    max_pages = board.get("max_pages", 5)
    # 쿠키 확보
    try:
        bc.get(session, cfg["list_url"])
    except Exception as e:
        log.setdefault("errors", []).append(f"init: {e}")
    seen, raws = set(), []
    for page in range(1, max_pages + 1):
        data = {"s": params["s"], "m": params["m"], "boardID": params["boardID"],
                "boardSeq": "", "lev": "", "searchType": "", "srch3": "", "searchStr": "",
                cfg.get("page_param", "page"): str(page)}
        try:
            r = session.post(post_url, data=data, timeout=20)
            r.raise_for_status()
            time.sleep(0.6)
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
            date = next((t for t in tds if re.fullmatch(r"20\d{2}[-.]\d{2}[-.]\d{2}", t)), "")
            author = next((t for t in tds if "*" in t), "")
            raws.append({
                "external_post_id": seq,
                "title": a.get_text(" ", strip=True),
                "department": "",
                "author": author,
                "published_date": date.replace(".", "-"),
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
        except Exception as e:
            log.setdefault("errors", []).append(f"view {raw['external_post_id']}: {e}")
            continue
        atts, names = [], set()
        for a in d.select("a[href*='FileDown'], a[href*='fileDown'], a[href*='/fileDownload'], a[onclick*='fileDown']"):
            name = re.sub(r"\s*\(\s*[\d.,]+\s*[kmgib]*b?\s*\)\s*$", "", a.get_text(" ", strip=True), flags=re.I).strip()
            if name and "." in name and len(name) > 3 and name not in names:
                names.add(name)
                href = a.get("href") or ""
                atts.append({"file_name": name,
                             "file_url": (cfg["base"] + href if href.startswith("/") else (href or raw["post_url"])),
                             "file_extension": name.rsplit(".", 1)[-1].lower()})
        raw["attachments"] = atts
    return raws
