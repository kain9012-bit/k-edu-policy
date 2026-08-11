import React, { useState, useMemo, useEffect } from 'react';
import { DocumentsData, PolicyDocument, DocumentClassificationStatus } from '../types';
import { sortOffices, officeLabel } from '../lib/offices';
import {
  Search,
  Filter,
  ExternalLink,
  FileText,
  Lock,
  Download,
  RotateCcw,
  Tag,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  Share2,
  Check,
  AlertCircle
} from 'lucide-react';

interface PolicyDocumentsTabProps {
  data: DocumentsData;
  initialSearchTerm?: string;
}

export const PolicyDocumentsTab: React.FC<PolicyDocumentsTabProps> = ({
  data,
  initialSearchTerm = '',
}) => {
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [selectedOffice, setSelectedOffice] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  // Specification requirement: "화면 기본값은 정책계획서만 표시한다"
  const [selectedStatus, setSelectedStatus] = useState<DocumentClassificationStatus | 'ALL'>('정책계획서');

  // Active detail modal doc
  const [activeDetailDoc, setActiveDetailDoc] = useState<PolicyDocument | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // 여러 낱말을 넣었을 때 모두 담긴 제목만 볼지, 하나라도 담기면 볼지
  const [matchMode, setMatchMode] = useState<'all' | 'any'>('all');


  // 쉼표나 띄어쓰기로 나눠 여러 낱말로 받는다. 빈 조각은 버린다.
  const keywords = useMemo(
    () => searchTerm.split(/[,\s]+/).map((k) => k.trim().toLowerCase()).filter(Boolean),
    [searchTerm]
  );

  /** 제목이 검색 조건에 맞는지 */
  const titleMatches = React.useCallback(
    (title: string) => {
      if (keywords.length === 0) return true;
      const t = title.toLowerCase();
      return matchMode === 'all'
        ? keywords.every((k) => t.includes(k))
        : keywords.some((k) => t.includes(k));
    },
    [keywords, matchMode]
  );

  // Filtering logic
  // 한 번에 그리는 개수. 3,800건을 통째로 그리면 브라우저가 멈춘다.
  const PAGE = 30;
  const [visibleCount, setVisibleCount] = useState(PAGE);

  const filteredDocuments = useMemo(() => {
    return data.documents.filter((doc) => {
      // Classification status filter
      if (selectedStatus !== 'ALL' && doc.classification_status !== selectedStatus) {
        return false;
      }

      // 검색은 제목만 본다.
      // 부서·게시판·첨부·분야까지 훑으면 '늘봄'을 찾았는데 제목에 늘봄이 없는
      // '방과후 이중언어교육 지원 계획'이 섞여 나와서 결과를 신뢰하기 어렵다.
      // 분야로 묶인 문서는 아래 '관련 있는 문서'에서 따로 본다.
      if (!titleMatches(doc.title)) return false;

      // Office filter
      if (selectedOffice !== 'ALL' && doc.short_name !== selectedOffice && doc.office !== selectedOffice) {
        return false;
      }

      // Year filter
      if (selectedYear !== 'ALL' && doc.policy_year !== Number(selectedYear)) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'ALL' && !doc.policy_category?.includes(selectedCategory)) {
        return false;
      }

      return true;
    });
  }, [
    data.documents,
    titleMatches,
    selectedOffice,
    selectedYear,
    selectedCategory,
    selectedStatus,
  ]);

  // 조건이 바뀌면 목록을 처음부터 다시 보여준다
  useEffect(() => { setVisibleCount(PAGE); }, [
    data.documents,
    searchTerm,
    matchMode,
    selectedOffice,
    selectedYear,
    selectedCategory,
    selectedStatus,
  ]);

  const visibleDocuments = filteredDocuments.slice(0, visibleCount);

  // 제목에는 없지만 분야·첨부·부서로 이어지는 문서.
  // 검색 결과 건수를 흐리지 않도록 본 목록과 분리해서 접어둔다.
  const RELATED_PAGE = 20;
  const [showRelated, setShowRelated] = useState(false);
  const [relatedCount, setRelatedCount] = useState(RELATED_PAGE);

  const relatedDocuments = useMemo(() => {
    if (keywords.length === 0) return [];
    return data.documents
      .filter((doc) => {
        if (titleMatches(doc.title)) return false;   // 본 목록에 이미 있다
        // 검색어를 뺀 나머지 조건은 본 목록과 똑같이 적용한다
        if (selectedStatus !== 'ALL' && doc.classification_status !== selectedStatus) return false;
        if (selectedOffice !== 'ALL' && doc.short_name !== selectedOffice && doc.office !== selectedOffice) return false;
        if (selectedYear !== 'ALL' && doc.policy_year !== Number(selectedYear)) return false;
        if (selectedCategory !== 'ALL' && !doc.policy_category?.includes(selectedCategory)) return false;
        // 낱말 중 하나라도 분야·첨부·부서·게시판에 걸리면 관련 문서로 본다
        const hay = [
          ...(doc.policy_category ?? []),
          ...(doc.attachment_names ?? []),
          doc.department ?? '',
          doc.board_name,
        ].join(' ').toLowerCase();
        return keywords.some((k) => hay.includes(k));
      })
      .sort((a, b) => (b.published_date || '').localeCompare(a.published_date || ''));
  }, [data.documents, keywords, titleMatches, selectedStatus, selectedOffice, selectedYear, selectedCategory]);

  useEffect(() => {
    setShowRelated(false);
    setRelatedCount(RELATED_PAGE);
  }, [searchTerm]);

  /** 이 문서가 왜 관련 목록에 들어왔는지 */
  const matchReasons = (doc: PolicyDocument): string[] => {
    const why: string[] = [];
    const cat = doc.policy_category?.find((c) => keywords.some((k) => c.toLowerCase().includes(k)));
    if (cat) why.push(`분야: ${cat}`);
    if (doc.attachment_names?.some((a) => keywords.some((k) => a.toLowerCase().includes(k)))) why.push('첨부파일명');
    if (doc.department && keywords.some((k) => doc.department!.toLowerCase().includes(k))) why.push(`부서: ${doc.department}`);
    if (!why.length && keywords.some((k) => doc.board_name.toLowerCase().includes(k))) why.push(`게시판: ${doc.board_name}`);
    return why;
  };


  // 주요 주제는 손으로 적지 않고 실제 문서에서 뽑는다.
  // 예전에는 '고교학점제'처럼 분류 체계에 없는 이름이 섞여 눌러도 0건이었다.
  const quickTopics = React.useMemo(() => {
    const n = new Map<string, number>();
    for (const doc of data.documents) {
      if (doc.classification_status !== '정책계획서') continue;
      for (const cat of doc.policy_category ?? []) {
        if (cat === '기타') continue;      // 분류가 안 된 것을 모아둔 칸이라 주제가 아니다
        n.set(cat, (n.get(cat) ?? 0) + 1);
      }
    }
    // 한 줄에 들어가는 만큼만 둔다(9개). 늘리면 줄바꿈이 생긴다.
    return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, 9);
  }, [data.documents]);

  // 교육청은 가나다순이 아니라 행정구역 순서로 늘어놓는다.
  const officeOptions = React.useMemo(() => sortOffices<string>(data.offices, (o) => o), [data.offices]);

  // 소제목 아래에 적는 건수. 화면 기본값과 같게 정책계획서만 센다.
  const planCount = React.useMemo(
    () => data.documents.filter((d) => d.classification_status === '정책계획서').length,
    [data.documents]
  );

  // '기타'는 분류가 안 된 것을 모아두는 칸이라 목록 맨 끝에 둔다.
  const categoryOptions = React.useMemo(
    () => [...data.categories].sort((a, b) =>
      a === '기타' ? 1 : b === '기타' ? -1 : a.localeCompare(b, 'ko')
    ),
    [data.categories]
  );


  // 연도 목록은 config가 아니라 실제 문서에서 만든다.
  // 연도만 빼고 나머지 조건을 적용해 센 값이라, 지금 조건에서 몇 건인지 그대로 보인다.
  const yearOptions = React.useMemo(() => {
    const n = new Map<number, number>();
    for (const doc of data.documents) {
      if (selectedStatus !== 'ALL' && doc.classification_status !== selectedStatus) continue;
      if (selectedOffice !== 'ALL' && doc.short_name !== selectedOffice && doc.office !== selectedOffice) continue;
      if (selectedCategory !== 'ALL' && !doc.policy_category?.includes(selectedCategory)) continue;
      if (!titleMatches(doc.title)) continue;
      if (!doc.policy_year) continue;
      n.set(doc.policy_year, (n.get(doc.policy_year) ?? 0) + 1);
    }
    return [...n.entries()].sort((a, b) => b[0] - a[0]).map(([year, count]) => ({ year, count }));
  }, [data.documents, selectedStatus, selectedOffice, selectedCategory, titleMatches]);

  // 고른 연도에 문서가 없으면(예: 조건을 좁혔을 때) 전체 연도로 되돌린다.
  useEffect(() => {
    if (selectedYear === 'ALL') return;
    if (!yearOptions.some((o) => String(o.year) === selectedYear)) setSelectedYear('ALL');
  }, [yearOptions, selectedYear]);


  const resetFilters = () => {
    setSearchTerm('');
    setSelectedOffice('ALL');
    setSelectedYear(String(new Date().getFullYear()));
    setSelectedCategory('ALL');
    setSelectedStatus('정책계획서');
  };

  const handleCopySummary = (doc: PolicyDocument) => {
    const text = `[교육청 정책계획서]
제목: ${doc.title}
교육청: ${doc.short_name}교육청 (${doc.department || '담당부서 미기재'})
발행일: ${doc.published_date || '미상'} (연도: ${doc.policy_year})
구분: ${doc.document_type || '기본계획'} / ${doc.policy_category.join(', ')}
원문 게시글: ${doc.post_url}`;

    navigator.clipboard.writeText(text);
    setCopiedId(doc.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 조건 고르는 영역. 홈의 검색 띠와 같은 방식으로 화면 폭을 채워
          아래 결과 목록과 경계로 구분한다. */}
      <section
        className="relative left-1/2 w-screen -translate-x-1/2 -mt-6 py-6
                   bg-blue-50 border-b border-blue-100"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        {/* 탭 소제목 — 세 탭이 같은 크기·굵기를 쓴다 */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-4xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="w-8 h-8 text-blue-600 shrink-0" aria-hidden="true" />
            공개 계획서
          </h2>
          <p className="text-sm text-slate-500">
            16개 시도교육청 누리집에서 모은 계획서 {planCount.toLocaleString()}건
          </p>
        </div>

        {/* Search Input Bar - Design Theme Clean Pill Input */}
        <div className="max-w-3xl w-full">
          <label htmlFor="docSearch" className="sr-only">
            계획서 제목 검색
          </label>

          <div className="flex flex-col sm:flex-row gap-2">
            {/* 여러 낱말을 어떻게 묶을지. 낱말이 하나여도 늘 보이게 두어
                지금 어떤 방식으로 찾는지 알 수 있게 한다. */}
            <div
              role="group"
              aria-label="여러 낱말 검색 방식"
              className="inline-flex h-12 shrink-0 rounded-md border border-slate-300 overflow-hidden text-sm"
            >
              {([
                ['all', '모두 포함', '넣은 낱말이 제목에 다 들어간 계획서만 찾습니다'],
                ['any', '하나라도', '넣은 낱말 중 하나만 들어가도 찾습니다'],
              ] as const).map(([mode, label, hint]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setMatchMode(mode)}
                  aria-pressed={matchMode === mode}
                  title={hint}
                  className={`px-3.5 font-bold whitespace-nowrap transition-colors ${
                    matchMode === mode
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-5 h-5" aria-hidden="true" />
              </span>
              <input
                id="docSearch"
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="계획서 제목 검색 · 여러 낱말은 쉼표나 띄어쓰기로 (예: 늘봄, 방과후)"
                className="w-full h-12 pl-11 pr-20 bg-white text-slate-900 placeholder-slate-400
                           text-base rounded-md border border-slate-300
                           focus:border-blue-600 outline-none transition-colors"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-3 flex items-center text-sm text-slate-500 hover:text-slate-900 font-medium"
                >
                  지우기
                </button>
              )}
            </div>
          </div>

          {keywords.length > 1 && (
            <p className="mt-2 text-xs text-slate-500">
              {matchMode === 'all'
                ? `‘${keywords.join('’, ‘')}’ 를 제목에 모두 담은 계획서를 찾습니다.`
                : `‘${keywords.join('’, ‘')}’ 중 하나라도 제목에 담은 계획서를 찾습니다.`}
            </p>
          )}
        </div>

        {/* Quick Topic Chips */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs pt-1 justify-start">
          <span className="text-slate-400 font-bold text-[11px] flex items-center gap-1 shrink-0 mr-1">
            <Tag className="w-3.5 h-3.5 text-blue-600" />
            주요 주제:
          </span>
          {quickTopics.map(([topic, count]) => {
            const isActive = selectedCategory === topic;
            return (
              <button
                key={topic}
                type="button"
                onClick={() => {
                  setSelectedCategory(isActive ? 'ALL' : topic);
                  setSearchTerm('');
                }}
                aria-pressed={isActive}
                className={`px-3 py-1.5 rounded-md transition-colors font-bold text-sm border ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white hover:bg-blue-50 text-slate-700 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                {topic}
                <span className={`ml-1 font-medium tabular-nums ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                  {count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>

        {/* Detailed Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Office Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-slate-400" /> 교육청
            </label>
            <select
              value={selectedOffice}
              onChange={(e) => setSelectedOffice(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 font-medium text-slate-800 focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">전체 교육청 ({data.offices.length}개)</option>
              {officeOptions.map((off) => (
                <option key={off} value={off}>
                  {officeLabel(off)}교육청
                </option>
              ))}
            </select>
          </div>

          {/* Classification Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-400" /> 판별 상태
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as DocumentClassificationStatus | 'ALL')}
              className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 font-medium text-slate-800 focus:ring-1 focus:ring-blue-500"
            >
              <option value="정책계획서">정책계획서 (기본)</option>
              <option value="정책참고자료">정책참고자료</option>
              <option value="제외대상">제외대상 (입찰·공고 등)</option>
              <option value="확인필요">확인필요</option>
              <option value="ALL">전체 상태 보기</option>
            </select>
          </div>

          {/* Year Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" /> 게시 연도
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 font-medium text-slate-800 focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">전체 연도</option>
              {yearOptions.map(({ year, count }) => (
                <option key={year} value={year}>
                  {year}년 ({count.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3 text-slate-400" /> 정책 분야
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 font-medium text-slate-800 focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">전체 분야</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Button */}
          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="w-full text-xs bg-white hover:bg-slate-100 text-slate-700 font-semibold py-2 px-3 rounded-md border border-slate-300 transition flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              필터 초기화
            </button>
          </div>
        </div>
        </div>
      </section>

      {/* Results Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-slate-700 text-xs font-medium">
        <div className="flex items-center gap-2">
          <span>
            검색 결과 <strong className="text-blue-600 text-sm font-bold">{filteredDocuments.length}</strong>건
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500">
            상태: <span className="font-semibold text-slate-800">{selectedStatus}</span>
          </span>
        </div>

      </div>

      {/* Document List View */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-base font-bold text-slate-800">검색 조건에 맞는 정책문서가 없습니다</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            검색어나 필터를 조정하거나, 판별 상태를 '전체 상태 보기'로 변경하여 검색해보세요.
          </p>
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs rounded-xl transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            전체 필터 초기화
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {visibleDocuments.map((doc) => {
            return (
              <div
                key={doc.id}
                className="group bg-white p-5 rounded-lg border border-slate-200 hover:border-blue-600 transition-colors flex flex-col md:flex-row md:items-start justify-between gap-4"
              >
                {/* Main Doc Info */}
                <div className="space-y-2.5 flex-1">
                  {/* Metadata Header Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Classification Status Badge */}
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                        doc.classification_status === '정책계획서'
                          ? 'bg-blue-100 text-blue-700'
                          : doc.classification_status === '정책참고자료'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {doc.classification_status}
                    </span>

                    <span className="px-2 py-0.5 rounded font-bold text-xs bg-slate-100 text-slate-700 border border-slate-200">
                      {doc.short_name}교육청
                    </span>

                    <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80">
                      {doc.board_name}
                    </span>

                    {/* Policy Year Badge */}
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
                      {doc.policy_year}년도
                    </span>

                    {/* Login Required Badge */}
                    {doc.login_required && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> 로그인 필요
                      </span>
                    )}
                  </div>

                  {/* Document Title */}
                  <h3
                    onClick={() => setActiveDetailDoc(doc)}
                    className="text-base font-bold text-slate-900 group-hover:text-blue-600 cursor-pointer transition-colors leading-snug"
                  >
                    {doc.title}
                  </h3>

                  {/* Category Pills & Info */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
                    {doc.department && (
                      <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                        <div className="w-4 h-4 bg-slate-100 rounded flex items-center justify-center font-bold text-[9px] text-slate-600 uppercase">
                          Of
                        </div>
                        <span>{doc.department}</span>
                      </div>
                    )}
                    {doc.published_date && (
                      <div className="flex items-center gap-1 text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{doc.published_date}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      {doc.policy_category.map((cat) => (
                        <span key={cat} className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[11px] font-semibold">
                          #{cat}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Attachment List Preview */}
                  {doc.attachments && doc.attachments.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap pt-1 text-xs text-slate-600">
                      <span className="text-slate-400 font-semibold flex items-center gap-1 text-[11px]">
                        <Download className="w-3 h-3 text-slate-400" /> 첨부:
                      </span>
                      {doc.attachments.map((att, idx) => (
                        <a
                          key={idx}
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition font-medium"
                          title="원본 게시글에서 다운로드"
                        >
                          <FileText className="w-3 h-3 text-blue-600" />
                          <span className="max-w-[200px] truncate">{att.name}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right CTA Actions */}
                <div className="flex md:flex-col items-center justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  {/* Primary CTA: Open Original URL */}
                  <a
                    href={doc.post_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors shadow-xs w-full md:w-auto"
                  >
                    <span>원문 게시글</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <div className="flex items-center gap-1.5 w-full md:w-auto">

                    {/* Copy Summary */}
                    <button
                      onClick={() => handleCopySummary(doc)}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center justify-center gap-1"
                      title="계획서 정보 및 원문링크 복사"
                    >
                      {copiedId === doc.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* 더 보기 — 한 번에 다 그리면 브라우저가 멈춘다 */}
          {visibleCount < filteredDocuments.length && (
            <div className="pt-2 flex flex-col items-center gap-2">
              <p className="text-sm text-slate-500">
                {filteredDocuments.length.toLocaleString()}건 중{' '}
                <strong className="font-bold text-slate-900 tabular-nums">
                  {visibleDocuments.length.toLocaleString()}
                </strong>
                건 표시
              </p>
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + PAGE)}
                className="px-6 py-3 rounded-md border border-slate-300 bg-white text-slate-700
                           font-bold text-sm hover:border-blue-600 hover:text-blue-700 hover:bg-blue-50
                           transition-colors"
              >
                {PAGE}건 더 보기
              </button>
            </div>
          )}
        </div>
      )}

      {/* 제목에는 없지만 관련 있는 문서 */}
      {searchTerm.trim() !== '' && relatedDocuments.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowRelated((v) => !v)}
            aria-expanded={showRelated}
            className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left
                       hover:bg-slate-50 transition-colors"
          >
            <span className="text-sm text-slate-700">
              제목에는 없지만 관련 있는 문서{' '}
              <strong className="font-bold text-slate-900 tabular-nums">
                {relatedDocuments.length.toLocaleString()}
              </strong>
              건
              <span className="block text-xs text-slate-500 mt-0.5">
                분야·첨부파일명·담당부서가 '{searchTerm.trim()}'과 이어지는 계획서입니다.
              </span>
            </span>
            <ChevronRight
              className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${showRelated ? 'rotate-90' : ''}`}
              aria-hidden="true"
            />
          </button>

          {showRelated && (
            <div className="border-t border-slate-200 divide-y divide-slate-100">
              {relatedDocuments.slice(0, relatedCount).map((doc) => (
                <div key={doc.id} className="px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1.5">
                      <a
                        href={doc.post_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-sm font-bold text-slate-900 hover:text-blue-700 hover:underline"
                      >
                        {doc.title}
                      </a>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                          {doc.short_name}
                        </span>
                        {matchReasons(doc).map((r) => (
                          <span key={r} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                            {r}
                          </span>
                        ))}
                        <span className="text-slate-400 tabular-nums">{doc.published_date || '날짜 미상'}</span>
                      </div>
                    </div>
                    <a
                      href={doc.post_url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-300
                                 text-xs font-bold text-slate-700 hover:border-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      원문
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              ))}

              {relatedCount < relatedDocuments.length && (
                <div className="p-4 flex justify-center bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setRelatedCount((n) => n + RELATED_PAGE)}
                    className="px-5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-700
                               text-sm font-bold hover:border-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    {RELATED_PAGE}건 더 보기
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {activeDetailDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-200">
                    {activeDetailDoc.short_name}교육청
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {activeDetailDoc.board_name} ({activeDetailDoc.board_type})
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">{activeDetailDoc.title}</h2>
              </div>
              <button
                onClick={() => setActiveDetailDoc(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">담당 부서</span>
                <span className="font-medium text-slate-800">{activeDetailDoc.department || '미지정'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">게시일자</span>
                <span className="font-medium text-slate-800">
                  {activeDetailDoc.published_date || '미상'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">게시 연도 및 문서유형</span>
                <span className="font-medium text-slate-800">
                  {activeDetailDoc.policy_year}년도 / {activeDetailDoc.document_type || '미분류'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">판별 상태</span>
                <span className="font-semibold text-emerald-700">{activeDetailDoc.classification_status}</span>
              </div>
            </div>

            {/* Category Tags */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 mb-1">연관 정책 카테고리</h4>
              <div className="flex items-center gap-1.5 flex-wrap">
                {activeDetailDoc.policy_category.map((c) => (
                  <span key={c} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200">
                    #{c}
                  </span>
                ))}
              </div>
            </div>

            {/* Guidance Note */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> 저작권 및 원문 보존 안내
              </div>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                본 서비스는 각 시도교육청이 공공 게시판에 공개한 원문 URL을 안내합니다. 원본 문서의 정본은 항상
                해당 교육청 홈페이지의 게시글입니다.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => handleCopySummary(activeDetailDoc)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                문서 요약 복사
              </button>
              <a
                href={activeDetailDoc.post_url}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <span>교육청 원문 게시글로 이동</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
