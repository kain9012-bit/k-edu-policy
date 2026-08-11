# 교육정책 통합검색 · EduPolicy Search

전국 16개 시도교육청이 공개한 **정책계획(기본계획·추진계획·운영계획 등)을 한 곳에서 통합검색**하고,
정보공개포털의 **내부결재 정보목록**과 **지방교육재정 세출예산**을 함께 살펴보는 서비스입니다.

**https://kain9012-bit.github.io/k-edu-policy/**

| | 규모 |
|---|---|
| 공개 계획서 | **2,308건** (수집 문서 3,838건 중) |
| 내부결재 계획 | **55,688건** (2026-01-01 ~) |
| 세출예산 | 17개 교육청 × 2022~2026년 |
| 수집 게시판 | 197개 · 16개 교육청 전부 연결 |

서버 없이 GitHub Pages에서 동작하며, 수집기가 매일 새벽 데이터를 JSON으로 갱신합니다.

> **전남·광주는 전남광주통합특별시교육청으로 통합됐습니다.**
> 그래서 시도교육청은 **16곳**입니다. 다만 옛 전남·광주 홈페이지가 아직 살아 있어
> 수집은 18곳에서 계속합니다(`config/offices.json`의 `merged_into`).
> 지방교육재정알리미 예산 자료는 아직 17개 시도 기준으로 제공됩니다.

## 화면(탭)

1. **홈** — 통합 검색창과 서비스 안내. 검색어를 넣으면 공개 계획서 탭으로 넘어간다.
2. **공개 계획서** — 계획서 **제목**으로 검색. 여러 낱말은 쉼표·띄어쓰기로 나눠 넣고
   `모두 포함 / 하나라도` 토글로 묶는다. 제목에 없지만 분야·첨부·부서로 이어지는 문서는
   아래 **관련 있는 문서**에 접어둔다. 교육청·게시 연도·분야·판별상태 필터, 보관함 담기, 원문 게시글 연결.
3. **내부 결재** — 정보공개포털 정보목록. 문서번호·담당부서 확인, 정보공개청구 안내.
4. **예산 데이터** — 지방교육재정알리미 자료로 항목별 세출예산 순위·연도별 추이 비교.
   항목은 정책사업(상위)과 단위사업(하위)으로 나눠 고른다(`config/budget_items.json`).
5. **수집 출처** — 첫 화면은 **공개 수준 비교**. 교육청별로 홈페이지에 공개한 계획서 수와
   내부결재로만 남은 계획 수를 나란히 놓아 공개율을 보여준다. 그 뒤로 교육청별·게시판별
   수집 현황과 실행 로그를 그대로 공개한다.

UI는 **KRDS(대한민국 디지털 정부 디자인시스템)** 토큰(색상·타이포·모서리)을 따른다.
`src/index.css`에서 KRDS 값을 Tailwind 테마로 정의하고 있어, 색을 바꾸려면 그 파일만 고치면 된다.

> 원본 계획서 파일은 재배포하지 않고, 원칙적으로 해당 교육청 **원문 게시글**로 연결합니다.

## 구조

```
index.html                     Vite 진입점
src/
  App.tsx                      탭 전환·데이터 로딩·보관함 상태
  index.css                    KRDS 토큰 → Tailwind 테마 정의
  components/                  탭별 화면 (Header/HomeTab/PolicyDocumentsTab/
                               InternalInfoTab/BudgetTab/CollectionStatusTab/모달)
  types/                       데이터 타입
legacy/index.html              이전 단일 HTML 버전(참고용 보관)
data/
  documents.json               게시판에서 수집한 계획서
  infolist.json                정보공개포털 내부결재 정보목록 (20MB)
  infolist_raw.json            판별 전 원본(커밋하지 않음)
  budget.json                  세출예산(계층 포함). 지방교육재정알리미는 아직 17개 시도 기준
config/
  offices.json                 교육청 목록·활성화 (17곳)
  boards.json                  손으로 등록한 게시판
  boards_auto.json             자동 발견한 게시판(discover-boards가 갱신)
  classify.json                계획서 판별어/제외어/분야 분류
  budget_items.json            세출예산 정책사업·단위사업 계층
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

React + Vite로 만들어져 있어 첫 실행 때 한 번 설치가 필요하다.

```bash
npm install       # 최초 1회
npm run dev       # http://localhost:3000
```

`data/*.json`은 따로 복사하지 않아도 개발 서버가 저장소의 `data/` 폴더를 그대로 읽어준다.

빌드 결과를 확인하려면:

```bash
npm run build     # dist/ 에 빌드 + data/*.json 복사
npm run preview
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

`config/classify.json`의 포함어(기본계획·추진계획·운영계획·주요업무계획…)와 제외어로 판별하며 띄어쓰기 차이를 허용합니다.
결과는 `정책계획서 · 정책참고자료 · 제외대상 · 확인필요` 중 하나로 저장하고, 애매한 자료는 삭제하지 않고 **확인필요**로 남깁니다.

- `hard_exclude_keywords`는 포함어보다 **먼저** 걸러냅니다. `검정고시 시행계획`·`신규채용 시험 시행계획`처럼
  '시행계획'이 붙었지만 정책계획이 아닌 행정 공고를 막기 위한 것입니다.
- 학교마다 한 건씩 올라오는 제출물(`학교 자체평가 계획서(만호초)`)은 교육청 정책계획이 아니라 제외합니다.
  다만 `자율형 공립고 운영계획서(진천고)` 같은 실제 사업 계획서는 남깁니다.
- **문서 연도는 게시일(생산일) 기준**입니다. 제목의 네 자리 숫자를 쓰면
  `독서·토론·인문학 교육 2030 추진 계획`의 2030(정책 이름)이나
  `2027학년도 수능`의 학년도를 연도로 잘못 잡습니다.

정책 분야는 22개 분류로 키워드 기반 자동 태깅합니다(추후 AI 분류로 대체 가능하도록 모듈 분리).

## 자동화 (GitHub Actions)

| 워크플로 | 주기 | 하는 일 |
|---|---|---|
| `refresh-documents.yml` | **매일 05:00 KST** | 등록된 게시판을 수집해 `data/documents.json` 갱신. 이전 대비 20% 이상 급감하면 실패 처리(파서 깨짐 조기 감지) |
| `discover-boards.yml` | **매주 일요일 04:00 KST** | 교육청 사이트를 다시 훑어 계획이 쌓이는 게시판을 재발견 → `config/boards_auto.json` 갱신. 게시판 신설·조직개편에 자동 대응 |
| `refresh-data.yml` | 매월 | 세출예산 API 수집 |
| `deploy-pages.yml` | 푸시할 때 | 화면 빌드 후 GitHub Pages 배포 |

- 두 워크플로 모두 **수동 실행(workflow_dispatch)** 가능하며, 특정 교육청만 지정할 수 있다.
- 재발견은 **병합 방식**이라 사람이 손댄 설정(`is_active`·`keep_all`·`max_pages` 등)을 보존하고,
  이번에 안 잡힌 게시판은 삭제하지 않고 `missing_since`로 표시만 남긴다(일시적 사이트 오류로 인한 데이터 손실 방지).
- 세출 API 키는 저장소 Secrets에 `EDUINFO_KEY`로 등록.

## 배포

**GitHub Pages** — `Settings → Pages → Source`를 **GitHub Actions**로 설정한다.

`main`에 푸시하면 `deploy-pages.yml`이 알아서 빌드해 올린다. 손으로 npm 명령을 칠 필요는 없다.
빌드 산출물(`dist/`)은 커밋하지 않는다.

수집 데이터가 비어 있으면 배포를 중단하도록 해두었다. 빈 화면이 올라가는 것보다 낫다.

## 로드맵

**1단계 — 게시판 연결(메타데이터 색인)** ✅
- [x] 16개 시도교육청 게시판 수집기 연결 (197개 게시판)
- [x] 세출예산 검색·비교
- [x] 정보공개포털 내부결재 정보목록 수집
- [x] 공개 수준 비교(홈페이지 공개분 vs 내부결재)

**2단계 — 내용 색인**
- [ ] 게시글 본문 추출·저장
- [ ] 첨부파일 본문 추출·색인 → **내용 검색** 지원
  - HWP/HWPX: 별도 추출기 필요(워크스페이스의 hwp 변환 도구 활용)
  - PDF: `parse_plan.py` 방식 재사용
- [ ] 관리자 화면(게시판 등록·확인필요 검토)

> **실시간 조회는 하지 않음** — 검색할 때마다 모든 사이트를 찌르면 부하·지연이 커서, 주기적 스냅샷 방식을 유지한다.
