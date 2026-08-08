#!/usr/bin/env python3
"""정보공개포털(open.go.kr) 원문정보 수집기 — Playwright 방식.

홈페이지에 공개되지 않은 '내부결재 계획'까지 찾기 위해, 각 시도교육청이 생산한
결재문서 목록을 수집한다. 문서 파일은 받지 않고 제목·부서·문서번호·생산일자만
색인하며, 상세는 정보공개포털 원문 링크로 연결한다.

※ 담당자명(CHARGER_NM)은 개인정보이므로 저장하지 않는다.
  필요하면 사용자가 상세 링크에서 직접 확인한다.

왜 Playwright인가:
  이 API는 브라우저에서 발급되는 XSRF-TOKEN 쿠키를 요구한다.
  requests/urllib 같은 순수 HTTP 클라이언트로는 토큰이 발급되지 않아
  항상 code 491(비정상 호출)로 거부된다. 그래서 실제 브라우저로 호출한다.

준비:
  pip install playwright
  python -m playwright install chromium

사용법:
  # 초기 1회 (2024-01-01 ~ 오늘) — 중단돼도 다시 실행하면 이어서 받는다
  python scripts/collect_openinfo.py --since 2024-01-01

  # 매일 증분 (기본: 최근 3일)
  python scripts/collect_openinfo.py
"""
import os, json, time, argparse, datetime

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "data", "openinfo.json")
LIST_PAGE = "https://www.open.go.kr/othicInfo/infoList/orginlInfoList.do"
DETAIL = "https://www.open.go.kr/othicInfo/infoList/infoListDetl.do"
ROWS = 30           # 페이지당 건수
DELAY = 1.2         # 요청 간격(초) — 서버 부담을 줄인다

# 제외어: 회계·서무·인사 등 정책계획이 아닌 결재문서
EXCLUDE = [
    "품의", "원인행위", "지출", "정산", "집행", "구입", "구매", "계약", "용역", "입찰",
    "공사", "채용", "임용", "시험", "출장", "주간", "일정", "행사", "개최", "위촉",
    "명단", "수당", "여비", "보험료", "사용료", "반환", "납부", "급여", "대금",
    "초과근무", "복무", "휴가", "연가", "출납", "세입", "세출", "이체", "지급",
]

# 브라우저 안에서 실행할 목록 조회 함수
JS_FETCH = """
async ({kwd, start, end, page, rows}) => {
  const body = new URLSearchParams({
    kwd, insttSeCd:'E', eduYn:'N', startDate:start, endDate:end,
    rowPage:String(rows), viewPage:String(page), sort:'s', offSet:String((page-1)*rows)
  });
  const r = await fetch('/othicInfo/infoList/orginlInfoList.ajax', {
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8',
             'X-Requested-With':'XMLHttpRequest'},
    body
  });
  const j = await r.json();
  return {code:j.result.code, total:j.result.rtnTotal, rows:j.result.rtnList||[]};
}
"""


def is_plan(title):
    """제외어에 걸리지 않은 '계획' 문서만 통과."""
    t = title or ""
    return bool(t) and not any(w in t for w in EXCLUDE)


def to_doc(row):
    dt = (row.get("PRDCTN_DT") or "")[:8]
    date = f"{dt[:4]}-{dt[4:6]}-{dt[6:8]}" if len(dt) == 8 else ""
    import urllib.parse
    detail = DETAIL + "?" + urllib.parse.urlencode({
        "prdnNstRgstNo": row.get("PRDCTN_INSTT_REGIST_NO", ""),
        "prdnDt": row.get("PRDCTN_DT", ""),
        "nstSeCd": row.get("INSTT_SE_CD", "E"),
    })
    return {
        "id": f"oi-{row.get('PRDCTN_INSTT_REGIST_NO','')}-{row.get('PRDCTN_DT','')}",
        "source": "원문정보",
        "office": row.get("PROC_INSTT_NM", ""),         # 시도교육청
        "org": row.get("ALL_PROC_INSTT_NM") or row.get("NFLST_CHRG_DEPT_NM", ""),
        "department": row.get("CHRG_DEPT_NM", ""),       # 담당부서
        "title": (row.get("INFO_SJ") or "").strip(),
        "doc_no": row.get("DOC_NO", ""),                 # 문서번호(정보공개청구 시 특정용)
        "unit_job": row.get("UNIT_JOB_NM", ""),
        "published_date": date,
        "policy_year": int(dt[:4]) if len(dt) >= 4 and dt[:4].isdigit() else None,
        "detail_url": detail,
        # 담당자명(CHARGER_NM)은 개인정보이므로 저장하지 않음
    }


def save(existing):
    docs = sorted(existing.values(), key=lambda x: x.get("published_date") or "", reverse=True)
    out = {
        "source": "정보공개포털(open.go.kr) 원문정보",
        "note": "각 교육청이 생산한 결재문서 목록. 담당자명은 수집하지 않으며 상세는 원문 링크에서 확인.",
        "generated_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "count": len(docs),
        "offices": sorted({d["office"] for d in docs if d["office"]}),
        "departments": sorted({d["department"] for d in docs if d["department"]}),
        "years": sorted({d["policy_year"] for d in docs if d["policy_year"]}, reverse=True),
        "documents": docs,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    return len(docs)


def collect_range(page_obj, kwd, start, end, existing):
    """start~end(YYYYMMDD) 구간을 페이지 순회하며 수집."""
    def call(p):
        for attempt in range(3):
            res = page_obj.evaluate(JS_FETCH, {"kwd": kwd, "start": start, "end": end,
                                               "page": p, "rows": ROWS})
            if res.get("code") == "200":
                return res
            # 세션 만료 등 → 목록 페이지 다시 열어 토큰 갱신
            print(f"    [재인증] code={res.get('code')} — 세션 갱신 ({attempt+1}/3)")
            page_obj.goto(LIST_PAGE, timeout=60000)
            page_obj.wait_for_timeout(2500)
        return None

    first = call(1)
    if not first:
        print(f"  {start}~{end}: 조회 실패")
        return 0, 0
    total = int(first.get("total") or 0)
    pages = (total + ROWS - 1) // ROWS
    print(f"  {start}~{end}: 총 {total}건 / {pages}페이지")
    added = skipped = 0
    for p in range(1, pages + 1):
        res = first if p == 1 else call(p)
        if not res:
            continue
        for row in res.get("rows") or []:
            if not is_plan(row.get("INFO_SJ")):
                skipped += 1
                continue
            d = to_doc(row)
            existing[d["id"]] = d
            added += 1
        if p % 20 == 0:
            print(f"    …{p}/{pages}페이지 (누적 {len(existing)})")
            save(existing)          # 중간 저장(중단 대비)
        time.sleep(DELAY)
    return added, skipped


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--since", help="초기 수집 시작일 YYYY-MM-DD (예: 2024-01-01)")
    ap.add_argument("--days", type=int, default=3, help="증분 수집 기간(기본 최근 3일)")
    ap.add_argument("--kwd", default="계획")
    ap.add_argument("--headed", action="store_true", help="브라우저 창을 띄워 실행(디버깅용)")
    a = ap.parse_args()

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise SystemExit("playwright가 필요합니다:\n  pip install playwright\n  python -m playwright install chromium")

    existing = {}
    if os.path.exists(OUT):
        try:
            for d in json.load(open(OUT, encoding="utf-8")).get("documents", []):
                existing[d["id"]] = d
        except Exception:
            pass
    before = len(existing)
    today = datetime.date.today()

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=not a.headed)
        page = browser.new_page(locale="ko-KR")
        page.goto(LIST_PAGE, timeout=60000)
        page.wait_for_timeout(3000)          # 토큰 발급 대기

        if a.since:
            # 초기 대량 수집: 월 단위로 끊어 순회(매월 저장 → 중단돼도 이어서)
            cur = datetime.date.fromisoformat(a.since)
            while cur <= today:
                nxt = (cur.replace(day=28) + datetime.timedelta(days=4)).replace(day=1)
                end = min(nxt - datetime.timedelta(days=1), today)
                added, skipped = collect_range(page, a.kwd, cur.strftime("%Y%m%d"),
                                               end.strftime("%Y%m%d"), existing)
                print(f"  → 저장 {added}건 · 제외 {skipped}건 (누적 {len(existing)})")
                save(existing)
                cur = nxt
        else:
            start = today - datetime.timedelta(days=a.days)
            added, skipped = collect_range(page, a.kwd, start.strftime("%Y%m%d"),
                                           today.strftime("%Y%m%d"), existing)
            print(f"  → 저장 {added}건 · 제외 {skipped}건")

        browser.close()

    n = save(existing)
    print(f"\n저장: {OUT} · 총 {n}건 (신규 {n - before})")


if __name__ == "__main__":
    main()
