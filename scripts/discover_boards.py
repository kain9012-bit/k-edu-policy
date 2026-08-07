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
            r = sess.get(url, timeout=12); time.sleep(delay)
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
    r = sess.get(f"{base}/selectNttList.do?mi=52522&bbsId=955", timeout=15)
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


ADAPTERS = {"seoul": discover_seoul, "sejong": discover_sejong}


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    existing = []
    if os.path.exists(OUT):
        try:
            existing = json.load(open(OUT, encoding="utf-8")).get("boards", [])
        except Exception:
            existing = []
    for office, fn in ADAPTERS.items():
        if only and office != only:
            continue
        found = fn()
        existing = [b for b in existing if b["office"] != office]  # 기존 자동목록 교체
        existing += found
        print(f"[{office}] 발견 {len(found)}개 부서업무방")
        for b in found:
            print(f"  {b['config']['bbs_sn']:>7} · {b['dept_default']}")
    out = {"generated_at": time.strftime("%Y-%m-%d %H:%M:%S"), "boards": existing}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"\n저장: {OUT} · 총 {len(existing)}개")


if __name__ == "__main__":
    main()
