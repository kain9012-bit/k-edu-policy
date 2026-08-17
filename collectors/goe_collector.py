#!/usr/bin/env python3
"""경기도교육청 수집기 (유형 B: 정책집중 게시판, selectNttList.do / data-id → selectNttInfo.do)."""
import re
from urllib.parse import urljoin
from . import base_collector as bc


def _list_url(board, page):
    url = board["config"]["list_url"]
    param = board["config"].get("page_param", "nttListPageIndex")
    sep = "&" if "?" in url else "?"
    return f"{url}{sep}{param}={page}"


def collect(board, session, log):
    view_url = board["config"]["view_url"]
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
        added = 0
        for tr in rows:
            a = tr.select_one("a[data-id]")
            if not a:
                continue
            pid = a.get("data-id")
            if not pid or pid in seen:
                continue
            seen.add(pid)
            added += 1
            # 제목: 링크 텍스트에서 '제목' 라벨 제거
            title = re.sub(r"^제목\s*", "", a.get_text(" ", strip=True)).strip()
            tds = [td.get_text(" ", strip=True) for td in tr.select("td")]
            # 날짜는 pick_date 로 고른다. 셀을 훑어 처음 걸린 값을 쓰면
            # 제목에 적힌 날짜('2026.9.1.자 …')를 게시일로 잘못 집는다.
            date = bc.pick_date(tds)
            author = ""
            for t in tds:
                if t.startswith("작성자"):
                    author = t.replace("작성자", "").strip()
            raws.append({
                "external_post_id": pid,
                "title": title,
                "department": "",
                "author": author,
                "published_date": date,
                "post_url": view_url + pid,
                "attachments": [],
            })
        if added == 0:
            break
    import os
    if os.environ.get("SKIP_DETAIL"):
        return raws
    # 상세: 첨부파일명 수집(파일 실제 URL은 goFileDown 해시 기반이라 파일명 우선 저장)
    for raw in raws:
        try:
            d = bc.soup(bc.get(session, raw["post_url"]).text)
        except Exception as e:
            log.setdefault("errors", []).append(f"view {raw['external_post_id']}: {e}")
            continue
        atts = []
        for a in d.select("a[onclick*='goFileDown'], a[href*='FileDown'], a[href*='download']"):
            name = a.get_text(" ", strip=True)
            name = re.sub(r"\s*\(\s*[\d.,]+\s*[kmb]*b?\s*\)\s*$", "", name, flags=re.I).strip()
            if name and "." in name and len(name) > 3:
                m = re.search(r"goFileDown\('([^']+)'\)", a.get("onclick") or "")
                atts.append({"file_name": name,
                             "file_url": (raw["post_url"] if not m else base + "/goe/na/ntt/downloadBbsFile.do?atchFileId=" + m.group(1)),
                             "file_extension": name.rsplit(".", 1)[-1].lower()})
        # 중복 파일명 제거
        uniq, names = [], set()
        for a in atts:
            if a["file_name"] not in names:
                names.add(a["file_name"]); uniq.append(a)
        raw["attachments"] = uniq
    return raws
