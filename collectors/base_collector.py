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


def extract_year(text, fallback_date=None):
    m = re.findall(r"(20\d{2})", text or "")
    if m:
        return int(m[0])
    if fallback_date:
        mm = re.match(r"(\d{4})", fallback_date)
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
    has_include = detect_document_type(hay) is not None
    has_exclude = any(_norm(k) in n for k in cfg["exclude_keywords"])
    is_ref = any(_norm(k) in n for k in cfg["reference_keywords"])
    dtype = detect_document_type(hay)
    cats = detect_categories(hay)

    if has_include and not has_exclude:
        return "정책계획서", dtype, cats
    if has_include and has_exclude:
        return "확인필요", dtype, cats           # 포함·제외 동시 → 관리자 검토
    if is_ref:
        return "정책참고자료", dtype, cats
    if "계획" in hay and not has_exclude:
        return "확인필요", dtype, cats           # '계획'은 있으나 포함어 불명확
    return "제외대상", dtype, cats


def doc_id(office, external_post_id):
    return hashlib.md5(f"{office}:{external_post_id}".encode()).hexdigest()[:16]


def build_document(office, short_name, board, raw):
    """raw: {external_post_id, title, department, author, published_date, post_url, attachments[{file_name,file_url}]}"""
    att_names = [a.get("file_name", "") for a in raw.get("attachments", [])]
    status, dtype, cats = classify(raw["title"], att_names)
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    return {
        "id": doc_id(office, raw["external_post_id"]),
        "office": office,
        "short_name": short_name,
        "board_id": board["id"],
        "board_name": board["board_name"],
        "board_type": board["board_type"],
        "external_post_id": str(raw["external_post_id"]),
        "title": raw["title"].strip(),
        "department": (raw.get("department") or "").strip(),
        "author": (raw.get("author") or "").strip(),
        "published_date": raw.get("published_date", ""),
        "policy_year": extract_year(raw["title"], raw.get("published_date")),
        "document_type": dtype or "",
        "policy_category": cats,
        "post_url": raw["post_url"],
        "login_required": bool(board.get("login_required", False)),
        "attachments": raw.get("attachments", []),
        "attachment_names": att_names,
        "classification_status": status,
        "collected_at": now,
        "searchtext": " ".join([raw["title"], raw.get("department") or "", " ".join(att_names)]),
    }
