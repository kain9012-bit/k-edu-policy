#!/usr/bin/env python3
"""주요업무계획 세부사업을 교육청별로 파싱하고, 공통 축(정책분야 태그)으로 정렬해
비교용 데이터(data/plan_compare.json)를 만든다.

- 전북: 기존 data/plans.json 재사용
- 경기: PDF 파싱(4단 코드 헤더 1-1-1-1 + 담당부서 + • 추진과제)
- 두 교육청 세부사업에 config/classify.json의 22개 정책분야 태그 부여
"""
import os, re, json, sys
import fitz
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from collectors.base_collector import detect_categories, ROOT

OUT = os.path.join(ROOT, "data", "plan_compare.json")

GYEONGGI_FIELDS = {
    "1": "정책1 학교 자율과 책임으로 역량을 키우는 교육",
    "2": "정책2 지역협력으로 꿈을 펼치는 교육",
    "3": "정책3 시공간을 넘어 배움을 확장하는 교육",
    "4": "정책4 학교중심의 공교육 확대를 지원하는 행정",
}
HEAD = re.compile(r"^(\d)-(\d)-(\d)-(\d+)\s+(.+)")


def parse_gyeonggi(pdf_path):
    doc = fitz.open(pdf_path)
    lines = []
    for p in range(doc.page_count):
        for l in doc[p].get_text().split("\n"):
            s = l.replace("\xa0", " ").rstrip()
            if len(s.strip()) > 1:
                lines.append(s.strip())
    heads = [(i, HEAD.match(l)) for i, l in enumerate(lines)]
    heads = [(i, m) for i, m in heads if m]
    items, seen = [], set()
    for k, (start, m) in enumerate(heads):
        code = "-".join(m.groups()[:4])
        if code in seen:
            continue
        seen.add(code)
        end = heads[k + 1][0] if k + 1 < len(heads) else len(lines)
        block = lines[start + 1:end]
        dept = ""
        if block and re.search(r"(과|원|센터|관|담당관)", block[0]) and len(block[0]) < 60:
            dept = block[0]
        tasks = [re.sub(r"^[•·]\s*", "", l).strip() for l in block
                 if l.startswith("•") or l.startswith("·")]
        name = m.group(5).strip()
        text = name + " " + " ".join(tasks)
        items.append({
            "office": "경기", "code": code, "name": name,
            "field": GYEONGGI_FIELDS.get(m.group(1), ""),
            "dept": dept, "tasks": tasks[:8],
            "categories": [c for c in detect_categories(name) if c != "기타"] or ["기타"],
            "searchtext": text,
        })
    return items


def load_jeonbuk():
    p = os.path.join(ROOT, "data", "plans.json")
    plans = json.load(open(p, encoding="utf-8"))["plans"]
    items = []
    for x in plans:
        tasks = [t["title"] for t in x.get("tasks", [])]
        text = x["name"] + " " + " ".join(tasks) + " " + x.get("dept", "")
        items.append({
            "office": "전북", "code": x["code"], "name": x["name"],
            "field": x["field"] + " · " + x["area"], "dept": x["dept"],
            "tasks": tasks[:8],
            "categories": [c for c in detect_categories(x["name"]) if c != "기타"] or ["기타"],
            "searchtext": text,
        })
    return items


def main():
    pdf = sys.argv[1] if len(sys.argv) > 1 else None
    if not pdf or not os.path.exists(pdf):
        sys.exit("경기 주요업무계획 PDF 경로를 인자로 주세요.")
    items = load_jeonbuk() + parse_gyeonggi(pdf)
    out = {
        "offices": ["전북", "경기"],
        "categories": sorted({c for it in items for c in it["categories"]}),
        "counts": {o: sum(1 for it in items if it["office"] == o) for o in ["전북", "경기"]},
        "items": items,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"저장: {OUT} · 전북 {out['counts']['전북']} + 경기 {out['counts']['경기']} = {len(items)}개 세부사업")
    print(f"정책분야 축: {len(out['categories'])}개")


if __name__ == "__main__":
    main()
