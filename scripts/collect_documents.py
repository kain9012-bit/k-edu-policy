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
# 수집 시각은 한국시간으로 적는다.
# GitHub Actions 러너는 UTC라, 그냥 now() 를 쓰면 새벽 5시(KST)에 돌린 수집이
# 전날 20시로 기록돼 화면에 하루 어긋나 보인다.
from zoneinfo import ZoneInfo
KST = ZoneInfo("Asia/Seoul")

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# 첨부파일은 수집하지 않는다(원문 링크로 연결). 목록 페이지만 수집해 빠르고 정중하게 동작.
os.environ.setdefault("SKIP_DETAIL", "1")

from collectors import base_collector as bc
from collectors import (jbe_collector, goe_collector, jje_collector, gwe_collector,
                        gne_collector, dje_collector, dge_collector, gen_collector,
                        cne_collector)
from collectors.io_util import write_json_atomic

COLLECTORS = {"jbe": jbe_collector, "goe": goe_collector, "jje": jje_collector,
              "gwe": gwe_collector, "gne": gne_collector, "dje": dje_collector,
              "dge": dge_collector, "gen": gen_collector, "cne": cne_collector}
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
        # 여기서 조용히 넘어가면 안 된다.
        # 아래 '꺼둔 게시판 문서 제외'가 자동발견 게시판 191개를 전부 '없는 게시판'으로 보고
        # 그 문서를 통째로 지운 뒤 커밋·배포해 버린다. 파일이 깨졌으면 그 자리에서 멈춘다.
        try:
            auto = json.load(open(auto_path, encoding="utf-8")).get("boards", [])
        except Exception as e:
            sys.exit(f"config/boards_auto.json 을 읽지 못했습니다: {e}\n"
                     f"이대로 진행하면 자동발견 게시판의 문서가 전부 지워집니다.")
        if not auto:
            sys.exit("config/boards_auto.json 에 게시판이 없습니다. 파일이 비었는지 확인하세요.")
        boards += auto
    session = bc.make_session()

    # 기존 문서 로드(병합)
    existing = {}
    prev_sources = {}       # 게시판별 직전 수집이력(이번에 안 돈 게시판의 시각을 보존)
    if os.path.exists(DATA_PATH):
        try:
            _prev = json.load(open(DATA_PATH, encoding="utf-8"))
            for d in _prev.get("documents", []):
                existing[d["id"]] = d
            for s in _prev.get("sources", []):
                if s.get("board_id"):
                    prev_sources[s["board_id"]] = s
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

        log = {"board_id": board["id"], "started_at": datetime.datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S"),
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
        log["finished_at"] = datetime.datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S")
        if log["error_count"]:
            log["status"] = "부분성공"
        logs.append(log)
        print(f"  [ok] {off['short_name']}/{board['board_name']}: 수집 {len(raws)}건 · 저장 {kept}건 · 제외 {log['skipped_count']}건")

    docs = list(existing.values())

    # 꺼둔 게시판에서 모은 문서는 목록에서 뺀다.
    # 병합 방식이라 이 걸러내기가 없으면, 게시판을 꺼도 예전에 모은 문서가 계속 남는다.
    # (예: 충북 '일반고 교육력 프로젝트'는 학교가 올리는 곳이라 본청 계획이 아니다)
    active_board_ids = {
        b["id"] for b in boards
        if b.get("is_active") and (offices.get(b["office"]) or {}).get("is_active")
    }
    dropped = sum(1 for d in docs if d.get("board_id") not in active_board_ids)
    if dropped:
        print(f"  꺼둔 게시판의 문서 {dropped}건 제외")
    docs = [d for d in docs if d.get("board_id") in active_board_ids]

    docs.sort(key=lambda d: (d.get("published_date") or ""), reverse=True)

    # 출처·수집현황(모든 활성 게시판)
    sources = []
    for board in boards:
        off = offices.get(board["office"])
        if not board.get("is_active") or not off or not off.get("is_active"):
            continue
        bdocs = [d for d in docs if d["board_id"] == board["id"]]
        blog = next((l for l in logs if l["board_id"] == board["id"]), None)
        prev = prev_sources.get(board["id"], {})

        # last_attempt : 마지막으로 이 게시판에 '접근을 시도한' 시각(실패 포함)
        # last_success : 마지막으로 목록을 정상적으로 읽어낸 시각
        # 이번 실행에서 안 돈 게시판(--office 지정 등)은 직전 값을 그대로 승계한다.
        if blog:
            attempt = blog.get("finished_at") or blog.get("started_at", "")
            success = attempt if blog.get("status") != "실패" else prev.get("last_success", "")
            status = blog.get("status", "")
        else:
            attempt = prev.get("last_attempt", "")
            success = prev.get("last_success", "")
            status = prev.get("status", "")

        sources.append({
            "board_id": board["id"],
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
            "latest_post_date": max((d.get("published_date") or "" for d in bdocs), default=""),
            # 게시일을 못 읽은 문서 수. 많으면 '최신 계획서' 표시가 왜곡되므로 파서 점검 대상.
            "undated": sum(1 for d in bdocs if not d.get("published_date")),
            "last_attempt": attempt,
            "last_success": success,
            "status": status,
            "last_collected": attempt,      # 이전 버전 호환
        })
    total_offices = sum(1 for o in offices.values() if o.get("is_active"))
    # 전남·광주는 전남광주통합특별시교육청으로 통합됐다. 옛 홈페이지가 남아 있어
    # 수집은 계속하지만, '몇 개 시도교육청'을 셀 때는 한 곳으로 본다.
    agency_count = sum(1 for o in offices.values()
                       if o.get("is_active") and not o.get("merged_into"))

    # 교육청 단위 요약 — 사용자가 가장 먼저 보는 정보
    office_stats = []
    for oid, off in offices.items():
        if not off.get("is_active"):
            continue
        osrc = [s for s in sources if s["office"] == off["short_name"]]
        if not osrc:
            continue
        odocs = [d for d in docs if d["office"] == oid]
        office_stats.append({
            "office": oid,
            "short_name": off["short_name"],
            "name": off["name"],
            "homepage": off.get("homepage", ""),
            "boards": len(osrc),
            "count": len(odocs),
            "plan_count": sum(1 for d in odocs if d["classification_status"] == "정책계획서"),
            "latest_post_date": max((d.get("published_date") or "" for d in odocs), default=""),
            "undated": sum(1 for d in odocs if not d.get("published_date")),
            "last_attempt": max((s["last_attempt"] for s in osrc if s["last_attempt"]), default=""),
            "last_success": max((s["last_success"] for s in osrc if s["last_success"]), default=""),
            "failed_boards": sum(1 for s in osrc if s["status"] == "실패"),
            "empty_boards": sum(1 for s in osrc if s["count"] == 0),
        })
    office_stats.sort(key=lambda x: -x["plan_count"])

    def uniq(key):
        return sorted({v for d in docs for v in ([d[key]] if isinstance(d[key], str) else d[key]) if v})

    out = {
        "generated_at": datetime.datetime.now(KST).strftime("%Y-%m-%d %H:%M:%S"),
        "offices": sorted({d["short_name"] for d in docs}),
        "years": sorted({d["policy_year"] for d in docs if d["policy_year"]}, reverse=True),
        "departments": sorted({d["department"] for d in docs if d["department"]}),
        "document_types": sorted({d["document_type"] for d in docs if d["document_type"]}),
        "categories": sorted({c for d in docs for c in d["policy_category"]}),
        "statuses": sorted({d["classification_status"] for d in docs}),
        "count": len(docs),
        # total은 16으로 박아두면 교육청을 추가할 때마다 '17 / 16곳'처럼 어긋난다.
        "coverage": {"connected": len({s["office"] for s in sources}), "total": total_offices,
                     "boards": len(sources), "active_offices": total_offices,
                     "agency_count": agency_count},
        "office_stats": office_stats,
        "sources": sources,
        "logs": logs,
        "documents": docs,
    }
    os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
    write_json_atomic(DATA_PATH, out, ensure_ascii=False, separators=(",", ":"))
    print(f"\n저장: {DATA_PATH} · 총 {len(docs)}건 (교육청 {len(out['offices'])}곳)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--office")
    a = ap.parse_args()
    run(a.office)
