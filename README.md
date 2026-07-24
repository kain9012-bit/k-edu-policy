# K-교육청 정책서랍

전국 시도교육청의 **세출예산(교육비특별회계)을 정책사업별로 검색·비교**하는 정적 웹사이트입니다.
[K-지방직 정책서랍](https://klocal.solvonluchs.com/)의 교육청 버전으로, GitHub Pages에서 무료로 동작합니다.

## 특징

- 서버 없이 동작하는 **정적 사이트** (데이터는 `data/budget.json`으로 사전 수집)
- 회계연도 · 정책사업 · 교육청 필터, 지역별 비교 차트, 사업명 검색
- 데이터 출처: **지방교육재정알리미 Open API** (`requestType=opbdfnctByPoli`)
- 이용허락: 공공누리 출처표시 (비상업·상업 이용 가능)

## 구조

```
index.html               검색·비교 UI (단일 파일, 정적)
data/budget.json         수집된 세출 데이터 (프런트가 읽음)
scripts/collect_budget.py  API 수집 스크립트
docs/                    기획서·PoC 결과·원자료(계획서 PDF 등)
.github/workflows/       데이터 자동 갱신 워크플로
```

## 로컬 실행

`fetch`로 JSON을 읽기 때문에 `file://`이 아니라 **로컬 서버**로 열어야 합니다.

```bash
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000 접속
```

## 데이터 갱신

지방교육재정알리미에서 발급받은 인증키를 환경변수로 넘겨 실행합니다. (키는 저장소에 커밋하지 마세요.)

```bash
EDUINFO_KEY=발급키 python3 scripts/collect_budget.py --years 2022 2023 2024 2025 2026
```

- 세출예산은 연 1회(+추경) 갱신되므로 자주 돌릴 필요는 없습니다.
- GitHub Actions로 자동 갱신하려면 저장소 Secrets에 `EDUINFO_KEY`를 등록하세요
  (`.github/workflows/refresh-data.yml` 참고).

## GitHub Pages 배포

1. 이 폴더를 GitHub 저장소로 push
2. 저장소 **Settings → Pages → Source: `main` 브랜치 / `/ (root)`** 선택
3. 몇 분 뒤 `https://<사용자>.github.io/<저장소>/` 에서 접속

## 로드맵

- [x] 세출예산 검색·비교 (MVP)
- [ ] 주요업무계획(사업) 병합 — 사업명·부서 기준 느슨한 결합
- [ ] 1인당 예산 등 파생지표 (교육통계 연계)
- [ ] 연도별 추이 뷰

## 데이터 주의

`세출예산액`은 교육청 총 세출, `유아및초중등교육`은 기능 대분류이며 그 하위가 정책사업 그룹입니다.
합계 계산 시 대분류·총계 항목의 중복 합산에 유의하세요.
