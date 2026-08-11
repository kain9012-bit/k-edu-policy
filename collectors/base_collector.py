#!/usr/bin/env python3
"""
공통 수집 엔진: HTTP 세션, 계획서 판별/분류(설정 기반), 문서 레코드 표준화.
교육청별 수집기는 이 모듈의 유틸을 사용하고 파싱 로직만 각자 구현한다.
"""
import os, re, json, time, hashlib, datetime
import requests
from bs4 import BeautifulSoup

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36 K-EduPolicyBot/1.0"

_classify_cache = None


def load_json(path):
    with open(os.path.join(ROOT, path), encoding="utf-8") as f:
        return json.load(f)


def classify_config():
    global _classify_cache
    if _classify_cache is None:
        _classify_cache = load_json("config/classify.json")
    return _classify_cache


def make_session():
    s = requests.Session()
    s.headers.update({"User-Agent": UA, "Accept-Language": "ko,en;q=0.8"})
    return s


def get(session, url, tries=3, timeout=20, delay=0.6):
    """정중한 요청: 재시도·타임아웃·요청 간격."""
    last = None
    for i in range(tries):
        try:
            r = session.get(url, timeout=timeout)
            r.raise_for_status()
            time.sleep(delay)
            return r
        except Exception as e:
            last = e
            time.sleep(1.2 * (i + 1))
    raise last


def soup(html):
    return BeautifulSoup(html, "lxml")


# ---------- 계획서 판별 / 분류 (설정 기반) ----------
def _norm(s):
    return re.sub(r"\s+", "", s or "")


def detect_document_type(text):
    n = _norm(text)
    for kw in classify_config()["include_keywords"]:
        if _norm(kw) in n:
            return kw
    return None


def detect_categories(text):
    n = _norm(text)
    cats = []
    for cat, kws in classify_config()["categories"].items():
        if any(_norm(k) in n for k in kws):
            cats.append(cat)
    return cats or ["기타"]


# 게시판마다 날짜 표기가 제각각이라 한 곳에서 처리한다.
#   2026-08-07 · 2026.8.7 · 2026/08/07 · 20260807 · 26.08.07
# 구분자를 좁게 잡으면 조용히 날짜가 비어버린다(광주 xboard는 슬래시를 써서
# 199건 중 167건이 날짜 없이 저장돼 있었다).
_DATE_RE = re.compile(r"(?<!\d)(\d{2,4})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})(?!\d)")
_DATE_COMPACT_RE = re.compile(r"(?<!\d)(20\d{2})(\d{2})(\d{2})(?!\d)")


def parse_date(text):
    """문자열에서 날짜 하나를 찾아 'YYYY-MM-DD'로 반환. 못 찾으면 ''."""
    if not text:
        return ""
    for m in _DATE_RE.finditer(str(text)):
        y, mo, d = m.group(1), int(m.group(2)), int(m.group(3))
        y = int(y)
        if y < 100:                     # '26.08.07' 같은 두 자리 연도
            y += 2000
        if 1990 <= y <= 2100 and 1 <= mo <= 12 and 1 <= d <= 31:
            return f"{y:04d}-{mo:02d}-{d:02d}"
    m = _DATE_COMPACT_RE.search(str(text))
    if m:
        y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if 1 <= mo <= 12 and 1 <= d <= 31:
            return f"{y:04d}-{mo:02d}-{d:02d}"
    return ""


def pick_date(cells):
    """목록 행의 셀들 중 게시일로 보이는 값을 고른다.

    '2026-2030 학교이전적지 계획' 같은 제목에서 날짜를 잘못 집지 않도록,
    셀 전체가 날짜인 것(작성일 칼럼)을 먼저 찾고, 없을 때만 본문에서 찾는다.
    """
    for t in cells:                      # 1차: 날짜 전용 칼럼
        s = str(t or "").strip()
        if len(s) <= 12 and parse_date(s):
            return parse_date(s)
    for t in cells:                      # 2차: 문서번호 등에 섞인 날짜
        d = parse_date(t)
        if d:
            return d
    return ""


def extract_year(text, fallback_date=None):
    """계획서의 '정책 연도'를 뽑는다.

    제목의 네 자리 숫자를 무조건 연도로 보면
    '독서·토론·인문학 교육 2030 추진 계획'처럼 정책 이름에 든 숫자를 연도로 잡는다.
    그래서 연도 표기가 분명한 것만 쓰고, 그마저도 게시일과 동떨어져 있으면 게시일을 따른다.
    """
    t = text or ""

    # 1) '2023~2026'처럼 기간을 나타내는 구간은 따로 떼어 둔다.
    #    구간 안의 끝 연도를 정책 연도로 착각하면 안 된다.
    #    예: '2026~2030년 중기지방교육재정계획' → 2030이 아니라 2026
    ranges = [(m.start(), m.end(), int(m.group(1)))
              for m in re.finditer(r"(20\d{2})\s*[~∼〜–—-]\s*(20\d{2})", t)]

    def in_range(pos):
        return any(s <= pos < e for s, e, _ in ranges)

    # 2) '2026년' '2026학년도' '2026년도' '2026.' 처럼 연도임이 분명한 표기.
    #    구간 안에 든 것은 뺀다.
    for m in re.finditer(r"(20\d{2})\s*(?:학년도|년도|년|[.\-/])", t):
        if not in_range(m.start()):
            return int(m.group(1))

    # 3) 제목 맨 앞의 연도. 관례상 정책 연도다. 예) '2012 충남교육 주요업무계획'
    #    '2030교실'처럼 숫자에 말이 바로 붙은 것은 연도가 아니므로 뒤에 공백·마침표를 요구한다.
    head = re.match(r"^\s*\[?\s*(20\d{2})[\s.]", t)
    if head:
        return int(head.group(1))

    # 4) 기간만 있으면 시작 연도를 쓴다.
    if ranges:
        return ranges[0][2]

    # 5) 제목에 단서가 없으면 게시일을 따른다.
    #    제목 한가운데 그냥 박힌 네 자리 숫자는 정책 이름일 때가 많아 쓰지 않는다.
    #    예: '독서·토론·인문학 교육 2030 추진 계획'(2025년 게시)
    if fallback_date:
        mm = re.match(r"(\d{4})", str(fallback_date))
        if mm:
            return int(mm.group(1))
    return None


def classify(title, attach_names):
    """반환: (status, document_type, categories)
    status ∈ 정책계획서 · 정책참고자료 · 제외대상 · 확인필요
    """
    cfg = classify_config()
    hay = title + " " + " ".join(attach_names or [])
    n = _norm(hay)
    dtype = detect_document_type(hay)
    cats = detect_categories(hay)
    has_include = dtype is not None
    has_exclude = any(_norm(k) in n for k in cfg["exclude_keywords"])
    is_ref = any(_norm(k) in n for k in cfg["reference_keywords"])

    # 제목 접두 [안내]/[공고]/[모집] 등은 계획서가 아닌 공지·안내물 → 제외대상
    pm = re.match(r"^\s*\[([^\]]+)\]", title)
    if pm and any(p in pm.group(1) for p in cfg.get("exclude_title_prefix", [])):
        return "제외대상", dtype, cats

    # 채용·검정고시·명예퇴직 같은 행정 공고는 '시행계획'이 붙어 있어도 정책계획이 아니다.
    # 포함어보다 먼저 걸러서 '확인필요'가 쌓이는 걸 막는다.
    if any(_norm(k) in n for k in cfg.get("hard_exclude_keywords", [])):
        return "제외대상", dtype, cats

    # 학교마다 한 건씩 올라오는 제출물(예: '학교 자체평가 계획서(만호초)')은 교육청 정책계획이 아니다.
    # 다만 괄호에 학교명이 있다는 것만으로 걸러내면 '자율형 공립고 운영계획서(진천고)' 같은
    # 실제 사업 계획서까지 사라진다. 평가·보고 성격일 때만 제외한다.
    if re.search(r"\((?:[가-힣]{2,10})(?:초|중|고|중학교|고등학교|초등학교)\)\s*$", title) \
       and re.search(r"자체\s*평가|자평|결과\s*보고|실적", title):
        return "제외대상", dtype, cats

    if has_include and not has_exclude:
        return "정책계획서", dtype, cats
    if has_include and has_exclude:
        return "확인필요", dtype, cats           # 포함·제외 동시(예: 시행세부계획 공고) → 관리자 검토
    if is_ref:
        return "정책참고자료", dtype, cats
    if "계획" in hay and not has_exclude:
        return "확인필요", dtype, cats           # '계획'은 있으나 포함어 불명확
    return "제외대상", dtype, cats


def doc_id(office, external_post_id):
    return hashlib.md5(f"{office}:{external_post_id}".encode()).hexdigest()[:16]


# 게시판이 새 글에 붙이는 표시. 목록에서 제목과 함께 긁혀 들어온다.
#   세종 'N 2026년 세종SW해커톤 대회 운영 계획'
#   부산 '2026년 교육공무직원 채용 업무 추진 계획 새글'
# 반드시 뒤에 공백이 있어야 지운다. 공백을 요구하지 않으면
# 'NEIS 사용자 매뉴얼'이 'EIS 사용자 매뉴얼'로 잘린다.
NEW_BADGE_HEAD_RE = re.compile(r"^(?:N|NEW|new|New|새글|신규)\s+")
NEW_BADGE_TAIL_RE = re.compile(r"\s+(?:N|NEW|new|New|새글|신규)$")


def strip_new_badge(title):
    """제목에 딸려온 새 글 표시를 떼어낸다."""
    t = (title or "").strip()
    for _ in range(2):                       # 'N NEW 제목'처럼 겹칠 수 있다
        before = t
        t = NEW_BADGE_HEAD_RE.sub("", t)
        t = NEW_BADGE_TAIL_RE.sub("", t)
        t = t.strip()
        if t == before:
            break
    return t


def build_document(office, short_name, board, raw):
    """raw: {external_post_id, title, department, author, published_date, post_url, attachments[{file_name,file_url}]}"""
    att_names = [a.get("file_name", "") for a in raw.get("attachments", [])]
    dept = (raw.get("department") or "").strip() or board.get("dept_default", "")
    title_raw = strip_new_badge(raw["title"])
    # 제목이 '[부서명] 제목' 형태면 부서 추출 후 제목 정리(경북 통합자료실 등)
    pm = re.match(r"^\[([^\]]{2,12})\]\s*(.+)$", title_raw)
    if pm and re.search(r"(과|관|담당관|단|실|센터)$", pm.group(1)):
        dept = dept or pm.group(1).strip()
        title_raw = pm.group(2).strip()
    status, dtype, cats = classify(title_raw, att_names)
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    return {
        "id": doc_id(office, raw["external_post_id"]),
        "office": office,
        "short_name": short_name,
        "board_id": board["id"],
        "board_name": board["board_name"],
        "board_type": board["board_type"],
        "external_post_id": str(raw["external_post_id"]),
        "title": title_raw,
        "department": dept,
        "author": (raw.get("author") or "").strip(),
        "published_date": raw.get("published_date", ""),
        "policy_year": extract_year(title_raw, raw.get("published_date")),
        "document_type": dtype or "",
        "policy_category": cats,
        "post_url": raw["post_url"],
        "login_required": bool(board.get("login_required", False)),
        "attachments": raw.get("attachments", []),
        "attachment_names": att_names,
        "classification_status": status,
        "collected_at": now,
        "searchtext": " ".join([title_raw, dept, " ".join(att_names)]),
    }
