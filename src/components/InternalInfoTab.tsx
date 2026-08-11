import React, { useState, useMemo, useEffect } from 'react';
import { sortOffices } from '../lib/offices';
import { InfoListData, InternalDocument } from '../types';
import {
  Search,
  Landmark,
  Building2,
  Copy,
  Check,
  ExternalLink,
  Info,
  HelpCircle,
  FileCheck,
  RotateCcw,
  AlertTriangle,
  Calendar
} from 'lucide-react';

interface InternalInfoTabProps {
  data: InfoListData;
}

export const InternalInfoTab: React.FC<InternalInfoTabProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOffice, setSelectedOffice] = useState<string>('ALL');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [copiedDocNo, setCopiedDocNo] = useState<string | null>(null);
  const [showInfoGuide, setShowInfoGuide] = useState(false);

  // Link generation helper exact rule from spec
  const getOpenGoKrUrl = (id: string) => {
    const m = String(id || '').match(/^il-(.+)-(\d{14})$/);
    if (!m) return 'https://www.open.go.kr/othicInfo/infoList/infoList.do';
    return (
      'https://www.open.go.kr/othicInfo/infoList/infoListDetl.do?prdnNstRgstNo=' +
      encodeURIComponent(m[1]) +
      '&prdnDt=' +
      m[2] +
      '&nstSeCd=E'
    );
  };

  const filteredDocs = useMemo(() => {
    return data.documents.filter((doc) => {
      // Office filter
      if (selectedOffice !== 'ALL' && doc.office !== selectedOffice) {
        return false;
      }

      // Department filter
      if (selectedDept !== 'ALL' && doc.department !== selectedDept) {
        return false;
      }

      // Search term
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase().trim();
        const titleMatch = doc.title.toLowerCase().includes(q);
        const docNoMatch = doc.doc_no.toLowerCase().includes(q);
        const deptMatch = doc.department.toLowerCase().includes(q);
        const officeMatch = doc.office.toLowerCase().includes(q);

        if (!titleMatch && !docNoMatch && !deptMatch && !officeMatch) {
          return false;
        }
      }

      return true;
    });
  }, [data.documents, searchTerm, selectedOffice, selectedDept]);

  // 내부결재 목록은 4만 건이 넘는다. 한 번에 그리면 브라우저가 멈추므로 나눠 그린다.
  // 교육청은 행정구역 순서로 늘어놓는다.
  const officeOptions = useMemo(() => sortOffices<string>(data.offices, (o) => o), [data.offices]);

  const PAGE = 30;
  const [visibleCount, setVisibleCount] = useState(PAGE);
  useEffect(() => {
    setVisibleCount(PAGE);
  }, [searchTerm, selectedOffice, selectedDept]);
  const visibleDocs = filteredDocs.slice(0, visibleCount);

  const handleCopyDocNo = (docNo: string) => {
    navigator.clipboard.writeText(docNo);
    setCopiedDocNo(docNo);
    setTimeout(() => setCopiedDocNo(null), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Notice Banner - Clean Minimal Card Style */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-200">
            <Landmark className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                정보공개포털(open.go.kr) 내부결재 정보목록
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                2026년 1년치 수집분
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              교육청 홈페이지 게시판에 올려놓지 않은 내부결재 계획문서의 목록을 모아 검색할 수 있게 했습니다.
              문서번호를 복사하여 교육청에 직접 문의하거나 정보공개청구를 진행할 수 있습니다.
            </p>
          </div>
        </div>

        {/* Scope Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-3 border-t border-slate-100 text-[11px] text-slate-600 font-medium">
          <div className="flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>본청 주요 부서 결재문서 수집</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>[품의]·[지출] 회계 건 제외</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>문서 파일 미제공 (목록/번호)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>개인정보·담당자 성명 미수집</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg shadow-xs border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Keyword Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="내부결재 제목, 문서번호, 부서명 검색 (예: 초등교육과-12097, 심층면접, 자격연수...)"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 focus:bg-white text-slate-900 placeholder-slate-400 text-xs font-medium rounded-full border border-transparent focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
            />
          </div>

          {/* Office Select */}
          <div className="w-full sm:w-48">
            <select
              value={selectedOffice}
              onChange={(e) => setSelectedOffice(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">전체 교육청 ({data.offices.length}개)</option>
              {officeOptions.map((off) => (
                <option key={off} value={off}>
                  {off}
                </option>
              ))}
            </select>
          </div>

          {/* Department Select */}
          <div className="w-full sm:w-40">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">전체 담당부서</option>
              {data.departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Info Request Guide Button */}
          <button
            onClick={() => setShowInfoGuide(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center justify-center gap-1.5 shrink-0"
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>정보공개 청구 방법</span>
          </button>
        </div>
      </div>

      {/* Results Stats */}
      <div className="flex items-center justify-between px-1 text-slate-700 text-xs font-medium">
        <div>
          정보목록 검색 결과 <strong className="text-emerald-700 text-sm font-bold">{filteredDocs.length}</strong>건 (전체 {data.count.toLocaleString()}건 중)
        </div>
        <div className="text-slate-400 text-[11px]">
          수집 기간: {data.coverage.from} ~ {data.coverage.to}
        </div>
      </div>

      {/* Internal Docs Table / Cards */}
      {filteredDocs.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Landmark className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">일치하는 내부결재 문서목록이 없습니다</h3>
          <p className="text-xs text-slate-500">다른 검색어나 교육청 필터를 선택해 보세요.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="divide-y divide-slate-100">
            {visibleDocs.map((doc) => {
              const openUrl = getOpenGoKrUrl(doc.id);
              const isCopied = copiedDocNo === doc.doc_no;

              return (
                <div
                  key={doc.id}
                  className="p-4 hover:bg-slate-50/80 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded font-bold text-xs bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {doc.office}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                        {doc.department}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> 생산일자: {doc.published_date}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 leading-snug">{doc.title}</h4>

                    <div className="flex items-center gap-2 text-xs pt-0.5">
                      <span className="text-slate-500 font-medium">관리 문서번호:</span>
                      <code className="px-2 py-0.5 rounded bg-slate-100 tabular-nums text-indigo-700 font-bold border border-slate-200">
                        {doc.doc_no}
                      </code>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
                    <button
                      onClick={() => handleCopyDocNo(doc.doc_no)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition flex items-center gap-1.5"
                      title="문서번호를 클립보드에 복사"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">복사됨!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>문서번호 복사</span>
                        </>
                      )}
                    </button>

                    <a
                      href={openUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs flex items-center gap-1"
                    >
                      <span>정보공개포털</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}

            {visibleCount < filteredDocs.length && (
              <div className="p-5 flex flex-col items-center gap-2 bg-slate-50">
                <p className="text-sm text-slate-500">
                  {filteredDocs.length.toLocaleString()}건 중{' '}
                  <strong className="font-bold text-slate-900 tabular-nums">
                    {visibleDocs.length.toLocaleString()}
                  </strong>
                  건 표시
                </p>
                <button
                  type="button"
                  onClick={() => setVisibleCount((n) => n + PAGE)}
                  className="px-6 py-3 rounded-md border border-slate-300 bg-white text-slate-700 font-bold text-sm hover:border-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                >
                  {PAGE}건 더 보기
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Information Request Guide Modal */}
      {showInfoGuide && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg border border-slate-200 max-w-xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">정보공개청구 진행 방법 안내</h3>
              </div>
              <button
                onClick={() => setShowInfoGuide(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <p className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                교육청 홈페이지 게시판에 업로드되지 않은 내부결재 계획서는 <strong>대한민국 정보공개포털(open.go.kr)</strong>을 통해 원문을 청구할 수 있습니다.
              </p>

              <ol className="space-y-2.5 list-decimal list-inside font-medium text-slate-800">
                <li className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                  <strong className="text-emerald-900">1단계: 문서번호 및 부서 복사</strong>
                  <p className="text-slate-600 text-[11px] mt-0.5 ml-4">
                    위 목록에서 청구하고자 하는 계획서의 <code>[문서번호 복사]</code> 버튼을 누릅니다.
                  </p>
                </li>
                <li className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                  <strong className="text-emerald-900">2단계: 정보공개포털 로그인 및 청구서 작성</strong>
                  <p className="text-slate-600 text-[11px] mt-0.5 ml-4">
                    <strong>open.go.kr</strong> 접속 후 [청구신청] 메뉴로 들어갑니다.
                  </p>
                </li>
                <li className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                  <strong className="text-emerald-900">3단계: 청구기관 및 제목 입력</strong>
                  <p className="text-slate-600 text-[11px] mt-0.5 ml-4">
                    처리기관으로 해당 교육청과 생산부서를 지정하고, 제목 및 내용란에 복사한 문서번호와 정확한 문서 제목을 기재합니다.
                  </p>
                </li>
              </ol>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowInfoGuide(false)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition"
              >
                확인 및 닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
