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
from collectors import (jbe_collector, goe_collector, jje_collector, gwe_collector,
                        gne_collector, dje_collector, dge_collector, gen_collector)

COLLECTORS = {"jbe": jbe_collector, "goe": goe_collector, "jje": jje_collector,
              "gwe": gwe_collector, "gne": gne_collector, "dje": dje_collector,
              "dge": dge_collector, "gen": gen_collector}
DATA_PATH = os.path.join(bc.ROOT, "data", "documents.json")
# 게시판별 keep 정책:
#  keep_all=true  → 제외대상 포함 전부 저장(통합 게시판, 자료실 등)
#  keep_all=false → 계획서·참고자료·확인필요만 저장(부서 분산형 자료실: 노이즈 제외)
KEEP_ALL = {"정책계획서", "정책참고자료", "확인필요", "제외대상"}
KEEP_FILTERED = {"정책계획서", "정책참고자료", "확인필요"}


def run(office_filter=None):
    offices = {o["id"]: o for o in bc.load_json("config/offices.json")}
    boards = bc.load_json("config/boards.json")
    # 자동 발견된 부서 게시판(config/boards_auto.json) 병합
    auto_path = os.path.join(bc.ROOT, "config", "boards_auto.json")
    if os.path.exists(auto_path):
        try:
            boards += json.load(open(auto_path, encoding="utf-8")).get("boards", [])
        except Exception:
            pass
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

        keep_status = KEEP_ALL if board.get("keep_all") else KEEP_FILTERED
        kept = 0
        for raw in raws:
            doc = bc.build_document(off["id"], off["short_name"], board, raw)
            if doc["classification_status"] not in keep_status:
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

    # 출처·수집현황(모든 활성 게시판)
    sources = []
    for board in boards:
        off = offices.get(board["office"])
        if not board.get("is_active") or not off or not off.get("is_active"):
            continue
        bdocs = [d for d in docs if d["board_id"] == board["id"]]
        blog = next((l for l in logs if l["board_id"] == board["id"]), {})
        sources.append({
            "office": off["short_name"], "office_name": off["name"],
            "board_name": board["board_name"], "board_type": board["board_type"],
            "menu_path": board.get("menu_path", ""),
            "list_url": board["config"].get("list_url", ""),
            "login_required": bool(board.get("login_required")),
            "license": board.get("license", "공공누리(기관 표기 확인)"),
            "robots": board.get("robots", "확인 필요"),
            "rss": bool(board.get("rss")),
            "count": len(bdocs),
            "plan_count": sum(1 for d in bdocs if d["classification_status"] == "정책계획서"),
            "last_collected": blog.get("finished_at") or blog.get("started_at", ""),
        })
    total_offices = sum(1 for o in offices.values() if o.get("is_active"))

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
        "coverage": {"connected": len({s["office"] for s in sources}), "total": 16,
                     "boards": len(sources), "active_offices": total_offices},
        "sources": sources,
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
