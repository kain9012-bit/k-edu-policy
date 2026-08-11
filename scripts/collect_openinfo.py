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
# 수집 시각은 한국시간으로 적는다.
# GitHub Actions 러너는 UTC라, 그냥 now() 를 쓰면 새벽 5시(KST)에 돌린 수집이
# 전날 20시로 기록돼 화면에 하루 어긋나 보인다.
from zoneinfo import ZoneInfo
KST = ZoneInfo("Asia/Seoul")


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "data", "openinfo.json")
LIST_PAGE = "https://www.open.go.kr/othicInfo/infoList/orginlInfoList.do"
DETAIL = "https://www.open.go.kr/othicInfo/infoList/infoListDetl.do"
ROWS = 1000         # 하루치를 한 번에 받기 위한 최대값(실측 최다일 735건)
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


# 소속·직속기관 이름의 '끝'에 오는 말.
#
# ※ 반드시 endswith로 판별해야 한다(부분 포함으로 하면 안 된다).
#   '학교'를 부분 포함으로 검사하면 본청 부서인 '학교혁신과'·'학교지원과'·
#   '학교혁신국'이 통째로 소속기관으로 오판돼 사라진다. 실제로 그렇게 잘못
#   걸러져 인천이 89건까지 줄어 있었다.
SUB_ORG_SUFFIX = (
    "교육지원청", "지원청", "도서관", "연수원", "교육원", "과학관", "수련원",
    "연구원", "진흥원", "정보원", "문화원", "박물관", "체험관", "미술관",
    "회관", "학습관", "문화관", "복지관", "체육관", "과학館",
    "학교", "캠퍼스", "유치원", "분원", "교육대학", "직업전문학교",
    "센터", "지원단", "교육청",
)
# 본청 내부 조직 단위(국·관·실 등). '도서관'도 '관'으로 끝나므로
# 반드시 SUB_ORG_SUFFIX 검사를 통과한 뒤에만 본다.
HEAD_UNIT_SUFFIX = ("국", "관", "단", "실", "본부", "부")


def _looks_like_institution(token, office):
    """토큰이 별도 기관명처럼 보이는지."""
    if token.endswith(SUB_ORG_SUFFIX):
        return True
    # '서울특별시교육청○○' 처럼 교육청명이 접두로 붙은 별도 기관
    if office and token.startswith(office) and token != office:
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
        "generated_at": datetime.datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S"),
        "count": len(docs),
        "offices": sorted({d["office"] for d in docs if d["office"]}),
        "departments": sorted({d["department"] for d in docs if d["department"]}),
        "years": sorted({d["policy_year"] for d in docs if d["policy_year"]}, reverse=True),
        "documents": docs,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    return len(docs)


def fetch_day(page_obj, kwd, day):
    """하루치(YYYYMMDD)를 한 번의 요청으로 전부 받는다.

    ※ 페이징을 쓰지 않는 이유(중요):
      이 API의 sort=s 정렬은 페이지 사이에서 순서가 흔들린다. 여러 페이지를
      순회하면 같은 문서가 다시 나오고 다른 문서는 건너뛰어진다.
      실측: 2026-04 한 달(서버 총계 10,690건)을 22페이지 전부 순회해도
            유니크 8,964건 + 중복 1,726건 — 약 16%가 유실됐다.
      하루 단위로 끊으면 최대 700여 건이라 rowPage=1000 한 번으로 다 받을 수
      있어 페이징 자체가 필요 없다. 유실 없는 유일한 방법이다.
    """
    for attempt in range(3):
        res = page_obj.evaluate(JS_FETCH, {"kwd": kwd, "start": day, "end": day,
                                           "page": 1, "rows": ROWS})
        if res.get("code") == "200":
            return res
        # 세션 만료 등 → 목록 페이지 다시 열어 토큰 갱신
        print(f"    [재인증] code={res.get('code')} — 세션 갱신 ({attempt+1}/3)")
        page_obj.goto(LIST_PAGE, timeout=60000)
        page_obj.wait_for_timeout(2500)
    return None


def collect_range(page_obj, kwd, start, end, existing):
    """start~end(YYYYMMDD) 구간을 '하루씩' 순회하며 수집한다."""
    d0 = datetime.datetime.strptime(start, "%Y%m%d").date()
    d1 = datetime.datetime.strptime(end, "%Y%m%d").date()
    added = skipped = 0
    cur, i, span = d0, 0, (d1 - d0).days + 1
    while cur <= d1:
        i += 1
        day = cur.strftime("%Y%m%d")
        res = fetch_day(page_obj, kwd, day)
        if not res:
            print(f"    [실패] {day} — 건너뜀")
        else:
            total = int(res.get("total") or 0)
            rows = res.get("rows") or []
            if total > len(rows):
                # rowPage(1000)를 넘는 날. 지금까지 최대 735건이라 실제로는 거의 없다.
                print(f"    ::warning:: {day} 총 {total}건 중 {len(rows)}건만 수신 — 유실 가능")
            for row in rows:
                if not is_head_office(row) or not is_plan(row.get("INFO_SJ")):
                    skipped += 1
                    continue
                doc = to_doc(row)
                existing[doc["id"]] = doc
                added += 1
        if i % 10 == 0:
            print(f"    …{i}/{span}일 ({day}) 누적 {len(existing)}건")
            save(existing)          # 중간 저장(중단 대비)
        cur += datetime.timedelta(days=1)
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
