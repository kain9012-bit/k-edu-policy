#!/usr/bin/env python3
"""부서별 게시판 자동 발견(discovery).

손으로 게시판을 하나씩 등록하는 대신, 부서 서브사이트를 스캔해 부서명과 부서업무방
게시판번호를 코드로 추출한다. 조직개편이 나도 이 스크립트를 재실행하면 목록이 갱신된다.

- 현재 어댑터: 서울(buseo.sen.go.kr) 부서업무방 (bu01~buNN 서브사이트)
- 결과: config/boards_auto.json  (collect_documents.py가 boards.json과 함께 로드)

다른 교육청은 부서 인덱스 구조가 다르므로 어댑터를 추가한다.
인덱스가 불규칙하면 LLM으로 '부서명+게시판링크'를 추출하는 어댑터로 대체할 수 있다.
"""
import os, re, json, sys, time
import datetime
# 수집 시각은 한국시간으로 적는다.
# GitHub Actions 러너는 UTC라, 그냥 now() 를 쓰면 새벽 5시(KST)에 돌린 수집이
# 전날 20시로 기록돼 화면에 하루 어긋나 보인다.
from zoneinfo import ZoneInfo
KST = ZoneInfo("Asia/Seoul")

import requests
from bs4 import BeautifulSoup

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) K-EduPolicyBot/1.0"
OUT = os.path.join(ROOT, "config", "boards_auto.json")

# robots.txt에서 서울이 차단한 게시판번호(수집 제외)
SEOUL_ROBOTS_BLOCK = set(range(1079, 1092))


def discover_seoul(max_bu=35, delay=0.4):
    sess = requests.Session(); sess.headers.update({"User-Agent": UA})
    boards = []
    for i in range(1, max_bu + 1):
        bu = f"bu{i:02d}"
        url = f"https://buseo.sen.go.kr/buseo/{bu}/index.do"
        try:
            r = sess.get(url, timeout=25); time.sleep(delay)
            if r.status_code != 200:
                continue
        except Exception:
            continue
        s = BeautifulSoup(r.text, "lxml")
        title = (s.select_one("title").get_text(strip=True) if s.select_one("title") else "")
        dept = re.split(r"\s*[:\-|>]", title)[0].strip()
        if not dept:
            continue
        # 부서업무방 링크의 bbsSn (없으면 첫 게시판)
        sn = None
        for a in s.select("a[href*='BD_selectBbsList']"):
            if "업무방" in a.get_text():
                m = re.search(r"q_bbsSn=(\d+)", a.get("href") or "")
                if m:
                    sn = m.group(1); break
        if not sn:
            m = re.search(r"/buseo/%s/user/bbs/BD_selectBbsList\.do\?[^\"']*q_bbsSn=(\d+)" % bu, r.text)
            sn = m.group(1) if m else None
        if not sn or int(sn) in SEOUL_ROBOTS_BLOCK:
            continue
        boards.append({
            "id": f"seoul-{bu}",
            "office": "seoul",
            "board_name": f"{dept} 부서업무방",
            "menu_path": f"부서 홈페이지 > {dept} > 부서업무방",
            "collector_type": "gne",
            "board_type": "분산형",
            "is_active": True, "login_required": False, "keep_all": False,
            "dept_default": dept,
            "license": "공공누리(기관 표기 확인)", "robots": "허용",
            "max_pages": 1,
            "config": {
                "list_url": f"https://buseo.sen.go.kr/buseo/{bu}/user/bbs/BD_selectBbsList.do?q_rowPerPage=50&q_bbsSn={sn}",
                "page_param": "q_currPage", "bbs_sn": sn,
                "base": "https://buseo.sen.go.kr",
            },
        })
    return boards


def discover_sejong(delay=0.4):
    """세종: 부서별통합자료실 페이지의 부서 드롭다운(bbsId→부서명)을 파싱."""
    sess = requests.Session(); sess.headers.update({"User-Agent": UA})
    base = "https://www.sje.go.kr/sje/na/ntt"
    try:
        r = sess.get(f"{base}/selectNttList.do?mi=52522&bbsId=955", timeout=30)
    except Exception:
        return []
    s = BeautifulSoup(r.text, "lxml")
    boards, seen = [], set()
    for o in s.select("option"):
        val = (o.get("value") or "").strip()
        name = o.get_text(strip=True)
        if not val.isdigit() or int(val) < 120:      # 페이지크기(10~100) 제외
            continue
        if re.search(r"건|제목|내용|작성자|전체", name) or len(name) > 12 or not name:
            continue
        if val in seen:
            continue
        seen.add(val)
        boards.append({
            "id": f"sejong-{val}",
            "office": "sejong",
            "board_name": f"{name} 자료실",
            "menu_path": f"부서별통합자료실 > {name}",
            "collector_type": "goe",
            "board_type": "분산형",
            "is_active": True, "login_required": False, "keep_all": False,
            "dept_default": name,
            "license": "공공누리(기관 표기 확인)", "robots": "허용",
            "max_pages": 3,
            "config": {
                "list_url": f"{base}/selectNttList.do?mi=52522&bbsId={val}",
                "view_url": f"{base}/selectNttInfo.do?mi=52522&bbsId={val}&nttSn=",
                "page_param": "currPage", "bbs_sn": val,
                "base": "https://www.sje.go.kr",
            },
        })
        time.sleep(delay * 0)  # 목록 파싱은 단일 요청
    return boards


def discover_by_plan_density(office, sitemap_url, list_base, base, exclude=r"(채용|입찰|임용|인사|민원|추진비|MOU|통계|보도|공지|알림|시험)",
                             min_hits=3, max_boards=25, delay=0.2):
    """사이트맵의 게시판을 훑어 '계획' 밀도가 높은 게시판만 자동 선별한다.
    계획 전용/통합 게시판이 없고 주제·부서별로 흩어진 교육청(충북 등)에 사용."""
    sess = requests.Session(); sess.headers.update({"User-Agent": UA})
    try:
        s = BeautifulSoup(sess.get(sitemap_url, timeout=30).text, "lxml")
    except Exception:
        return []
    links = {}
    for a in s.select("a[href*='bbsId']"):
        nm = re.sub(r"\s+", " ", a.get_text(" ", strip=True)); h = a.get("href", "")
        m = re.search(r"bbsId=(\d+)", h); mi = re.search(r"mi=(\d+)", h)
        if m and nm and len(nm) <= 22:
            links.setdefault((m.group(1), mi.group(1) if mi else ""), nm)
    scored = []
    for (bid, mi), nm in links.items():
        if re.search(exclude, nm):
            continue
        url = f"{list_base}?bbsId={bid}" + (f"&mi={mi}" if mi else "")
        try:
            ss = BeautifulSoup(sess.get(url, timeout=20).text, "lxml")
            titles = [a.get_text(" ", strip=True) for a in ss.select("table tbody tr a[data-id]")]
        except Exception:
            continue
        time.sleep(delay)
        if not titles:
            continue
        hits = sum(1 for t in titles if re.search(r"계획|기본방향", t))
        if hits >= min_hits:
            scored.append((hits / len(titles), hits, bid, mi, nm))
    scored.sort(reverse=True)
    boards = []
    for ratio, hits, bid, mi, nm in scored[:max_boards]:
        boards.append({
            "id": f"{office}-{bid}", "office": office,
            "board_name": nm, "menu_path": nm,
            "collector_type": "goe", "board_type": "분산형",
            "is_active": True, "login_required": False, "keep_all": False,
            "license": "공공누리(기관 표기 확인)", "robots": "확인 필요",
            "max_pages": 2,
            "config": {
                "list_url": f"{list_base}?bbsId={bid}" + (f"&mi={mi}" if mi else ""),
                "view_url": f"{list_base.replace('selectNttList', 'selectNttInfo')}?bbsId={bid}" + (f"&mi={mi}" if mi else "") + "&nttSn=",
                "page_param": "currPage", "bbs_sn": bid, "base": base,
            },
        })
    return boards


def discover_chungbuk(max_dept=40, delay=0.15):
    """충북: 본청(cbe) + 부서 서브사이트(dept-NN)를 모두 훑어 계획 밀도 높은 게시판 선별.
    한 부서 안에서도 게시판이 여러 개로 쪼개져 있어 부서 사이트까지 스캔해야 한다."""
    sess = requests.Session(); sess.headers.update({"User-Agent": UA})
    boards = discover_by_plan_density(
        "chungbuk", "https://www.cbe.go.kr/cbe/sitemap.do",
        "https://www.cbe.go.kr/cbe/na/ntt/selectNttList.do", "https://www.cbe.go.kr")
    seen = {b["config"]["bbs_sn"] for b in boards}
    for n in range(1, max_dept + 1):
        sm = f"https://www.cbe.go.kr/dept-{n}/sitemap.do"
        try:
            r = sess.get(sm, timeout=20); time.sleep(delay)
        except Exception:
            continue
        if r.status_code != 200 or "bbsId=" not in r.text:
            continue
        s = BeautifulSoup(r.text, "lxml")
        title = (s.select_one("title").get_text(strip=True) if s.select_one("title") else "")
        dept = re.sub(r"^충북교육청\s*", "", title).strip() or f"dept-{n}"
        if dept in ("충청북도교육청",):
            continue
        found = discover_by_plan_density(
            "chungbuk", sm, f"https://www.cbe.go.kr/dept-{n}/na/ntt/selectNttList.do",
            "https://www.cbe.go.kr", min_hits=3, max_boards=6, delay=0.1)
        for b in found:
            if b["config"]["bbs_sn"] in seen:
                continue
            seen.add(b["config"]["bbs_sn"])
            b["id"] = f"chungbuk-d{n}-{b['config']['bbs_sn']}"
            b["dept_default"] = dept
            b["menu_path"] = f"{dept} > {b['board_name']}"
            boards.append(b)
    return boards


def discover_busan():
    return discover_by_plan_density("busan", "https://www.pen.go.kr/main/sitemap.do",
                                    "https://www.pen.go.kr/main/na/ntt/selectNttList.do", "https://www.pen.go.kr")


def discover_incheon():
    return discover_by_plan_density("incheon", "https://www.ice.go.kr/ice/sitemap.do",
                                    "https://www.ice.go.kr/ice/na/ntt/selectNttList.do", "https://www.ice.go.kr")


def discover_gyeongbuk():
    return discover_by_plan_density("gyeongbuk", "https://www.gbe.kr/main/sitemap.do",
                                    "https://www.gbe.kr/main/na/ntt/selectNttList.do", "https://www.gbe.kr")


def discover_gyeonggi():
    # 경기는 계획서 전용 게시판이 따로 없고 '교육정책' 한 곳만 등록돼 있었다.
    # 표준 게시판(na/ntt)을 쓰므로 밀도 방식으로 훑는다.
    return discover_by_plan_density("gyeonggi", "https://www.goe.go.kr/goe/sitemap.do",
                                    "https://www.goe.go.kr/goe/na/ntt/selectNttList.do", "https://www.goe.go.kr")


def discover_jeonnam():
    return discover_by_plan_density("jeonnam", "https://www.jne.go.kr/main/sitemap.do",
                                    "https://www.jne.go.kr/main/na/ntt/selectNttList.do", "https://www.jne.go.kr")


ADAPTERS = {"seoul": discover_seoul, "sejong": discover_sejong, "chungbuk": discover_chungbuk,
            "busan": discover_busan, "incheon": discover_incheon, "gyeongbuk": discover_gyeongbuk,
            "gyeonggi": discover_gyeonggi, "jeonnam": discover_jeonnam}


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    existing = []
    if os.path.exists(OUT):
        try:
            existing = json.load(open(OUT, encoding="utf-8")).get("boards", [])
        except Exception:
            existing = []
    by_id = {b["id"]: b for b in existing}
    failed = []
    for office, fn in ADAPTERS.items():
        if only and office != only:
            continue
        # 어댑터 하나가 실패해도 전체가 죽지 않도록 격리한다.
        # (사이트 점검·네트워크 오류 등으로 특정 교육청만 실패하는 일이 잦다)
        try:
            found = fn()
        except Exception as e:
            failed.append((office, str(e)[:80]))
            print(f"[{office}] 실패: {type(e).__name__} {str(e)[:80]}")
            continue
        if not found:
            failed.append((office, "발견 0건"))
            print(f"[{office}] 발견 0건 — 기존 목록 유지")
            continue
        new_cnt = 0
        found_ids = set()
        for b in found:
            found_ids.add(b["id"])
            old = by_id.get(b["id"])
            if old:
                # 기존 게시판: 사람이 손댄 설정(is_active·keep_all·max_pages·license 등)은 보존하고
                # URL 등 접속 정보만 최신값으로 갱신
                old["config"].update(b["config"])
                old["board_name"] = b["board_name"]
                old["menu_path"] = b.get("menu_path", old.get("menu_path", ""))
                if b.get("dept_default"):
                    old["dept_default"] = b["dept_default"]
                old.pop("missing_since", None)   # 다시 발견되면 실종 표시 해제
            else:
                by_id[b["id"]] = b
                new_cnt += 1
        # 이번에 안 잡힌 기존 게시판은 삭제하지 않고 '실종' 표시만 남긴다
        # (일시적 사이트 오류·개편으로 사라져 보일 수 있어 데이터 손실을 막는다)
        missing = 0
        today = datetime.datetime.now(KST).strftime("%Y-%m-%d")
        for bid, b in by_id.items():
            if b["office"] == office and bid not in found_ids:
                b.setdefault("missing_since", today)
                missing += 1
        print(f"[{office}] 발견 {len(found)}개 (신설 {new_cnt} · 미발견 {missing})")
        for b in found[:40]:
            print(f"  {b['config']['bbs_sn']:>7} · {b.get('dept_default') or b['board_name']}")
    existing = list(by_id.values())
    if failed:
        print("\n[요약] 실패·0건 어댑터:")
        for office, msg in failed:
            print(f"  - {office}: {msg}")
    out = {"generated_at": datetime.datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S"), "boards": existing}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"\n저장: {OUT} · 총 {len(existing)}개")


if __name__ == "__main__":
    main()
