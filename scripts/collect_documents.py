#!/usr/bin/env python3
"""
정책계획 통합수집 오케스트레이터.
config/offices.json + config/boards.json 을 읽어 활성 게시판을 교육청별 수집기로 수집,
계획서 판별·분류 후 data/documents.json 에 저장한다. (신규/변경 기준 병합)

사용법:
  python3 scripts/collect_documents.py            # 활성 게시판 전체
  python3 scripts/collect_documents.py --office jeonbuk
"""
import os, sys, json, argparse, datetime
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from collectors import base_collector as bc
from collectors import jbe_collector, goe_collector

COLLECTORS = {"jbe": jbe_collector, "goe": goe_collector}
DATA_PATH = os.path.join(bc.ROOT, "data", "documents.json")
KEEP_STATUS = {"정책계획서", "정책참고자료", "확인필요"}  # 제외대상은 저장 안 함


def run(office_filter=None):
    offices = {o["id"]: o for o in bc.load_json("config/offices.json")}
    boards = bc.load_json("config/boards.json")
    session = bc.make_session()

    # 기존 문서 로드(병합)
    existing = {}
    if os.path.exists(DATA_PATH):
        try:
            for d in json.load(open(DATA_PATH, encoding="utf-8")).get("documents", []):
                existing[d["id"]] = d
        except Exception:
            pass

    logs = []
    for board in boards:
        if not board.get("is_active"):
            continue
        off = offices.get(board["office"])
        if not off or not off.get("is_active"):
            continue
        if office_filter and board["office"] != office_filter:
            continue
        mod = COLLECTORS.get(board["collector_type"])
        if not mod:
            print(f"  [skip] {board['id']}: 수집기 없음({board['collector_type']})")
            continue

        log = {"board_id": board["id"], "started_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
               "status": "성공", "new_count": 0, "updated_count": 0, "skipped_count": 0, "error_count": 0}
        try:
            raws = mod.collect(board, session, log)
        except Exception as e:
            log["status"] = "실패"; log["error_message"] = str(e); logs.append(log)
            print(f"  [FAIL] {board['id']}: {e}")
            continue

        kept = 0
        for raw in raws:
            doc = bc.build_document(off["id"], off["short_name"], board, raw)
            if doc["classification_status"] not in KEEP_STATUS:
                log["skipped_count"] += 1
                continue
            if doc["id"] in existing:
                log["updated_count"] += 1
            else:
                log["new_count"] += 1
            existing[doc["id"]] = doc
            kept += 1
        log["finished_at"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        if log["error_count"]:
            log["status"] = "부분성공"
        logs.append(log)
        print(f"  [ok] {off['short_name']}/{board['board_name']}: 수집 {len(raws)}건 · 저장 {kept}건 · 제외 {log['skipped_count']}건")

    docs = list(existing.values())
    docs.sort(key=lambda d: (d.get("published_date") or ""), reverse=True)

    def uniq(key):
        return sorted({v for d in docs for v in ([d[key]] if isinstance(d[key], str) else d[key]) if v})

    out = {
        "generated_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "offices": sorted({d["short_name"] for d in docs}),
        "years": sorted({d["policy_year"] for d in docs if d["policy_year"]}, reverse=True),
        "departments": sorted({d["department"] for d in docs if d["department"]}),
        "document_types": sorted({d["document_type"] for d in docs if d["document_type"]}),
        "categories": sorted({c for d in docs for c in d["policy_category"]}),
        "statuses": sorted({d["classification_status"] for d in docs}),
        "count": len(docs),
        "logs": logs,
        "documents": docs,
    }
    os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
    json.dump(out, open(DATA_PATH, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"\n저장: {DATA_PATH} · 총 {len(docs)}건 (교육청 {len(out['offices'])}곳)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--office")
    a = ap.parse_args()
    run(a.office)
