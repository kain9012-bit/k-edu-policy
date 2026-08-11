import React from 'react';
import { ActiveTab } from '../types';
import { Search, Info } from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenInfoModal: () => void;
}

const TABS: { id: ActiveTab; label: string }[] = [
  { id: 'home', label: '홈' },
  { id: 'documents', label: '공개 계획서' },
  { id: 'infolist', label: '내부 결재' },
  { id: 'budget', label: '예산 데이터' },
  { id: 'sources', label: '수집 출처' },
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenInfoModal,
}) => {
  return (
    <header className="bg-white sticky top-0 z-30 border-b border-slate-200">
      {/* ── 안내 띠: 비공식 서비스임을 먼저 밝힌다(KRDS 마스트헤드 관례) ── */}
      <div className="bg-slate-50 text-slate-600 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
          <p>
            이 누리집은 대한민국 공식 전자정부 누리집이 아닙니다.
            <span className="hidden sm:inline"> 공개된 정부 데이터를 모아 보여주는 비공식 서비스입니다.</span>
          </p>
          <button
            type="button"
            onClick={onOpenInfoModal}
            className="inline-flex items-center gap-1.5 font-bold text-slate-900 hover:underline underline-offset-4 shrink-0"
          >
            <Info className="w-4 h-4" aria-hidden="true" />
            기획 의도 및 안내
          </button>
        </div>
      </div>

      {/* ── 서비스명(왼쪽) + 메뉴(오른쪽)를 한 줄에 둔다 ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-6">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2.5 py-3.5 text-left group shrink-0"
          >
            <span className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 group-hover:bg-blue-700 transition-colors">
              <Search className="w-5 h-5" aria-hidden="true" />
            </span>
            <span className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-slate-900 whitespace-nowrap">
                교육정책 통합검색
              </span>
              <span className="hidden sm:inline text-xs font-medium text-slate-400 whitespace-nowrap">
                EduPolicy Search
              </span>
            </span>
          </button>

          {/* 메뉴가 헤더 아래 테두리에 맞물리도록 밑줄을 헤더 바닥에 붙인다 */}
          <nav aria-label="주 메뉴" className="-mb-px">
            <ul className="flex overflow-x-auto overflow-y-hidden no-scrollbar" role="tablist">
              {TABS.map(({ id, label }) => {
                const on = activeTab === id;
                return (
                  <li key={id} role="presentation" className="shrink-0">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => setActiveTab(id)}
                      className={`px-3.5 sm:px-4 py-4 text-base font-bold whitespace-nowrap
                                  border-b-[3px] transition-colors ${
                                    on
                                      ? 'text-blue-700 border-blue-600'
                                      : 'text-slate-600 border-transparent hover:text-slate-900'
                                  }`}
                    >
                      {label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
};
