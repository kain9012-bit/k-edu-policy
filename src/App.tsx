import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { ActiveTab, DocumentsData, InfoListData, BudgetData, PolicyDocument } from './types';
import {
  emptyDocumentsData,
  emptyInfoListData,
  emptyBudgetData,
} from './data/fallbackData';
import { Header } from './components/Header';
import { HomeTab } from './components/HomeTab';
import { PolicyDocumentsTab } from './components/PolicyDocumentsTab';
import { InternalInfoTab } from './components/InternalInfoTab';
import { BudgetTab } from './components/BudgetTab';
import { CollectionStatusTab } from './components/CollectionStatusTab';
import { InfoGuideModal } from './components/InfoGuideModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 데이터가 도착하기 전에는 빈 껍데기를 쓴다.
  // 그럴듯한 표본을 채워두면 못 받았을 때 가짜 문서번호가 진짜처럼 보인다.
  const [documentsData, setDocumentsData] = useState<DocumentsData>(emptyDocumentsData);
  const [infoListData, setInfoListData] = useState<InfoListData>(emptyInfoListData);
  const [budgetData, setBudgetData] = useState<BudgetData>(emptyBudgetData);

  // Modal controls
  const [showInfoModal, setShowInfoModal] = useState(false);

  // 수집 데이터 로딩 상태
  const [loading, setLoading] = useState(true);
  // 못 받았으면 숨기지 않고 알린다. 다시 시도할 수 있게 값을 올린다.
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  // 결재문서 목록은 압축해도 3MB가 넘는다. 필요한 탭을 열 때만 받는다.
  const [infoLoading, setInfoLoading] = useState(false);
  const infoRequested = React.useRef(false);

  // 수집기가 만든 data/*.json 을 읽는다.
  // GitHub Pages 하위 경로에서도 동작하도록 절대경로(/data)가 아닌
  // import.meta.env.BASE_URL 기준 상대경로를 쓴다.
  const load = React.useCallback(async <T,>(name: string, apply: (v: T) => void): Promise<boolean> => {
    const base = import.meta.env.BASE_URL || './';
    const url = `${base}data/${name}`.replace(/([^:]\/)\/+/g, '$1');
    try {
      const res = await fetch(url);
      if (res.ok) {
        apply(await res.json());
        return true;
      }
      console.warn(`${name} 응답 ${res.status} — 해당 자료 없이 표시합니다.`);
    } catch (err) {
      console.warn(`${name} 을 불러오지 못했습니다.`, err);
    }
    return false;
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const [okDocs, okBudget] = await Promise.all([
        load<DocumentsData>('documents.json', setDocumentsData),
        load<BudgetData>('budget.json', setBudgetData),
      ]);
      if (!alive) return;
      setLoadFailed(!okDocs || !okBudget);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [load, retryToken]);

  // 결재문서 목록은 그 자료를 쓰는 탭(결재문서·수집 출처)에 들어갈 때 받는다.
  // 첫 화면에서 미리 받으면, 그 탭을 안 여는 사람도 3MB를 내려받게 된다.
  useEffect(() => {
    if (activeTab !== 'infolist' && activeTab !== 'sources') return;
    if (infoRequested.current) return;
    infoRequested.current = true;
    setInfoLoading(true);
    load<InfoListData>('infolist.json', setInfoListData).then((ok) => {
      setInfoLoading(false);
      // 실패했으면 표시를 되돌려, 탭을 다시 눌렀을 때 한 번 더 시도하게 한다.
      // 그러지 않으면 한 번 끊긴 뒤로는 새로고침 전까지 계속 빈 목록만 보인다.
      if (!ok) infoRequested.current = false;
    });
  }, [activeTab, load]);

  // 탭을 바꾸면 화면 맨 위부터 보여준다.
  // 스크롤을 그대로 두면 새 탭의 중간이 보여서 어디로 왔는지 알기 어렵다.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [activeTab]);


  return (
    <div className="min-h-screen overflow-x-clip bg-white text-slate-800 font-sans antialiased flex flex-col selection:bg-blue-600 selection:text-white">
      {/* 본문 바로가기 — KRDS 접근성 필수 요소 */}
      <a href="#container" className="krds-skip">
        본문 바로가기
      </a>

      {/* App Header & Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenInfoModal={() => setShowInfoModal(true)}
      />

      {/* Main Content Area */}
      <main id="container" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading && (
          <p className="text-sm text-slate-500 py-2" role="status">
            수집 데이터를 불러오는 중입니다…
          </p>
        )}

        {!loading && loadFailed && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-5 space-y-2"
          >
            <p className="font-bold text-slate-900">수집 데이터를 불러오지 못했습니다</p>
            <p className="text-sm text-slate-700">
              화면에 아무 문서도 표시되지 않습니다. 없는 자료를 임의로 채워 보여주지 않습니다.
              연결 상태를 확인한 뒤 다시 시도해 주세요.
            </p>
            <button
              type="button"
              onClick={() => {
                infoRequested.current = false;
                setRetryToken((n) => n + 1);
              }}
              className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold"
            >
              다시 시도
            </button>
          </div>
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
            initialSearchTerm={searchQuery}
            // 홈에서 넘어온 검색어는 한 번만 쓴다. 남겨두면 나중에 탭을 다시 눌렀을 때
            // 사용자가 지운 옛 검색어가 말없이 되살아난다.
            onConsumeInitialSearch={() => setSearchQuery('')}
          />
        )}

        {activeTab === 'infolist' && <InternalInfoTab data={infoListData} />}

        {activeTab === 'budget' && <BudgetDataTab data={budgetData} />}

        {activeTab === 'sources' && (
          <CollectionStatusTab data={documentsData} infoData={infoListData} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
            <div className="space-y-1.5">
              <p className="text-base font-bold text-white">
                교육정책 통합검색 <span className="text-slate-400 font-medium">EduPolicy Search</span>
              </p>
              <p className="text-sm text-slate-300">
                전국 16개 시도교육청 공개 정책계획서 · 정보공개포털 결재문서 · 지방교육재정 세출예산
              </p>
            </div>

            <div className="text-sm text-slate-300 md:text-right space-y-1">
              <p>정책계획 출처: 각 시도교육청 공개 게시판</p>
              <p>결재문서 출처: 정보공개포털(open.go.kr)</p>
              <p>예산 출처: 지방교육재정알리미 Open API (공공누리 출처표시)</p>
            </div>
          </div>
        </div>

      </footer>

      {/* 결재문서 목록을 받는 동안 알려준다. 3MB라 회선이 느리면 몇 초 걸린다. */}
      {infoLoading && (
        <div
          role="status"
          className="fixed bottom-6 left-6 z-40 flex items-center gap-2 px-4 py-3
                     rounded-full bg-slate-900 text-white text-sm font-bold shadow-lg"
        >
          <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          결재문서 목록을 불러오는 중입니다
        </div>
      )}

      {/* Modals */}
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
