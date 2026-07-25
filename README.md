# K-교육청 정책서랍

16개 시도교육청이 공개한 **정책계획(기본계획·추진계획·운영계획 등)을 한 곳에서 통합검색**하고,
각 교육청 **세출예산**과 전북 **주요업무계획**을 함께 살펴보는 정적 웹서비스입니다.
서버 없이 GitHub Pages에서 동작하며, 데이터는 수집기가 주기적으로 JSON으로 갱신합니다.

## 화면(탭)

1. **📚 정책계획 통합검색** — 각 교육청 계획 게시판에서 수집한 계획서를 검색. 교육청·연도·부서·유형·분야·판별상태 필터, 제목/첨부파일명 검색, 원문 게시글로 연결.
2. **📋 전북 주요업무계획** — 전북 계획서(PDF)를 세부사업·추진과제 단위로 파싱한 상세 검색.
3. **💰 세출예산 비교** — 지방교육재정알리미 API 기반 정책사업별 세출 검색·지역비교.

> 원본 계획서 파일은 재배포하지 않고, 원칙적으로 해당 교육청 **원문 게시글**로 연결합니다.

## 구조

```
index.html                     3탭 통합 UI (정적)
data/
  documents.json               수집된 정책계획 문서 (통합검색용)
  plans.json                   전북 주요업무계획 상세(사업·과제)
  budget.json                  16개 교육청 세출예산
config/
  offices.json                 교육청 목록·활성화
  boards.json                  교육청별 수집 게시판·수집기 설정
  classify.json                계획서 판별어/제외어/분야 분류(설정으로 관리)
collectors/
  base_collector.py            공통 엔진(HTTP·판별·분류·표준화)
  jbe_collector.py             전북(유형 A: 계획서 전용 게시판)
  goe_collector.py             경기(유형 B: 정책집중 게시판)
scripts/
  collect_documents.py         계획 게시판 통합수집 오케스트레이터
  collect_budget.py            세출예산 API 수집
  parse_plan.py                주요업무계획 PDF 파서
.github/workflows/             매일 자동 수집(문서/예산)
```

## 로컬 실행

```bash
python3 -m http.server 8000     # http://localhost:8000
```

## 데이터 수집

```bash
pip install -r requirements.txt

# 정책계획 게시판 수집(활성 교육청 전체) — 첨부파일명 포함
python3 scripts/collect_documents.py
# 특정 교육청만
python3 scripts/collect_documents.py --office gyeonggi
# 빠른 목록만(첨부 생략)
SKIP_DETAIL=1 python3 scripts/collect_documents.py

# 세출예산(인증키 필요)
EDUINFO_KEY=발급키 python3 scripts/collect_budget.py --years 2022 2023 2024 2025 2026
```

## 새 교육청 추가하는 법

크롤러를 새로 짜지 않고 **설정으로 확장**합니다.

1. `config/offices.json`에서 해당 교육청 `is_active: true`.
2. `config/boards.json`에 게시판 등록: `collector_type`(jbe·goe·generic 등), `board_type`(계획서전용·정책집중·분산형), `list_url`, `page_param` 등.
3. 게시판 구조가 전북/경기와 다르면 `collectors/`에 해당 유형 수집기를 추가(공통 엔진 재사용).
4. `config/classify.json`에서 포함어/제외어/분야 키워드를 조정.

## 게시판 유형

- **유형 A 계획서 전용**(전북): 게시판 전체 수집, 판별 최소화.
- **유형 B 정책집중**(경기): 제목·첨부파일명으로 계획서/참고자료 판별.
- **유형 C 분산형**: 여러 게시판을 등록해 제목·첨부명으로 판별(확장 예정).

## 계획서 자동 판별·분류

`config/classify.json`의 포함어(기본계획·추진계획·운영계획…)와 제외어(행사·입찰·채용·감사…)로 판별하며 띄어쓰기 차이를 허용합니다.
결과는 `정책계획서 · 정책참고자료 · 제외대상 · 확인필요` 중 하나로 저장하고, 애매한 자료는 삭제하지 않고 **확인필요**로 남깁니다.
정책 분야는 22개 분류로 키워드 기반 자동 태깅(추후 AI 분류로 대체 가능하도록 모듈 분리).

## 배포

- 프런트엔드: **GitHub Pages** (Settings → Pages → `main`/root)
- 자동 수집: **GitHub Actions** (`refresh-documents.yml` 매일, `refresh-budget.yml` 매월)
- 세출 API 키는 저장소 Secrets에 `EDUINFO_KEY`로 등록

## 로드맵

- [x] 정책계획 통합검색(전북·경기)
- [x] 세출예산 검색·비교(16개 교육청)
- [ ] 나머지 14개 교육청 게시판 수집기 추가
- [ ] 첨부파일(HWP/PDF) 본문 추출 검색
- [ ] 관리자 화면(게시판 등록·확인필요 검토)
