#!/usr/bin/env python3
"""
지방교육재정알리미 Open API에서 16개 시도교육청 세출예산(기능별·정책사업별)을 수집한다.
- requestType: opbdfnctByPoli
- 인증키는 환경변수 EDUINFO_KEY 로 전달 (코드/저장소에 키를 넣지 않는다)

사용법:
    EDUINFO_KEY=발급키 python3 scripts/collect_budget.py --years 2024 2025 2026
결과:
    data/budget.json  (프런트엔드가 읽는 통합 데이터)
"""
import os, sys, json, time, argparse, urllib.request, urllib.parse
import xml.etree.ElementTree as ET

API = "http://openapi.eduinfo.go.kr/openApi.do"
REQUEST_TYPE = "opbdfnctByPoli"

# 세종특별자치시교육청은 원 요구사항상 16개 대상에서 제외 관리(필요시 아래에서 조정)
EXCLUDE_REGIONS = set()  # 예: {"세종"}


def fetch_year(key: str, year: int):
    params = urllib.parse.urlencode({
        "key": key, "Type": "xml", "pIndex": 1, "pSize": 1000,
        "YMQ": str(year), "requestType": REQUEST_TYPE,
    })
    url = f"{API}?{params}"
    with urllib.request.urlopen(url, timeout=30) as r:
        raw = r.read().decode("utf-8")
    root = ET.fromstring(raw)
    code = root.findtext("./RESULT/CODE")
    if code and code != "INFO":
        msg = root.findtext("./RESULT/MESSAGE")
        raise RuntimeError(f"{year} API 오류: {code} / {msg}")
    rows = []
    for row in root.findall("row"):
        region = row.findtext("ITEM_CD1")
        item = row.findtext("ITEM_CD2")
        amt = row.findtext("AMT")
        if region in EXCLUDE_REGIONS:
            continue
        rows.append({
            "year": int(row.findtext("YMQ")),
            "region": region,
            "region_code": row.findtext("ITEM_CD1_SEQ"),
            "item": item,
            "amount": int(amt) if amt and amt.isdigit() else 0,
            "is_total": item == "세출예산액",
            "is_sub": "_" in (item or ""),
        })
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--years", nargs="+", type=int, default=[2024, 2025, 2026])
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "data", "budget.json"))
    args = ap.parse_args()

    key = os.environ.get("EDUINFO_KEY")
    if not key:
        sys.exit("환경변수 EDUINFO_KEY 가 필요합니다. 예) EDUINFO_KEY=발급키 python3 scripts/collect_budget.py")

    all_rows, meta_years = [], []
    for y in args.years:
        try:
            rows = fetch_year(key, y)
        except Exception as e:
            print(f"  [skip] {y}: {e}")
            continue
        if rows:
            all_rows.extend(rows)
            meta_years.append(y)
            print(f"  [ok] {y}: {len(rows)}건")
        time.sleep(0.3)

    out = {
        "source": "지방교육재정알리미 Open API (opbdfnctByPoli)",
        "license": "공공누리 출처표시",
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "years": sorted(set(meta_years)),
        "regions": sorted({r["region"] for r in all_rows}),
        "policy_items": sorted({r["item"] for r in all_rows if not r["is_sub"] and not r["is_total"]}),
        "rows": all_rows,
    }
    out_path = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"저장: {out_path}  (총 {len(all_rows)}행, 연도 {out['years']})")


if __name__ == "__main__":
    main()
