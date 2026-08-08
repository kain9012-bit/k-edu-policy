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
ROWS = 500          # 페이지당 건수(최대 1000까지 동작) — 요청 수를 크게 줄인다
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


# 소속·직속기관 판별어 (부서 경로 중간에 이런 기관명이 오면 본청이 아니다)
SUB_ORG = (
    "교육지원청", "도서관", "연수원", "교육원", "과학관", "수련원", "연구원", "진흥원",
    "학생교육원", "학생수련원", "유아교육원", "특수교육원", "평생교육원", "교육연수원",
    "과학교육원", "창의융합교육원", "미래교육연구원", "교육연구정보원", "교육정보원",
    "학생문화원", "학생교육문화회관", "교육문화회관", "박물관", "체험관", "센터",
    "문화관", "회관", "학교", "캠퍼스", "유치원", "지원단", "교육대학", "직업전문학교",
    "학습관", "평생학습관", "교육관", "지원청", "연구정보원", "복지관", "체육관", "지원센터",
)
# 본청 내부 조직 단위(국·관 등). '평생학습관'처럼 기관명도 '관'으로 끝나므로
# SUB_ORG 검사를 먼저 한 뒤에만 사용한다.
HEAD_UNIT_SUFFIX = ("국", "관", "단", "실", "본부")
# 기관명에 흔한 지역·수식어가 붙은 조직은 본청 조직이 아니다(예: '서울특별시교육청마포평생학습관')
def _looks_like_institution(token, office):
    """토큰이 기관명처럼 보이는지: 교육청명을 포함하거나 SUB_ORG 키워드를 가진 경우."""
    if any(k in token for k in SUB_ORG):
        return True
    # '서울특별시교육청○○' 처럼 교육청명이 접두로 붙은 별도 기관
    if office and token.startswith(office) and token != office:
        return True
    if token.endswith("교육청"):
        return True
    return False


# 기관 개편 전 구명칭 → 현 명칭. 같은 교육청이 두 이름으로 쪼개지지 않게 한다.
# (예: 2024-01-18 전북특별자치도 출범 이전 문서는 '전라북도교육청'으로 남아 있다)
OFFICE_ALIAS = {
    "전라북도교육청": "전북특별자치도교육청",
    "강원도교육청": "강원특별자치도교육청",
}


def normalize_office(name):
    return OFFICE_ALIAS.get((name or "").strip(), (name or "").strip())


def is_head_office(row):
    """본청 문서만 통과. 교육지원청·도서관·연수원 등 소속·직속기관은 제외.

    판별은 NFLST_CHRG_DEPT_NM(전체 부서 경로)로 한다.
    ALL_PROC_INSTT_NM은 소속기관 문서도 본청명으로 채워져 있어 쓸 수 없다.

      본청   : '부산광역시교육청 교육국 유아교육과'      → 중간이 '교육국'(본청 조직)
      본청   : '경상남도교육청 정책기획관'                → 2단
      직속기관: '대구광역시교육청 대구미래교육연구원 행정정보부'
      소속기관: '전라남도교육청 전라남도장성교육지원청 교육지원과'
    """
    office = (row.get("PROC_INSTT_NM") or "").strip()
    full = (row.get("NFLST_CHRG_DEPT_NM") or "").strip()
    if not office:
        return False
    if not full:
        return True
    tokens = full.split()
    # 앞의 교육청명 토큰 제거(예: '전라남도교육청')
    if tokens and tokens[0] == office:
        tokens = tokens[1:]
    if not tokens:
        return True
    if len(tokens) == 1:
        # '정책기획관'이면 본청 부서, '글로벌선진학교문경캠퍼스'면 기관 자체
        return not _looks_like_institution(tokens[0], office)
    # 중간 토큰(마지막 부서명 제외)에 기관명이 있으면 소속·직속기관
    for t in tokens[:-1]:
        if _looks_like_institution(t, office):   # 기관 판별을 먼저(‘평생학습관’ 등)
            return False
        if t.endswith(HEAD_UNIT_SUFFIX):         # '교육국','행정국','기획조정실' 등 본청 조직
            continue
        return False                             # 정체불명 기관명 → 보수적으로 제외
    return True


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
        "office": normalize_office(row.get("PROC_INSTT_NM", "")),   # 시도교육청(구명칭 병합)
        # 전체 부서 경로(본청/소속기관 판별 근거). ALL_PROC_INSTT_NM은 항상 본청명이라 쓰지 않는다.
        "org": row.get("NFLST_CHRG_DEPT_NM") or row.get("ALL_PROC_INSTT_NM", ""),
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
            if not is_head_office(row) or not is_plan(row.get("INFO_SJ")):
                skipped += 1
                continue
            d = to_doc(row)
            existing[d["id"]] = d
            added += 1
        if p % 3 == 0:
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
