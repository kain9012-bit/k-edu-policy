import React, { useState } from 'react';
import { DocumentsData } from '../types';
import { Database, CheckCircle2, AlertCircle, RefreshCw, FileText, Lock, Globe, Terminal, Shield } from 'lucide-react';

interface CollectionStatusTabProps {
  data: DocumentsData;
}

export const CollectionStatusTab: React.FC<CollectionStatusTabProps> = ({ data }) => {
  const [activeSubTab, setActiveSubTab] = useState<'offices' | 'sources' | 'logs'>('offices');

  return (
    <div className="space-y-6 pb-12">
      {/* Top Coverage Summary Bar - Clean Minimal Style */}
      <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 " />
              <h3 className="text-base font-bold text-slate-900">수집 현황 공개</h3>
            </div>
            <p className="text-xs text-slate-600">
              어디서 언제 무엇을 가져왔는지 그대로 공개합니다. 수집에 실패한 곳도 가리지 않고 표시합니다.
            </p>
          </div>

          <div className="text-xs text-slate-500 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200/80 tabular-nums">
            생성일시: <strong className="text-slate-900 font-bold">{data.generated_at}</strong>
          </div>
        </div>

        {/* Coverage KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[11px] text-slate-500 block mb-0.5 font-medium">연동 교육청</span>
            <span className="text-xl font-bold text-emerald-600 tabular-nums">
              {data.coverage.connected} / {data.coverage.total}개
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[11px] text-slate-500 block mb-0.5 font-medium">수집 게시판</span>
            <span className="text-xl font-bold text-blue-600 tabular-nums">{data.coverage.boards}개 게시판</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[11px] text-slate-500 block mb-0.5 font-medium">수집한 문서</span>
            <span className="text-xl font-bold text-slate-900 tabular-nums">
              {data.count.toLocaleString()}건
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[11px] text-slate-500 block mb-0.5 font-medium">자동 수집 주기</span>
            <span className="text-xl font-bold text-indigo-600 tabular-nums">매일 03:00</span>
          </div>
        </div>
      </div>

      {/* Sub Tabs Selector */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('offices')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeSubTab === 'offices'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          교육청별 수집 통계 ({data.office_stats?.length || 0})
        </button>

        <button
          onClick={() => setActiveSubTab('sources')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeSubTab === 'sources'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          게시판 출처 목록 ({data.sources?.length || 0})
        </button>

        <button
          onClick={() => setActiveSubTab('logs')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeSubTab === 'logs'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          수집 실행 로그 ({data.logs?.length || 0})
        </button>
      </div>

      {/* Subtab 1: Office Stats */}
      {activeSubTab === 'offices' && (
        <div className="bg-white rounded-lg border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800">16개 시도교육청 수집 종합 현황표</h4>
            <span className="text-[11px] text-slate-500">수집 기준</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">교육청</th>
                  <th className="py-3 px-4 text-center">수집 게시판</th>
                  <th className="py-3 px-4 text-right">전체 문서</th>
                  <th className="py-3 px-4 text-right">계획서</th>
                  <th className="py-3 px-4 text-center">최신 계획서</th>
                  <th className="py-3 px-4 text-center">마지막 수집</th>
                  <th className="py-3 px-4 text-center">수집 상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {data.office_stats?.map((stat) => (
                  <tr key={stat.short_name} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {stat.name} ({stat.short_name})
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-700">{stat.boards}개</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">{stat.count.toLocaleString()}건</td>
                    <td className="py-3 px-4 text-right font-bold text-indigo-600">
                      {stat.plan_count.toLocaleString()}건
                    </td>
                    <td className="py-3 px-4 text-center tabular-nums text-slate-600">{stat.latest_post_date}</td>
                    <td className="py-3 px-4 text-center tabular-nums text-slate-500 text-[11px]">{stat.last_success}</td>
                    <td className="py-3 px-4 text-center">
                      {stat.failed_boards > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold">
                          실패 {stat.failed_boards}개
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">정상</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 2: Sources */}
      {activeSubTab === 'sources' && (
        <div className="bg-white rounded-lg border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h4 className="text-xs font-bold text-slate-800">게시판별 수집 출처 명세 (179개 게시판)</h4>
          </div>

          <div className="divide-y divide-slate-100">
            {data.sources?.map((src, idx) => (
              <div key={idx} className="p-4 hover:bg-slate-50 transition space-y-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded bg-slate-900 text-white font-bold text-xs">
                      {src.office}교육청
                    </span>
                    <h5 className="font-bold text-slate-900 text-sm">{src.board_name}</h5>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium border border-indigo-200">
                      {src.board_type}
                    </span>
                    {src.login_required && (
                      <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-xs font-semibold border border-red-200 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> 기관로그인 필요
                      </span>
                    )}
                  </div>

                  <a
                    href={src.list_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                  >
                    <span>게시판 바로가기</span>
                    <Globe className="w-3 h-3" />
                  </a>
                </div>

                <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>메뉴 경로: <strong className="text-slate-800">{src.menu_path}</strong></span>
                  <span>라이선스: <strong className="text-slate-800">{src.license}</strong></span>
                  <span>robots.txt: <strong className="text-emerald-700">{src.robots}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subtab 3: Logs */}
      {activeSubTab === 'logs' && (
        <div className="bg-slate-950 text-slate-200 rounded-lg border border-slate-800 p-5 tabular-nums text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <h4 className="font-bold text-white">자동 수집 파이프라인 실시간 실행 로그</h4>
            </div>
            <span className="text-[10px] text-slate-500">GitHub Actions Cron Worker</span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {data.logs?.map((log, idx) => (
              <div key={idx} className="flex items-start gap-3 text-[11px] leading-relaxed">
                <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] shrink-0 ${
                  log.level === 'INFO' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400'
                }`}>
                  {log.level}
                </span>
                <span className="text-slate-300">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
