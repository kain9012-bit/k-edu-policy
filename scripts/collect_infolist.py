#!/usr/bin/env python3
"""정보공개포털(open.go.kr) 결재 계획문서 수집기 — Playwright 방식.

정보공개포털에는 성격이 다른 두 목록이 있고, **둘 다 받아야 한다**.
    · 정보목록(infoList)       : 기관이 보유·관리한다고 등록한 문서 목록
    · 원문정보(orginlInfoList) : 원문 파일까지 공개한 결재문서
  한쪽이 다른 쪽을 포함하지 않는다. 등록 경로가 달라 한쪽에만 올라간 문서가 생긴다.
  실측(2026-08-07 하루):
    정보목록 1,298건 · 원문정보 189건 — 그중 43건(22.8%)은 정보목록에 없다.
  규모는 정보목록이 훨씬 크다(2026-04-01 기준 본청 계획 768건 vs 26건).
  원문공개를 적게 하는 교육청(인천·서울)은 원문정보만 보면 거의 잡히지 않는다.

설계 원칙 — 수집과 판별을 분리한다:
  수집 단계에서는 본청 문서를 계획 여부와 무관하게 전부 RAW에 담는다.
  계획서 판별은 저장 시점에만 하므로, 판별 규칙을 고쳐도 --refilter 한 번이면
  되고 다시 수집할 필요가 없다. (판별을 수집에 박아넣었다가 규칙을 고칠 때마다
  재수집하는 일을 반복했다.)

※ 담당자명(CHARGER_NM)은 개인정보이므로 저장하지 않는다.
  필요하면 사용자가 상세 링크에서 직접 확인한다.

왜 Playwright인가:
  이 API는 브라우저에서 발급되는 XSRF-TOKEN 쿠키를 요구한다.
  requests/urllib 같은 순수 HTTP 클라이언트로는 항상 code 491로 거부된다.

준비:
  pip install playwright
  python -m playwright install chromium

사용법:
  # 시험 수집(최근 3개월)
  python scripts/collect_infolist.py --months 3

  # 기간 지정
  python scripts/collect_infolist.py --since 2025-01-01

  # 매일 증분(기본 최근 3일)
  python scripts/collect_infolist.py
"""
import os, re, json, time, argparse, datetime
# 수집 시각은 한국시간으로 적는다.
# GitHub Actions 러너는 UTC라, 그냥 now() 를 쓰면 새벽 5시(KST)에 돌린 수집이
# 전날 20시로 기록돼 화면에 하루 어긋나 보인다.
from zoneinfo import ZoneInfo
KST = ZoneInfo("Asia/Seoul")


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "data", "infolist.json")
# 본청 문서를 필터 이전 상태로 통째로 보관한다.
# 이게 없으면 필터를 느슨하게 고쳐도 이미 버린 문서를 되살릴 수 없어
# 매번 다시 수집해야 한다. 웹에는 OUT만 쓰이고 RAW는 재필터용이다.
RAW = os.path.join(ROOT, "data", "infolist_raw.json")
LIST_PAGE = "https://www.open.go.kr/othicInfo/infoList/infoList.do"
DETAIL = "https://www.open.go.kr/othicInfo/infoList/infoListDetl.do"
ROWS = 1000         # 페이지당 최대치
MAX_PAGES = 8       # 하루 최대 8,000건까지 (실측 최다일 4,152건)
DELAY = 0.8         # 요청 간격(초)


# ─────────────────────────── 계획서 판별 ───────────────────────────
# 정보목록은 원문정보보다 6배 넓어서 온갖 업무문서가 섞여 들어온다.
# 세 단계로 거른다: (1) 계획서 형태인가 (2) 남의 문서를 접수한 건 아닌가
#                  (3) 계획서가 아닌 업무 유형은 아닌가

# (1) 제목이 계획서 형태여야 한다.
#
# ※ '기본|추진|운영…계획'처럼 앞 수식어를 열거하면 안 된다.
#   「2026학년도 난치병 학생 치료비 지원 사업 계획」은 '사업 계획'이라
#   열거에 없어 통째로 빠졌다. 수식어는 끝없이 나온다.
#   그래서 '제목이 계획으로 끝나는가'와 '계획서/계획 수립·변경을 포함하는가'만 본다.
PLAN_TAIL_RE = re.compile(r"(계획|계획안|계획서)\s*$")
PLAN_WORD_RE = re.compile(r"계획서|계획\s*수립|계획\s*변경|계획\s*마련|계획\s*확정|계획\s*[(（]?\s*안\s*[)）]?")


def _looks_like_plan(t):
    return bool(PLAN_TAIL_RE.search(t) or PLAN_WORD_RE.search(t))

# (2) 제외는 '단어가 들어 있는지'가 아니라 '말머리가 무엇인지'로 판단한다.
#
# ※ 부분 포함으로 막으면 안 된다.
#   '복무'를 제외어로 넣으면 「복무 관리 기본계획」이, '채용'을 넣으면
#   「교육공무직원 채용 업무 추진 계획」이 통째로 사라진다. 업무 주제어는
#   계획서인지 아닌지를 가리지 못한다.
#
#   실제 공문 제목을 보면 회계·서무 처리 문서와 접수 문서는 대부분
#   [품의]·[지출]·[협조]·[알림] 같은 말머리로 시작한다. 그래서 말머리만 본다.
#   실측(수집분 20,814건): 말머리가 붙은 문서 4,193건, 251종.
#     계획 신호 → [계획] 1,830 · [교부계획] 371 · [기본계획] 30 · [내부결재] 85
#     접수 신호 → [알림] 325 · [제출] 254 · [안내] 178 · [협조] 51
#
# 회계·서무 처리 말머리
FISCAL_TAGS = (
    "품의", "원인", "원인행위", "지출", "지급", "정산", "집행", "결의", "검사", "검수",
    "세입", "세출", "이체", "반납", "재배정", "예산변경", "카드", "계약", "낙찰", "취소",
)
# 다른 기관 문서를 접수·경유한 신호
RECV_TAGS = (
    "협조", "제출", "이송", "이첩", "알림", "안내", "회신", "요청", "공유", "공지",
    "재공지", "배포", "전달", "송부", "통보", "수신", "접수", "반려", "반송", "보냄",
    "재알림", "회람", "출장", "참석",
)
DROP_TAGS = tuple(set(FISCAL_TAGS) | set(RECV_TAGS))

# 제목 맨 앞 괄호 말머리. [원인][이체] 처럼 연달아 붙기도 해서 반복 매칭한다.
HEAD_TAG_RE = re.compile(r"^\s*[\[［(（<【]\s*([^\]］)）>】]{1,20}?)\s*[\]］)）>】]")
# [알림/제출]·[안내-신청]·[중요, 안내] 처럼 한 괄호에 여러 개가 들어간다.
TAG_SPLIT_RE = re.compile(r"[\/,·、\-–—\s]+")

# ── 맨 뒤 어미 판정 ───────────────────────────────────────────────
# 계획을 '세운' 문서인지, 남의 계획을 받아 '처리한' 문서인지는 제목 끝이 가른다.
#
# 다만 끝에 괄호 부연이 붙어 어미가 가려지는 경우가 많다.
#   '품질시험계획서 승인 알림(혜광고 다목적강당증축 및 기타공사)'
#   '시설공사 보완시공 등 계획서 보완 요청(가칭 사랑초등학교 신축공사)'
# 그래서 끝 괄호를 먼저 떼어낸 뒤 어미를 본다. '(안)'도 함께 떨어지지만
# 그 앞이 '기본계획'이면 어미에 걸리지 않으므로 문제되지 않는다.
# 끝 괄호는 '[(가칭)갈매역세권2초]'처럼 대괄호 안에 소괄호가 든 경우가 흔해서
# 두 종류를 따로 잡는다. 하나로 묶으면 중첩을 못 떼고 어미가 계속 가려진다.
TAIL_PAREN_RES = (
    re.compile(r"\s*[\[［][^\[［]{0,80}[\]］]\s*$"),      # 대괄호(안의 소괄호 허용)
    re.compile(r"\s*[(（][^(（]{0,80}[)）]\s*$"),          # 소괄호
    re.compile(r"\s*[<【][^<【]{0,80}[>】]\s*$"),
)

# 제목 끝이 이 말이면 계획을 '세운' 문서가 아니라 '처리·보고·요청'한 문서다.
#
# ※ 한때 '안내·알림'은 「○○ 운영 계획 안내」처럼 자기 계획을 알리는 경우가
#   있다고 보아 앞이 '계획'이면 살렸는데, 실제로는 「공모 계획 안내」처럼
#   남에게 알리는 문서가 대부분이라 예외를 없앴다.
TAIL_WORDS = (
    # 보내거나 받은 문서
    "제출", "회신", "송부", "통보", "협조", "이송", "접수", "반려", "회람",
    "요청", "의뢰", "추천", "독려", "촉구", "공유", "전달",
    # 보고·결과
    "보고", "결과", "점검", "확인", "답변", "취합", "수렴",
    # 회계 처리
    "지급", "납부", "지출", "정산", "환불", "반납",
    # 결재·승인 절차
    "승인", "알림", "안내", "검토", "협의", "조회", "제공", "조치", "보완",
    "날인", "실시", "승계", "결정", "추진", "발급", "등록부", "명단", "현황",
)

# 계획서 형태를 띠어도 회계·개별처리 문서인 표현.
#
# ※ '교부계획'을 통째로 막으면 안 된다.
#   「육상경기대회 참가 지원 경비 교부 계획(안)」처럼 사업 지원 계획도
#   '교부 계획'이라고 쓴다. 다만 '교부 계획 변경'은 배정액을 고치는
#   회계 문서라서 그 조합만 막는다.
FISCAL_PHRASE_RE = re.compile(r"전출금|사안\s*처리계획|교부[^·]{0,12}계획\s*변경")

# 공사·전산·재정 절차에 딸려 나오는 부속 서류. 이름은 '○○계획서'지만
# 정책계획이 아니라 시공·설비·예산 절차의 첨부물이다.
#   「접근제어시스템 계정관리 모듈 설치 작업계획서」
#   「안전관리계획서 검토 결과에 따른 승인서 발급」
#   「2027년도 성인지예산 및 예산의 성과계획서 작성 배움자리 등록부」
# 이름이 충분히 특정적이라 부분 포함으로 막아도 정책계획을 다치게 하지 않는다.
ANNEX_DOC_RE = re.compile(
    r"작업계획서|안전관리계획서|안전보건계획서|유해위험방지계획서|품질시험계획서"
    r"|에너지절약계획서|시공계획서|공정계획서|해체계획서|감리계획서|측량계획서"
    r"|설치계획서|발주계획서|검사계획서|소방계획서|조치계획서"
    r"|성과계획서|성과평가계획서|직무수행계획서"
)


# '(안)'은 부연이 아니라 계획서 표시다. 괄호를 떼기 전에 글자로 흡수해
# '교부 계획(안)'이 '교부 계획'이 돼 계획서 신호를 잃는 일을 막는다.
AN_RE = re.compile(r"\s*[(（]\s*안\s*[)）]")


def _strip_tail_parens(t):
    """제목 끝에 달린 괄호 부연을 떼어낸다."""
    t = AN_RE.sub("안", t)
    for _ in range(4):
        before = t
        for rx in TAIL_PAREN_RES:
            t = rx.sub("", t).strip()
        if t == before:
            break
    return t


def _is_processing_doc(title):
    """제목 끝 어미로 '계획을 세운 문서'가 아닌 '처리·요청 문서'를 가려낸다."""
    words = _strip_tail_parens(title).replace("·", " ").split()
    if not words:
        return False
    last = words[-1].rstrip(".·")
    # '추진'은 '계획 추진'처럼 계획 뒤에 오면 계획서지만,
    # '계약 추진'처럼 다른 말 뒤에 오면 집행 문서다.
    if last.endswith("추진"):
        prev = words[-2] if len(words) > 1 else ""
        return not prev.endswith(("계획", "계획서", "사업"))
    return last.endswith(TAIL_WORDS)


def _head_tags(title):
    """제목 앞에 붙은 말머리를 모두 돌려준다.

    '[원인][이체] …' 처럼 연달아 붙은 것과 '[안내-신청]' 처럼 한 괄호에
    여러 개가 들어간 것을 모두 펼친다.
    """
    tags, rest = [], title
    for _ in range(4):                       # 말머리는 많아야 서너 개
        m = HEAD_TAG_RE.match(rest)
        if not m:
            break
        tags += [t for t in TAG_SPLIT_RE.split(m.group(1)) if t]
        rest = rest[m.end():].lstrip()
    return tags


def _is_drop_tag(tag):
    """말머리 하나가 버릴 신호인지.

    '지출결의'·'계약방법결정'·'희망제출'처럼 변형이 끝없이 나오므로
    앞뒤 어느 쪽이든 신호어와 맞으면 버린다. 다만 '교부계획'·'집행계획'처럼
    '계획'으로 끝나면 계획서 신호가 우선이므로 남긴다.
    """
    t = tag.replace(" ", "")
    if not t:
        return False
    if t.endswith("계획") or t.endswith("계획서"):
        return False
    return t.startswith(DROP_TAGS) or t.endswith(DROP_TAGS)


def is_plan(title):
    """제목만 보고 정책계획서인지 판단한다.

    (1) 계획서 형태여야 하고
    (2) 회계·서무 처리나 접수 문서 말머리가 아니어야 하고
    (3) '~제출/회신/송부'처럼 접수 어미로 끝나지 않아야 한다.
    애매하면 남긴다 — 검색해서 거르는 편이 아예 안 보이는 것보다 낫다.
    """
    t = (title or "").strip()
    if not t:
        return False
    # 계획서 형태인지도 끝 괄호를 뗀 뒤에 본다.
    #   '수의계약 상대자 결정 및 계약 추진[… 안전관리계획서 검토 용역]'
    # 처럼 괄호 안 부연에만 '계획서'가 있는 문서를 계획서로 오인하지 않기 위해서다.
    if not _looks_like_plan(_strip_tail_parens(t)):
        return False
    if any(_is_drop_tag(tag) for tag in _head_tags(t)):
        return False
    if _is_processing_doc(t):
        return False
    if FISCAL_PHRASE_RE.search(t):
        return False
    if ANNEX_DOC_RE.search(t):
        return False
    return True


# ─────────────────────────── 본청 판별 ───────────────────────────
# 소속·직속기관 이름의 '끝'에 오는 말.
#
# ※ 반드시 endswith로 판별해야 한다(부분 포함으로 하면 안 된다).
#   '학교'를 부분 포함으로 검사하면 본청 부서인 '학교혁신과'·'학교지원과'·
#   '학교교육국'이 통째로 소속기관으로 오판돼 사라진다.
SUB_ORG_SUFFIX = (
    "교육지원청", "지원청", "도서관", "연수원", "교육원", "과학관", "수련원",
    "연구원", "진흥원", "정보원", "문화원", "박물관", "체험관", "미술관",
    "회관", "학습관", "문화관", "복지관", "체육관",
    "학교", "캠퍼스", "유치원", "분원", "교육대학", "직업전문학교",
    "센터", "지원단", "교육청",
)
# 본청 내부 조직 단위. '도서관'도 '관'으로 끝나므로 SUB_ORG_SUFFIX를 먼저 본다.
HEAD_UNIT_SUFFIX = ("국", "관", "단", "실", "본부", "부")

OFFICE_ALIAS = {
    "전라북도교육청": "전북특별자치도교육청",
    "강원도교육청": "강원특별자치도교육청",
}


def normalize_office(name):
    return OFFICE_ALIAS.get((name or "").strip(), (name or "").strip())


def _looks_like_institution(token, office):
    if token.endswith(SUB_ORG_SUFFIX):
        return True
    if office and token.startswith(office) and token != office:
        return True
    return False


def is_head_office(row):
    """본청 문서만 통과. 교육지원청·도서관·연수원 등 소속·직속기관은 제외.

      본청   : '부산광역시교육청 교육국 유아교육과'
      본청   : '인천광역시교육청 학교교육국 초등교육과'   ← '학교'로 시작하지만 본청
      본청   : '경상남도교육청 정책기획관'
      직속기관: '대구광역시교육청 대구미래교육연구원 행정정보부'
      소속기관: '전라남도교육청 전라남도장성교육지원청 교육지원과'
    """
    office = (row.get("PROC_INSTT_NM") or "").strip()
    full = (row.get("NFLST_CHRG_DEPT_NM") or "").strip()
    if not office or not office.endswith("교육청"):
        return False           # 교육지원청이 처리기관이면 애초에 본청이 아니다
    if not full:
        return True
    tokens = full.split()
    if tokens and tokens[0] == office:
        tokens = tokens[1:]
    if not tokens:
        return True
    if len(tokens) == 1:
        return not _looks_like_institution(tokens[0], office)
    for t in tokens[:-1]:
        if _looks_like_institution(t, office):
            return False
        if t.endswith(HEAD_UNIT_SUFFIX):
            continue
        return False
    return True


# ─────────────────────────── 수집 ───────────────────────────
# 두 목록을 모두 받는다.
#   정보목록(infoList)        : 기관이 보유·관리한다고 등록한 문서 목록
#   원문정보(orginlInfoList)  : 원문 파일까지 공개한 결재문서
# 한쪽이 다른 쪽을 포함하지 않는다. 실측(2026-08-07 하루):
#   정보목록 1,298건 · 원문정보 189건인데 그중 43건(22.8%)은 정보목록에 없다.
# 등록 경로가 달라 한쪽에만 올라가는 문서가 생기므로 둘 다 받아 합친다.
ENDPOINTS = (
    ("정보목록", "/othicInfo/infoList/infoList.ajax"),
    ("원문정보", "/othicInfo/infoList/orginlInfoList.ajax"),
)

JS_FETCH = """
async ({url, kwd, start, end, page, rows}) => {
  const body = new URLSearchParams({
    kwd, insttSeCd:'E', eduYn:'N', startDate:start, endDate:end,
    rowPage:String(rows), viewPage:String(page), sort:'s', offSet:String((page-1)*rows)
  });
  const r = await fetch(url, {
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8',
             'X-Requested-With':'XMLHttpRequest'},
    body
  });
  const j = await r.json();
  return {code:j.result.code, total:j.result.rtnTotal, rows:j.result.rtnList||[]};
}
"""


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
        "id": f"il-{row.get('PRDCTN_INSTT_REGIST_NO','')}-{row.get('PRDCTN_DT','')}",
        "source": " · ".join(row.get("_sources") or ["정보목록"]),
        "office": normalize_office(row.get("PROC_INSTT_NM", "")),
        # 전체 부서 경로(본청 판별 근거). 나중에 재필터할 수 있게 통째로 남긴다.
        "org": row.get("NFLST_CHRG_DEPT_NM") or row.get("ALL_PROC_INSTT_NM", ""),
        "department": row.get("CHRG_DEPT_NM", ""),
        "title": (row.get("INFO_SJ") or "").strip(),
        "doc_no": row.get("DOC_NO", ""),
        "unit_job": row.get("UNIT_JOB_NM", ""),
        "published_date": date,
        "policy_year": int(dt[:4]) if len(dt) >= 4 and dt[:4].isdigit() else None,
        # 원문 파일까지 공개된 문서인지. Y면 상세에서 파일을 볼 수 있다.
        # 파일을 실제로 열 수 있는지는 두 조건을 모두 봐야 한다.
        #   ORGNAL_YN   : 원문공개 대상 직급(국장급·부단체장 이상 결재)인가
        #   OTHBC_SE_CD : 1 공개 · 2 부분공개 · 3 비공개
        # 상세 페이지 실측:
        #   Y+3 → "비공개 문서이므로 열람이 불가능합니다"
        #   Y+2 → 본문 pdf·붙임 hwp 다운로드 가능
        #   N+1 → "원문공개 대상(국장급 이상)이 아닙니다"
        # ORGNAL_YN만 보고 걸렀더니 비공개 문서가 섞여 헛걸음이 생겼다.
        "has_original": (row.get("ORGNAL_YN") or "") == "Y",
        "open_code": (row.get("OTHBC_SE_CD") or "").strip(),
        "readable": ((row.get("ORGNAL_YN") or "") == "Y"
                     and (row.get("OTHBC_SE_CD") or "").strip() in ("1", "2")),
        "detail_url": detail,
        # 담당자명(CHARGER_NM)은 개인정보이므로 저장하지 않음
    }


def _pack(docs, stats, note):
    return {
        "source": "정보공개포털(open.go.kr) 정보목록",
        "note": note,
        "generated_at": datetime.datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S"),
        "count": len(docs),
        "offices": sorted({d["office"] for d in docs if d["office"]}),
        "departments": sorted({d["department"] for d in docs if d["department"]}),
        "years": sorted({(d.get("policy_year") or (d.get("published_date") or "")[:4])
                         for d in docs if d.get("policy_year") or d.get("published_date")},
                        key=str, reverse=True),
        "coverage": stats or {},
        "documents": docs,
    }


# 화면용 파일에서 뺄 항목.
#   detail_url : id 에 든 등록번호·생산일시로 브라우저에서 조립할 수 있다(가장 무겁다)
#   org        : 본청 판별 근거일 뿐 화면에는 department 로 충분
#   policy_year: published_date 앞 네 자리와 같다
#   source     : 어느 목록에서 왔는지는 has_original 로 갈음한다
# 55,148건 기준 31MB → 20MB로 줄어든다. 원본(RAW)에는 전부 남는다.
WEB_DROP_FIELDS = ("detail_url", "org", "policy_year", "source")


def _slim(doc):
    return {k: v for k, v in doc.items() if k not in WEB_DROP_FIELDS}


def save(existing, stats=None):
    """원본(RAW)과 필터 결과(OUT)를 함께 저장한다.

    existing에는 본청 문서가 필터 없이 전부 들어 있다. 계획 판별은 저장 시점에
    하므로, 나중에 필터를 고치면 --refilter 한 번으로 다시 만들 수 있다.
    """
    raw = sorted(existing.values(), key=lambda x: x.get("published_date") or "", reverse=True)
    kept = [d for d in raw if is_plan(d.get("title", ""))]
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(_pack(raw, stats, "본청 문서 원본(계획 판별 전). 필터 재적용용이며 웹에는 쓰지 않는다."),
              open(RAW, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    json.dump(_pack([_slim(d) for d in kept], stats,
                    "각 교육청 본청 부서가 생산한 계획 문서 목록. 문서 파일은 제공하지 않으며 "
                    "담당자명은 수집하지 않는다. 상세는 정보공개포털 링크에서 확인. "
                    "detail_url은 id의 등록번호·생산일시로 조립한다."),
              open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    return len(kept), len(raw)


def _fetch_one(page_obj, url, kwd, day):
    """한 목록(정보목록 또는 원문정보)의 하루치를 모두 받는다."""
    def call(p):
        for attempt in range(3):
            res = page_obj.evaluate(JS_FETCH, {"url": url, "kwd": kwd, "start": day,
                                               "end": day, "page": p, "rows": ROWS})
            if res.get("code") == "200":
                return res
            print(f"    [재인증] code={res.get('code')} — 세션 갱신 ({attempt+1}/3)")
            page_obj.goto(LIST_PAGE, timeout=60000)
            page_obj.wait_for_timeout(2500)
        return None

    first = call(1)
    if not first:
        return None
    total = int(first.get("total") or 0)
    seen, rows = set(), []
    pages = min((total + ROWS - 1) // ROWS, MAX_PAGES) or 1
    for p in range(1, pages + 1):
        res = first if p == 1 else call(p)
        if not res:
            continue
        for row in res.get("rows") or []:
            key = f"{row.get('PRDCTN_INSTT_REGIST_NO','')}|{row.get('PRDCTN_DT','')}"
            if key in seen:
                continue
            seen.add(key)
            rows.append(row)
        if p < pages:
            time.sleep(DELAY)
    if total > len(rows):
        print(f"    ::warning:: {day} 서버 {total}건 중 {len(rows)}건만 수신")
    return rows


def fetch_day(page_obj, kwd, day):
    """정보목록과 원문정보를 둘 다 받아 합친다. 어느 쪽에서 왔는지 표시한다."""
    merged, failed = {}, []
    for name, url in ENDPOINTS:
        rows = _fetch_one(page_obj, url, kwd, day)
        if rows is None:
            failed.append(name)
            continue
        for row in rows:
            key = f"{row.get('PRDCTN_INSTT_REGIST_NO','')}|{row.get('PRDCTN_DT','')}"
            if key in merged:
                merged[key].setdefault("_sources", []).append(name)
            else:
                row["_sources"] = [name]
                merged[key] = row
        time.sleep(DELAY)
    if failed and len(failed) == len(ENDPOINTS):
        return None
    if failed:
        print(f"    ::warning:: {day} {'·'.join(failed)} 조회 실패")
    return list(merged.values())


def collect_range(page_obj, kwd, d0, d1, existing, stats):
    added = skipped = 0
    cur, i, span = d0, 0, (d1 - d0).days + 1
    while cur <= d1:
        i += 1
        day = cur.strftime("%Y%m%d")
        rows = fetch_day(page_obj, kwd, day)
        if rows is None:
            print(f"    [실패] {day} — 건너뜀")
            stats["failed_days"].append(cur.isoformat())
        else:
            stats["scanned"] += len(rows)
            for row in rows:
                # 본청 문서는 계획 여부와 무관하게 원본으로 담아 둔다.
                # 계획 판별은 save()에서 하므로 나중에 필터만 고쳐 다시 뽑을 수 있다.
                if not is_head_office(row):
                    skipped += 1
                    continue
                doc = to_doc(row)
                existing[doc["id"]] = doc
                added += 1
        if i % 10 == 0:
            kept, raw = save(existing, stats)
            print(f"    …{i}/{span}일 ({day}) 훑음 {stats['scanned']:,} → 본청 {raw:,} · 계획 {kept:,}")
        cur += datetime.timedelta(days=1)
        time.sleep(DELAY)
    return added, skipped


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--since", help="수집 시작일 YYYY-MM-DD")
    ap.add_argument("--until", help="수집 종료일 YYYY-MM-DD (비우면 오늘). "
                                    "이미 받아 둔 구간을 다시 조회하지 않을 때 쓴다")
    ap.add_argument("--months", type=int, help="최근 N개월 수집 (예: 3)")
    ap.add_argument("--days", type=int, default=3, help="증분 수집 기간(기본 최근 3일)")
    ap.add_argument("--kwd", default="계획")
    ap.add_argument("--headed", action="store_true", help="브라우저 창을 띄워 실행(디버깅용)")
    ap.add_argument("--refilter", action="store_true",
                    help="수집은 하지 않고 저장된 데이터에 현재 필터를 다시 적용한다")
    a = ap.parse_args()

    # 필터를 손봤을 때 다시 수집하지 않아도 되게 한다.
    # 반드시 원본(RAW)에서 다시 뽑는다. 필터 결과(OUT)를 다시 거르면
    # 필터를 느슨하게 고쳐도 이미 빠진 문서를 되살릴 수 없다.
    if a.refilter:
        src = RAW if os.path.exists(RAW) else OUT
        if not os.path.exists(src):
            raise SystemExit(f"{RAW} 이 없습니다. 먼저 수집하세요.")
        if src == OUT:
            print("::warning:: 원본(infolist_raw.json)이 없어 필터 결과에서 다시 거릅니다.\n"
                  "            필터를 느슨하게 바꾼 경우 빠진 문서는 복구되지 않습니다.\n"
                  "            다음 수집부터는 원본이 함께 저장됩니다.")
        prev = json.load(open(src, encoding="utf-8"))
        docs = {d["id"]: d for d in prev.get("documents", [])}
        kept, raw = save(docs, prev.get("coverage"))
        print(f"재필터: 원본 {raw:,}건 → 계획 {kept:,}건 (제외 {raw - kept:,})")
        return

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise SystemExit("playwright가 필요합니다:\n  pip install playwright\n"
                         "  python -m playwright install chromium")

    existing = {}
    src = RAW if os.path.exists(RAW) else OUT      # 원본이 있으면 원본에 이어 붙인다
    if os.path.exists(src):
        try:
            for d in json.load(open(src, encoding="utf-8")).get("documents", []):
                existing[d["id"]] = d
        except Exception:
            pass
    before = len(existing)

    today = datetime.date.today()
    if a.since:
        d0 = datetime.date.fromisoformat(a.since)
    elif a.months:
        d0 = today - datetime.timedelta(days=30 * a.months)
    else:
        d0 = today - datetime.timedelta(days=a.days)
    d1 = datetime.date.fromisoformat(a.until) if a.until else today
    span = (d1 - d0).days + 1
    print(f"수집 구간: {d0} ~ {d1} ({span}일) · 예상 {span * 6 * DELAY / 60:.0f}분\n")

    # 이번에 받은 구간과, 기존 데이터까지 합친 전체 구간을 함께 남긴다.
    stats = {"from": d0.isoformat(), "to": d1.isoformat(), "days": span,
             "scanned": 0, "failed_days": []}
    if existing:
        have = [d.get("published_date") for d in existing.values() if d.get("published_date")]
        if have:
            stats["from"] = min(stats["from"], min(have))
            stats["to"] = max(stats["to"], max(have))

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=not a.headed)
        page = browser.new_page(locale="ko-KR")
        page.goto(LIST_PAGE, timeout=60000)
        page.wait_for_timeout(3000)          # 토큰 발급 대기
        added, skipped = collect_range(page, a.kwd, d0, d1, existing, stats)
        browser.close()

    kept, raw = save(existing, stats)
    print(f"\n훑은 문서 {stats['scanned']:,}건 → 본청 {added:,}건 · 소속기관 제외 {skipped:,}건")
    if stats["failed_days"]:
        print(f"조회 실패한 날 {len(stats['failed_days'])}일: {stats['failed_days'][:10]}")
    print(f"원본 저장: {RAW} · {raw:,}건 (신규 {raw - before:,})")
    print(f"계획 저장: {OUT} · {kept:,}건")


if __name__ == "__main__":
    main()
