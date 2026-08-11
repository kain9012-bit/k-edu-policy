import React, { useState, useMemo, useEffect } from 'react';
import { DocumentsData, PolicyDocument, DocumentClassificationStatus } from '../types';
import {
  Search,
  Filter,
  ExternalLink,
  FileText,
  Lock,
  Download,
  Bookmark,
  BookmarkCheck,
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
  savedDocIds: string[];
  onToggleSave: (doc: PolicyDocument) => void;
  initialSearchTerm?: string;
}

export const PolicyDocumentsTab: React.FC<PolicyDocumentsTabProps> = ({
  data,
  savedDocIds,
  onToggleSave,
  initialSearchTerm = '',
}) => {
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [selectedOffice, setSelectedOffice] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  // Specification requirement: "화면 기본값은 정책계획서만 표시한다"
  const [selectedStatus, setSelectedStatus] = useState<DocumentClassificationStatus | 'ALL'>('정책계획서');
  const [loginRequiredFilter, setLoginRequiredFilter] = useState<'ALL' | 'PUBLIC' | 'LOGIN'>('ALL');

  // Active detail modal doc
  const [activeDetailDoc, setActiveDetailDoc] = useState<PolicyDocument | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Recommended quick topics
  const quickTopics = [
    '늘봄·방과후',
    '기초학력',
    'AI·디지털교육',
    '고교학점제',
    '교육복지',
    '급식·보건',
    '교원정책',
    '특수교육',
    '유보통합',
    '학교안전'
  ];

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

      // Keyword search (title, department, board_name, attachment_names)
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase().trim();
        const titleMatch = doc.title.toLowerCase().includes(query);
        const deptMatch = doc.department?.toLowerCase().includes(query);
        const boardMatch = doc.board_name.toLowerCase().includes(query);
        const attachMatch = doc.attachment_names?.some((name) => name.toLowerCase().includes(query));
        const categoryMatch = doc.policy_category?.some((cat) => cat.toLowerCase().includes(query));

        if (!titleMatch && !deptMatch && !boardMatch && !attachMatch && !categoryMatch) {
          return false;
        }
      }

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

      // Login required filter
      if (loginRequiredFilter === 'PUBLIC' && doc.login_required) return false;
      if (loginRequiredFilter === 'LOGIN' && !doc.login_required) return false;

      return true;
    });
  }, [
    data.documents,
    searchTerm,
    selectedOffice,
    selectedYear,
    selectedCategory,
    selectedStatus,
    loginRequiredFilter,
  ]);

  // 조건이 바뀌면 목록을 처음부터 다시 보여준다
  useEffect(() => { setVisibleCount(PAGE); }, [
    data.documents,
    searchTerm,
    selectedOffice,
    selectedYear,
    selectedCategory,
    selectedStatus,
    loginRequiredFilter,
  ]);

  const visibleDocuments = filteredDocuments.slice(0, visibleCount);

  // 연도 목록은 config가 아니라 실제 문서에서 만든다.
  // 연도만 빼고 나머지 조건을 적용해 센 값이라, 지금 조건에서 몇 건인지 그대로 보인다.
  const yearOptions = React.useMemo(() => {
    const n = new Map<number, number>();
    for (const doc of data.documents) {
      if (selectedStatus !== 'ALL' && doc.classification_status !== selectedStatus) continue;
      if (selectedOffice !== 'ALL' && doc.short_name !== selectedOffice && doc.office !== selectedOffice) continue;
      if (selectedCategory !== 'ALL' && !doc.policy_category?.includes(selectedCategory)) continue;
      if (loginRequiredFilter === 'PUBLIC' && doc.login_required) continue;
      if (loginRequiredFilter === 'LOGIN' && !doc.login_required) continue;
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase().trim();
        const hit =
          doc.title.toLowerCase().includes(q) ||
          doc.department?.toLowerCase().includes(q) ||
          doc.board_name.toLowerCase().includes(q) ||
          doc.attachment_names?.some((x) => x.toLowerCase().includes(q)) ||
          doc.policy_category?.some((c) => c.toLowerCase().includes(q));
        if (!hit) continue;
      }
      if (!doc.policy_year) continue;
      n.set(doc.policy_year, (n.get(doc.policy_year) ?? 0) + 1);
    }
    return [...n.entries()].sort((a, b) => b[0] - a[0]).map(([year, count]) => ({ year, count }));
  }, [data.documents, selectedStatus, selectedOffice, selectedCategory, loginRequiredFilter, searchTerm]);

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
    setLoginRequiredFilter('ALL');
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
      {/* Top Search & Filter Bar Section */}
      <div className="bg-white rounded-lg shadow-xs border border-slate-200 p-5 space-y-4">
        {/* Search Input Bar - Design Theme Clean Pill Input */}
        <div className="max-w-3xl mx-auto w-full">
          <label htmlFor="docSearch" className="sr-only">
            계획서 제목 검색
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5" aria-hidden="true" />
            </span>
            <input
              id="docSearch"
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="계획서 제목 검색 (예: 늘봄학교, 고교학점제, AI교육, 기초학력)"
              className="w-full h-12 pl-11 pr-24 bg-white text-slate-900 placeholder-slate-400
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

        {/* Quick Topic Chips */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs pt-1 justify-center sm:justify-start">
          <span className="text-slate-400 font-bold text-[11px] flex items-center gap-1 shrink-0 mr-1">
            <Tag className="w-3.5 h-3.5 text-blue-600" />
            주요 주제:
          </span>
          {quickTopics.map((topic) => {
            const isActive = selectedCategory === topic || searchTerm === topic;
            return (
              <button
                key={topic}
                onClick={() => {
                  setSelectedCategory(topic);
                  setSearchTerm('');
                }}
                className={`px-3 py-1 rounded-md transition-colors font-bold text-sm border ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white hover:bg-blue-50 text-slate-700 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                #{topic}
              </button>
            );
          })}
        </div>

        {/* Detailed Filters Grid */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Office Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-slate-400" /> 교육청
            </label>
            <select
              value={selectedOffice}
              onChange={(e) => setSelectedOffice(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">전체 교육청 ({data.offices.length}개)</option>
              {data.offices.map((off) => (
                <option key={off} value={off}>
                  {off}교육청
                </option>
              ))}
            </select>
          </div>

          {/* Classification Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-400" /> 판별 상태
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as DocumentClassificationStatus | 'ALL')}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:ring-1 focus:ring-blue-500"
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
            <label className="block text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" /> 정책 연도
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:ring-1 focus:ring-blue-500"
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
            <label className="block text-[10px] font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3 text-slate-400" /> 정책 분야
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">전체 분야</option>
              {data.categories.map((cat) => (
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
              className="w-full text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-3 rounded-lg border border-slate-200 transition flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              필터 초기화
            </button>
          </div>
        </div>
      </div>

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

        <div className="flex items-center gap-2">
          <label className="text-slate-500 text-xs font-medium">로그인 조건:</label>
          <select
            value={loginRequiredFilter}
            onChange={(e) => setLoginRequiredFilter(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">전체 문서</option>
            <option value="PUBLIC">로그인 불필요 (바로 다운로드 가능)</option>
            <option value="LOGIN">로그인 필요 (기관 회원)</option>
          </select>
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
            const isSaved = savedDocIds.includes(doc.id);
            return (
              <div
                key={doc.id}
                className="group bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all flex flex-col md:flex-row md:items-start justify-between gap-4"
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
                    {/* Bookmark Toggle */}
                    <button
                      onClick={() => onToggleSave(doc)}
                      className={`flex-1 md:flex-initial px-3 py-1.5 text-xs font-semibold rounded-lg border transition flex items-center justify-center gap-1 ${
                        isSaved
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-transparent'
                      }`}
                    >
                      {isSaved ? (
                        <>
                          <BookmarkCheck className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                          <span>보관됨</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3.5 h-3.5 text-slate-400" />
                          <span>보관</span>
                        </>
                      )}
                    </button>

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
                <span className="text-slate-400 font-semibold block mb-0.5">게시일자 / 수집일</span>
                <span className="font-medium text-slate-800">
                  {activeDetailDoc.published_date || '미상'} (수집: {activeDetailDoc.collected_at})
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">정책 연도 및 문서유형</span>
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

            {/* Attachments Section */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <Download className="w-3.5 h-3.5 text-indigo-600" /> 수집된 첨부문서
              </h4>
              {activeDetailDoc.attachments && activeDetailDoc.attachments.length > 0 ? (
                <div className="space-y-1.5">
                  {activeDetailDoc.attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="font-medium text-slate-800 truncate">{att.name}</span>
                      </div>
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700 shrink-0"
                      >
                        다운로드
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg border">
                  첨부 파일이 없거나 게시글 본문 링크로 제공되는 문서입니다.
                </p>
              )}
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
