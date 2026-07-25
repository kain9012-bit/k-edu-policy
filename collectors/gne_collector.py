#!/usr/bin/env python3
"""경상남도교육청 수집기 (업무공유자료실, BD_selectBbsList.do / q_bbsDocNo).
계획 외 자료(주간보고·매뉴얼·편람 등)가 섞인 통합 자료실이므로 판별 필터에 의존한다."""
import os, re
from urllib.parse import urljoin
from . import base_collector as bc

DOCNO_RE = re.compile(r"q_bbsDocNo=(\d+)")


def _list_url(board, page):
    url = board["config"]["list_url"]
    param = board["config"].get("page_param", "q_currPage")
    sep = "&" if "?" in url else "?"
    return f"{url}{sep}{param}={page}"


def collect(board, session, log):
    base_list = board["config"]["list_url"]
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
            a = tr.select_one("a[href*='BD_selectBbs.do'], a[onclick*='opView']")
            if not a:
                continue
            href = a.get("href") or ""
            m = DOCNO_RE.search(href) or re.search(r"opView\('(\d+)'\)", a.get("onclick") or "")
            if not m or m.group(1) in seen:
                continue
            pid = m.group(1)
            seen.add(pid); added += 1
            title = re.sub(r"\s+", " ", a.get_text(" ", strip=True)).strip()
            tds = [re.sub(r"\s+", " ", td.get_text(" ", strip=True)) for td in tr.select("td")]
            dept = ""
            date = ""
            for t in tds:
                if re.fullmatch(r"20\d{2}-\d{2}-\d{2}", t):
                    date = t
                elif t and t != title and not t.isdigit() and "과" in t and len(t) <= 12:
                    dept = dept or t
            post_url = urljoin(base_list, href) if href else \
                f"https://www.gne.go.kr/user/bbs/BD_selectBbs.do?q_bbsSn={board['config'].get('bbs_sn','1464')}&q_bbsDocNo={pid}"
            raws.append({
                "external_post_id": pid,
                "title": title,
                "department": dept,
                "author": "",
                "published_date": date,
                "post_url": post_url,
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
        for a in d.select("a[href*='Download'], a[href*='FileDown'], a[href*='fileDown'], a[onclick*='fnFileDown']"):
            name = re.sub(r"\s*\(\s*[\d.,]+\s*[kmgib]*b?\s*\)\s*$", "", a.get_text(" ", strip=True), flags=re.I).strip()
            if name and "." in name and len(name) > 3 and name not in names:
                names.add(name)
                href = a.get("href") or ""
                atts.append({"file_name": name,
                             "file_url": urljoin(raw["post_url"], href) if href and not href.startswith("javascript") else raw["post_url"],
                             "file_extension": name.rsplit(".", 1)[-1].lower()})
        raw["attachments"] = atts
    return raws
