import React, { useState } from 'react';
import { ActiveTab, DocumentsData } from '../types';
import {
  Search,
  FileText,
  Landmark,
  BarChart3,
  Database,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  HelpCircle,
  Tag,
} from 'lucide-react';

interface HomeTabProps {
  data: DocumentsData;
  onNavigateTab: (tab: ActiveTab, searchQuery?: string) => void;
  onOpenInfoModal: () => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  data,
  onNavigateTab,
  onOpenInfoModal,
}) => {
  const [heroSearchInput, setHeroSearchInput] = useState('');

  // data.count는 수집한 전체 문서 수다. 계획서로 판별된 것만 따로 센다.
  const planCount = (data.office_stats ?? []).reduce((n, o) => n + (o.plan_count ?? 0), 0);
  // 전남·광주가 전남광주로 통합돼 실제 기관은 16곳이다(수집 대상은 옛 홈페이지까지 18곳).
  const agencyCount = data.coverage.agency_count ?? data.coverage.total;

  // 추천 검색어.
  // 예전에는 '중등교육'처럼 분야 이름을 넣었는데, 이 검색은 제목만 보기 때문에
  // 제목에 그 낱말이 그대로 박힌 계획서가 거의 없어 눌러도 몇 건 안 나왔다.
  // 그래서 후보 낱말을 실제 제목에 대고 세어 많이 걸리는 것부터 보여준다.
  const KEYWORD_POOL = [
    '유치원', '특수교육', '안전', '급식', '교원', '연수', '장학', '과학',
    '평가', '자유학기', '교육복지', '체육', '진로', '독서', '상담',
    '학교폭력', '방과후', '인권', '예술', '건강',
  ];

  const quickTopics = React.useMemo(() => {
    const titles = (data.documents ?? [])
      .filter((d) => d.classification_status === '정책계획서')
      .map((d) => d.title.toLowerCase());
    return KEYWORD_POOL
      .map((k) => ({ k, n: titles.filter((t) => t.includes(k.toLowerCase())).length }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 7)
      .map((x) => x.k);
  }, [data.documents]);

  const handleHeroSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigateTab('documents', heroSearchInput.trim());
  };

  const handleTopicClick = (topic: string) => {
    onNavigateTab('documents', topic);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* ===== 1. 검색 영역 ===== */}
      {/* 박스로 가두지 않고 화면 폭을 꽉 채우는 띠로 둔다.
          본문이 max-w-7xl로 가운데 정렬돼 있어 음수 마진만으로는 양옆이 남는다.
          화면 한가운데를 기준으로 화면 폭만큼 늘려 가장자리까지 색을 뺀다.
          (넘치는 부분은 최상위 div의 overflow-x-clip이 잘라낸다) */}
      <section
        className="tab-band relative left-1/2 w-screen -translate-x-1/2 -mt-6
                   px-4 sm:px-6 lg:px-8 py-14 sm:py-20
                   bg-blue-50 border-b border-blue-100"
      >
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="tab-band-title text-4xl sm:text-[3rem] font-bold text-slate-900 leading-tight">
            전국 시도교육청 <span className="text-blue-700">교육정책 통합검색</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            16개 시도교육청의 <strong className="font-bold text-slate-900">공개 계획서</strong> ·
            <strong className="font-bold text-slate-900"> 내부결재 목록</strong> ·
            <strong className="font-bold text-slate-900"> 세출예산</strong>을 한곳에서 찾습니다
          </p>

          {/* 통합 검색창 */}
          <form onSubmit={handleHeroSearchSubmit} className="max-w-2xl mx-auto">
            <label htmlFor="heroSearch" className="sr-only">
              계획 제목 검색
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  className="w-6 h-6 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="heroSearch"
                  type="search"
                  value={heroSearchInput}
                  onChange={(e) => setHeroSearchInput(e.target.value)}
                  placeholder="예: 늘봄, 기초학력, 유아교육, 특수교육"
                  className="w-full h-16 pl-12 pr-4 text-lg text-slate-900 placeholder-slate-400
 bg-white border-2 border-blue-600 rounded-lg outline-none
                             focus:border-blue-700"
                />
              </div>
              <button
                type="submit"
                className="h-16 px-8 sm:px-10 bg-blue-600 hover:bg-blue-700 text-white font-bold
 text-lg rounded-lg transition-colors flex items-center gap-2 shrink-0"
              >
                <span>검색</span>
                <ArrowRight className="w-4 h-4 hidden sm:block" aria-hidden="true" />
              </button>
            </div>
          </form>

          {/* 추천 검색어 */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-base">
            <span className="inline-flex items-center gap-1 text-slate-500 font-medium mr-1">
              <Tag className="w-5 h-5" aria-hidden="true" />
              이렇게 찾아보세요
            </span>
            {quickTopics.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => handleTopicClick(topic)}
                className="px-4 py-2 rounded-md bg-white border border-blue-200 text-slate-700
 hover:bg-blue-600 hover:border-blue-600 hover:text-white
                           transition-colors font-medium"
              >
                {topic}
              </button>
            ))}
          </div>

          {/* 현황 요약 */}
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-blue-200 text-left">
            {[
              {
                // 수집 대상은 18곳이지만 전남·광주는 전남광주로 통합돼 기관은 16곳이다.
                t: '연동 시도교육청',
                v: `${agencyCount} / ${agencyCount}곳`,
                sub: '전국 수집 완료',
                ok: true,
              },
              {
                t: '공개된 계획서',
                v: `${(planCount || data.count).toLocaleString()}건`,
                sub: `수집 문서 ${data.count.toLocaleString()}건 중`,
              },
              {
                t: '수집 게시판',
                v: `${data.coverage.boards}개`,
                sub: '계획·알림 게시판',
              },
              {
                t: '데이터 기준',
                v: '2026년',
                sub: '매일 새벽 자동 수집',
              },
            ].map((s) => (
              <div key={s.t} className="bg-white border border-slate-200 rounded-lg p-5">
                <dt className="text-sm text-slate-500 font-medium">{s.t}</dt>
                <dd className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums mt-1">
                  {s.v}
                </dd>
                <p
                  className={`text-sm mt-1 flex items-center gap-1 ${
                    s.ok ? 'text-emerald-600 font-medium' : 'text-slate-500'
                  }`}
                >
                  {s.ok && <CheckCircle2 className="w-4 h-4" aria-hidden="true" />}
                  {s.sub}
                </p>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ===== 3. 세 가지 데이터 ===== */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900">모아둔 세 가지 데이터</h2>
            <p className="text-sm text-slate-500 mt-1">
              보고 싶은 영역을 골라 시작하세요.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenInfoModal}
            className="text-sm font-bold text-blue-700 hover:underline underline-offset-4
 flex items-center gap-1 self-start sm:self-auto"
          >
            <HelpCircle className="w-4 h-4" aria-hidden="true" />
            자세한 안내 보기
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              Icon: FileText,
              n: '01',
              title: '공개 정책계획서',
              desc: '전국 16개 시도교육청 게시판에서 기본계획·추진계획·운영계획 원문을 수집해 색인합니다.',
              points: [
                '원문 게시글과 첨부파일로 바로 연결',
                '교육청·연도·분야별 상세 필터',
                '제목에 없어도 분야로 이어지는 문서까지',
              ],
              go: 'documents' as ActiveTab,
              cta: '공개 계획서 검색',
            },
            {
              Icon: Landmark,
              n: '02',
              title: '내부결재 정보목록',
              desc: '정보공개포털(open.go.kr)에 등록된 각 교육청 본청 부서의 내부결재 문서 제목과 문서번호를 모았습니다.',
              points: [
                '홈페이지에 없는 계획까지 확인',
                '문서번호 확인 (예: 초등교육과-12097)',
                '정보공개청구에 활용',
              ],
              go: 'infolist' as ActiveTab,
              cta: '내부결재 목록 조회',
            },
            {
              Icon: BarChart3,
              n: '03',
              title: '지방교육재정 세출예산',
              desc: '지방교육재정알리미 자료로 시도교육청의 정책사업별 세출예산 규모를 견줍니다.',
              points: [
                '항목별 교육청 예산 순위',
                '연도별 세출예산 추이',
                '우리 교육청만 강조해 대조',
              ],
              go: 'budget' as ActiveTab,
              cta: '예산 데이터 비교',
            },
          ].map(({ Icon, n, title, desc, points, go, cta }) => (
            <div
              key={n}
              className="bg-white rounded-xl border border-slate-200 p-6 hover:border-blue-600
 transition-colors flex flex-col justify-between gap-5"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-bold text-slate-400 tabular-nums">{n}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
                <ul className="pt-3 border-t border-slate-100 space-y-2 text-sm text-slate-600">
                  {points.map((p) => (
                    <li key={p} className="flex items-start gap-1.5">
                      <CheckCircle2
                        className="w-4 h-4 text-blue-600 shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab(go)}
                className="w-full py-3 px-4 bg-white border border-slate-300 text-slate-700
 hover:bg-blue-600 hover:border-blue-600 hover:text-white
                           font-bold text-sm rounded-md transition-colors
                           flex items-center justify-center gap-2"
              >
                <span>{cta}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ===== 5. 출처 공개 ===== */}
      <section
        className="bg-slate-900 text-white rounded-xl p-6 sm:p-8
 flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="space-y-2 max-w-2xl">
          <span className="inline-flex items-center gap-2 text-sm font-bold text-emerald-400">
            <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            수집 내역 공개
          </span>
          <h3 className="text-lg font-bold text-white">
            어디서 언제 무엇을 가져왔는지 그대로 공개합니다
          </h3>
          <div className="text-sm text-slate-300 leading-relaxed space-y-1">
            <p>게시판의 연동 상태, 수집 주기, 성공·실패 기록과 출처 주소를 가공 없이 공개합니다.</p>
            <p>수집이 밀리거나 실패한 곳도 숨기지 않습니다.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('sources')}
          className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold
 rounded-md transition-colors flex items-center justify-center gap-2
                     shrink-0 self-start md:self-auto"
        >
          <Database className="w-4 h-4" aria-hidden="true" />
          <span>수집 현황·출처 확인</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </section>
    </div>
  );
};
