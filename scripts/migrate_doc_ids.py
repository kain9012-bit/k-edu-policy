#!/usr/bin/env python3
"""문서 식별자에 게시판 ID를 넣는 1회용 변환기.

왜 필요한가:
  예전 키는 md5("교육청:글번호")였다. 글번호는 게시판 단위 카운터라
  한 교육청 안에서도 다른 게시판의 다른 글이 같은 번호를 가질 수 있고,
  그러면 병합 과정에서 흔적 없이 서로 덮어써졌다.
  새 키는 md5("교육청:게시판:글번호")다.

재수집이 필요 없는 이유:
  이미 저장된 문서가 board_id 와 external_post_id 를 모두 들고 있어서,
  파일을 열어 키만 다시 계산하면 된다.

사용법:
  python3 scripts/migrate_doc_ids.py            # 확인만
  python3 scripts/migrate_doc_ids.py --write    # 실제 반영
"""
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from collectors.base_collector import doc_id
from collectors.io_util import write_json_atomic

DATA = os.path.join(os.path.dirname(__file__), "..", "data", "documents.json")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true", help="실제로 파일을 바꾼다")
    a = ap.parse_args()

    path = os.path.abspath(DATA)
    d = json.load(open(path, encoding="utf-8"))
    docs = d["documents"]

    missing = [x for x in docs if not x.get("board_id") or not x.get("external_post_id")]
    if missing:
        sys.exit(f"재료가 없는 문서 {len(missing)}건이 있어 변환할 수 없습니다: "
                 + ", ".join(x.get("id", "?") for x in missing[:5]))

    changed = 0
    seen = {}
    for x in docs:
        new = doc_id(x["office"], x["external_post_id"], x["board_id"])
        if new in seen:
            sys.exit(f"새 키가 겹칩니다: {new}\n  {seen[new]}\n  {x['title'][:40]}")
        seen[new] = x["title"][:40]
        if x["id"] != new:
            changed += 1
        x["id"] = new

    print(f"문서 {len(docs)}건 · 키가 바뀐 문서 {changed}건 · 충돌 0건")
    if not a.write:
        print("확인만 했습니다. 실제로 바꾸려면 --write 를 붙이세요.")
        return

    write_json_atomic(path, d, ensure_ascii=False, separators=(",", ":"))
    print(f"저장 완료: {path}")


if __name__ == "__main__":
    main()
