import React from 'react';
import { ActiveTab } from '../types';
import { Search, Database, FileText, Landmark, BarChart3, Bookmark, Info, Home } from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  savedCount: number;
  onOpenSavedModal: () => void;
  onOpenInfoModal: () => void;
}

/** KRDS GNB: 아이콘 + 라벨, 선택 시 하단 밑줄 강조 */
const TABS: { id: ActiveTab; label: string; Icon: typeof Home }[] = [
  { id: 'home', label: '홈', Icon: Home },
  { id: 'documents', label: '공개 계획서', Icon: FileText },
  { id: 'infolist', label: '내부 결재', Icon: Landmark },
  { id: 'budget', label: '예산 데이터', Icon: BarChart3 },
  { id: 'sources', label: '수집 출처', Icon: Database },
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  savedCount,
  onOpenSavedModal,
  onOpenInfoModal,
}) => {
  return (
    <header className="bg-white sticky top-0 z-30 border-b-2 border-slate-900">
      {/* ── 안내 띠: 비공식 서비스임을 먼저 밝힌다(KRDS 마스트헤드 관례) ── */}
      <div className="bg-slate-900 text-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
          <p>
            이 누리집은 대한민국 공식 전자정부 누리집이 아닙니다.
            <span className="hidden sm:inline"> 공개된 정부 데이터를 모아 보여주는 비공식 서비스입니다.</span>
          </p>
          <button
            type="button"
            onClick={onOpenInfoModal}
            className="inline-flex items-center gap-1.5 font-bold text-white hover:underline underline-offset-4 shrink-0"
          >
            <Info className="w-4 h-4" aria-hidden="true" />
            기획 의도 및 안내
          </button>
        </div>
      </div>

      {/* ── 서비스명 + 보관함 ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-3 text-left group min-w-0"
        >
          <span className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 group-hover:bg-blue-700 transition-colors">
            <Search className="w-5 h-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 truncate">
                교육정책 통합검색
              </h1>
              <span className="hidden sm:inline text-xs font-medium text-slate-400">
                EduPolicy Search
              </span>
            </span>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              16개 시도교육청 공개 계획서 · 정보공개포털 내부결재 · 지방교육재정 세출예산
            </p>
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenSavedModal}
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-md
 border border-slate-300 bg-white text-slate-700
                     hover:border-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
        >
          <Bookmark className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">보관함</span>
          {savedCount > 0 && (
            <span className="min-w-5 px-1.5 py-0.5 rounded-full text-xs font-bold tabular-nums bg-blue-600 text-white">
              {savedCount}
            </span>
          )}
        </button>
      </div>

      {/* ── GNB (KRDS 탭 스타일: 선택 항목 하단 밑줄) ── */}
      <nav aria-label="주 메뉴" className="border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* overflow-x만 주면 overflow-y도 auto가 되어, 탭 밑줄의 -1px 때문에
              오른쪽에 세로 스크롤바가 생긴다. 세로는 명시적으로 잠근다. */}
          <ul className="flex gap-1 overflow-x-auto overflow-y-hidden no-scrollbar" role="tablist">
            {TABS.map(({ id, label, Icon }) => {
              const on = activeTab === id;
              return (
                <li key={id} role="presentation" className="shrink-0">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setActiveTab(id)}
                    className={`relative flex items-center gap-1.5 px-4 py-3 text-base font-bold whitespace-nowrap
                                border-b-[3px] -mb-px transition-colors ${
                                  on
                                    ? 'text-blue-700 border-blue-600'
                                    : 'text-slate-500 border-transparent hover:text-slate-900 hover:bg-slate-50'
                                }`}
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </header>
  );
};
