import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { ActiveTab, DocumentsData, InfoListData, BudgetData, PolicyDocument } from './types';
import {
  fallbackDocumentsData,
  fallbackInfoListData,
  fallbackBudgetData,
} from './data/fallbackData';
import { Header } from './components/Header';
import { HomeTab } from './components/HomeTab';
import { PolicyDocumentsTab } from './components/PolicyDocumentsTab';
import { InternalInfoTab } from './components/InternalInfoTab';
import { BudgetTab } from './components/BudgetTab';
import { CollectionStatusTab } from './components/CollectionStatusTab';
import { SavedDocsModal } from './components/SavedDocsModal';
import { InfoGuideModal } from './components/InfoGuideModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data states initialized with fallbacks for zero delay & resilient offline rendering
  const [documentsData, setDocumentsData] = useState<DocumentsData>(fallbackDocumentsData);
  const [infoListData, setInfoListData] = useState<InfoListData>(fallbackInfoListData);
  const [budgetData, setBudgetData] = useState<BudgetData>(fallbackBudgetData);

  // Saved bookmark IDs in LocalStorage
  const [savedDocIds, setSavedDocIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('edupolicy_saved_ids');
      return stored ? JSON.parse(stored) : ['112cde182ad0a760'];
    } catch {
      return ['112cde182ad0a760'];
    }
  });

  // Modal controls
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // 수집 데이터 로딩 상태 (내부결재 목록이 20MB라 표시가 필요하다)
  const [loading, setLoading] = useState(true);

  // 수집기가 만든 data/*.json 을 읽는다.
  // GitHub Pages 하위 경로에서도 동작하도록 절대경로(/data)가 아닌
  // import.meta.env.BASE_URL 기준 상대경로를 쓴다.
  useEffect(() => {
    const base = import.meta.env.BASE_URL || './';
    const url = (name: string) => `${base}data/${name}`.replace(/([^:]\/)\/+/g, '$1');

    const load = async <T,>(name: string, apply: (v: T) => void) => {
      try {
        const res = await fetch(url(name));
        if (res.ok) apply(await res.json());
        else console.warn(`${name} 응답 ${res.status} — 표본 데이터로 표시합니다.`);
      } catch (err) {
        console.warn(`${name} 을 불러오지 못했습니다. 표본 데이터로 표시합니다.`, err);
      }
    };

    (async () => {
      // 가벼운 것부터 먼저 그려서 화면이 비어 보이지 않게 한다.
      await Promise.all([
        load<DocumentsData>('documents.json', setDocumentsData),
        load<BudgetData>('budget.json', setBudgetData),
      ]);
      setLoading(false);
      // 내부결재 목록은 크기가 커서 뒤이어 채운다.
      await load<InfoListData>('infolist.json', setInfoListData);
    })();
  }, []);

  // 탭을 바꾸면 화면 맨 위부터 보여준다.
  // 스크롤을 그대로 두면 새 탭의 중간이 보여서 어디로 왔는지 알기 어렵다.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [activeTab]);

  // Save bookmark IDs to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('edupolicy_saved_ids', JSON.stringify(savedDocIds));
    } catch (e) {
      console.error('Failed to write bookmark IDs to localStorage', e);
    }
  }, [savedDocIds]);

  // Toggle bookmark function
  const handleToggleSave = (doc: PolicyDocument) => {
    setSavedDocIds((prev) => {
      if (prev.includes(doc.id)) {
        return prev.filter((id) => id !== doc.id);
      } else {
        return [...prev, doc.id];
      }
    });
  };

  // Saved documents list
  const savedDocsList = documentsData.documents.filter((doc) => savedDocIds.includes(doc.id));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased flex flex-col selection:bg-blue-600 selection:text-white">
      {/* 본문 바로가기 — KRDS 접근성 필수 요소 */}
      <a href="#container" className="krds-skip">
        본문 바로가기
      </a>

      {/* App Header & Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        savedCount={savedDocIds.length}
        onOpenSavedModal={() => setShowSavedModal(true)}
        onOpenInfoModal={() => setShowInfoModal(true)}
      />

      {/* Main Content Area */}
      <main id="container" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading && (
          <p className="sr-only" role="status">
            수집 데이터를 불러오는 중입니다.
          </p>
        )}
        {activeTab === 'home' && (
          <HomeTab
            data={documentsData}
            onNavigateTab={(tab, query) => {
              if (query !== undefined) {
                setSearchQuery(query);
              }
              setActiveTab(tab);
            }}
            onOpenInfoModal={() => setShowInfoModal(true)}
          />
        )}

        {activeTab === 'documents' && (
          <PolicyDocumentsTab
            data={documentsData}
            savedDocIds={savedDocIds}
            onToggleSave={handleToggleSave}
            initialSearchTerm={searchQuery}
          />
        )}

        {activeTab === 'infolist' && <InternalInfoTab data={infoListData} />}

        {activeTab === 'budget' && <BudgetDataTab data={budgetData} />}

        {activeTab === 'sources' && (
          <CollectionStatusTab data={documentsData} infoData={infoListData} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
            <div className="space-y-1.5">
              <p className="text-base font-bold text-slate-900">
                교육정책 통합검색 <span className="text-slate-400 font-medium">EduPolicy Search</span>
              </p>
              <p className="text-sm text-slate-600">
                전국 16개 시도교육청 공개 정책계획서 · 정보공개포털 정보목록 · 지방교육재정 세출예산
              </p>
            </div>

            <div className="text-sm text-slate-600 md:text-right space-y-1">
              <p>정책계획 출처: 각 시도교육청 공개 게시판</p>
              <p>내부결재 계획 출처: 정보공개포털(open.go.kr)</p>
              <p>예산 출처: 지방교육재정알리미 Open API (공공누리 출처표시)</p>
            </div>
          </div>

          <div className="pt-5 border-t border-slate-100 space-y-1 text-xs text-slate-500">
            <p>
              원본 계획서 파일은 재배포하지 않으며 해당 교육청 원문 게시글로 연결합니다.
              담당자명 등 개인정보는 수집·저장하지 않습니다.
            </p>
            <p>UI: KRDS(대한민국 디지털 정부 디자인시스템) 가이드 적용</p>
          </div>
        </div>

        {/* KRDS 식별자 영역 */}
        <div className="bg-slate-100 border-t border-slate-200">
          <p className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 text-center text-xs text-slate-600">
            이 누리집은 공개된 정부 데이터를 모아 보여주는 비공식 서비스입니다.
          </p>
        </div>
      </footer>

      {/* Modals */}
      {showSavedModal && (
        <SavedDocsModal
          savedDocs={savedDocsList}
          onClose={() => setShowSavedModal(false)}
          onRemoveDoc={(id) => setSavedDocIds((prev) => prev.filter((i) => i !== id))}
          onClearAll={() => setSavedDocIds([])}
        />
      )}

      {showInfoModal && <InfoGuideModal onClose={() => setShowInfoModal(false)} />}

      <ScrollToTopButton />
    </div>
  );
}

/** 화면을 어느 정도 내렸을 때만 나타나는 '맨 위로' 버튼 (KRDS 상단이동 패턴) */
function ScrollToTopButton() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="맨 위로 이동"
      className={`fixed bottom-6 right-6 z-40 flex items-center gap-1.5 px-4 py-3
                  rounded-full border border-slate-300 bg-white text-slate-700 shadow-lg
                  text-sm font-bold hover:bg-blue-600 hover:border-blue-600 hover:text-white
                  transition-all ${
                    show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
                  }`}
    >
      <ArrowUp className="w-4 h-4" aria-hidden="true" />
      <span className="hidden sm:inline">맨 위로</span>
    </button>
  );
}

// Rename wrapper for BudgetTab component
function BudgetDataTab({ data }: { data: BudgetData }) {
  return <BudgetTab data={data} />;
}
