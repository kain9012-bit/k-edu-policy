import React, { useState } from 'react';
import { DocumentsData, InfoListData, OfficeStat, BoardSource } from '../types';
import { sortOffices, shortOfficeName, officeRank } from '../lib/offices';
import { Database, CheckCircle2, AlertCircle, RefreshCw, FileText, Lock, Globe, Terminal, Shield } from 'lucide-react';

interface CollectionStatusTabProps {
  data: DocumentsData;
  infoData?: InfoListData;
}

export const CollectionStatusTab: React.FC<CollectionStatusTabProps> = ({ data, infoData }) => {
  const [activeSubTab, setActiveSubTab] =
    useState<'openness' | 'offices' | 'sources' | 'logs'>('openness');

  // 홈페이지에 공개한 계획서 수와 결재문서로만 남은 것의 수를 나란히 놓는다.
  // 두 데이터의 교육청 표기가 달라(경기 / 경기도교육청) 정식 명칭으로 맞춘다.
  const opennessRows = React.useMemo(() => {
    const internal = new Map<string, number>();
    for (const d of infoData?.documents ?? []) {
      internal.set(d.office, (internal.get(d.office) ?? 0) + 1);
    }

    const rows = (data.office_stats ?? []).map((o) => {
      const inner = internal.get(o.name) ?? 0;
      const open = o.plan_count ?? 0;
      return { key: o.name, short: o.short_name, name: o.name, inner, open, ratio: inner > 0 ? open / inner : 0, note: '' };
    });

    // 홈페이지를 따로 수집하지 않는 기관도 결재문서 목록에는 잡힌다.
    // 표에서 통째로 빠지면 합계가 안 맞고 '왜 없냐'는 오해를 부른다.
    const covered = new Set(rows.map((r) => r.name));
    for (const [office, inner] of internal) {
      if (covered.has(office)) continue;
      rows.push({
        key: office,
        short: shortOfficeName(office),
        name: office,
        inner,
        open: -1,                      // 0건이 아니라 '수집 대상 아님'
        ratio: -1,
        note: '홈페이지 수집 대상이 아직 아닙니다',
      });
    }

    // 교육청 순서는 행정구역 순서로 고정한다. 공개율순으로 섞으면 찾기 어렵다.
    return sortOffices<(typeof rows)[number]>(rows, (r) => r.name);
  }, [data.office_stats, infoData]);

  const maxInner = Math.max(1, ...opennessRows.map((r) => r.inner));

  // 게시판 목록도 교육청 순서로 늘어놓는다(같은 교육청 안에서는 게시판 이름순).
  const sortedSources = React.useMemo(
    () =>
      [...(data.sources ?? [])].sort((a: BoardSource, b: BoardSource) => {
        const d = officeRank(a.office || '') - officeRank(b.office || '');
        return d !== 0 ? d : (a.board_name || '').localeCompare(b.board_name || '', 'ko');
      }),
    [data.sources]
  );

  // 수집 통계 표는 행정구역 순서로 늘어놓는다(공개 수준 비교는 공개율 순서를 유지).
  const officeStats = React.useMemo(
    () => sortOffices<OfficeStat>(data.office_stats ?? [], (o) => o.short_name || o.name || ''),
    [data.office_stats]
  );

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
            <span className="text-xs text-slate-500 block mb-0.5 font-medium">시도교육청</span>
            <span className="text-xl font-bold text-emerald-600 tabular-nums">
              {data.coverage.agency_count ?? data.coverage.total}개
            </span>
            <span className="text-xs text-slate-500 block mt-0.5">
              옛 전남·광주 홈페이지 포함 {data.coverage.total}곳 수집
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
          onClick={() => setActiveSubTab('openness')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeSubTab === 'openness'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          공개 수준 비교
        </button>

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

      {/* Subtab 0: 공개 수준 비교 */}
      {activeSubTab === 'openness' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 space-y-2">
            <h4 className="text-base font-bold text-slate-900">
              홈페이지에 공개하는 범위는 교육청마다 다릅니다
            </h4>
            <div className="text-sm text-slate-700 leading-relaxed space-y-1">
              <p>
                아래 <strong className="font-bold">공개율</strong>은 결재문서 대비 홈페이지에
                올라온 계획서의 비율입니다.
              </p>
              <p className="text-slate-500">
                게시판 구성과 자료 분류 방식에 따라 달라질 수 있어, 수치만으로 공개에
                소극적이라고 보기는 어렵습니다.
              </p>
            </div>
            <p className="text-xs text-slate-500">
              결재문서 수집 기간: {infoData?.coverage?.from ?? '-'} ~ {infoData?.coverage?.to ?? '-'} ·
              홈페이지 수집 기준: {data.generated_at}
            </p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <p className="sm:hidden pb-2 text-[11px] text-slate-400">← 옆으로 밀어서 볼 수 있습니다</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="text-left py-3 px-4 font-bold">교육청</th>
                    <th className="text-right py-3 px-4 font-bold">홈페이지 공개</th>
                    <th className="text-right py-3 px-4 font-bold">결재문서</th>
                    <th className="text-right py-3 px-4 font-bold">공개율</th>
                    <th className="text-left py-3 px-4 font-bold w-1/3">비교</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {opennessRows.map((r) => {
                    const notCollected = r.open < 0;
                    const pct = r.ratio * 100;
                    return (
                      <tr key={r.key} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900">{r.short}</span>
                          <span className="text-xs text-slate-500 ml-1.5">{r.name}</span>
                          {r.note && (
                            <span className="block text-xs text-slate-400 mt-0.5">{r.note}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums font-bold text-blue-700">
                          {notCollected ? <span className="text-slate-300">—</span> : r.open.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-slate-600">
                          {r.inner.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums font-bold text-slate-900">
                          {notCollected ? (
                            <span className="text-slate-300">—</span>
                          ) : pct < 0.05 ? (
                            '0%'
                          ) : (
                            `${pct.toFixed(1)}%`
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {/* 회색 막대 = 결재문서 전체, 파란 막대 = 그중 공개된 몫 */}
                          <div className="relative h-4 bg-slate-100 rounded-sm overflow-hidden">
                            <div
                              className="absolute inset-y-0 left-0 bg-slate-300"
                              style={{ width: `${(r.inner / maxInner) * 100}%` }}
                            />
                            {!notCollected && (
                              <div
                                className="absolute inset-y-0 left-0 bg-blue-600"
                                style={{ width: `${(r.open / maxInner) * 100}%` }}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 space-y-1">
              <p>
                <span className="inline-block w-3 h-3 rounded-sm bg-blue-600 align-middle mr-1" />
                홈페이지에 공개된 계획서
                <span className="inline-block w-3 h-3 rounded-sm bg-slate-300 align-middle ml-3 mr-1" />
                정보공개포털에만 있는 결재문서
              </p>
              <p>
                결재문서 목록은 본청 부서 문서만 모은 것이라 실제 계획 수는 더 많을 수 있습니다.
                홈페이지 공개분은 게시판에서 계획서로 판별된 문서만 셉니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 1: Office Stats */}
      {activeSubTab === 'offices' && (
        <div className="bg-white rounded-lg border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800">16개 시도교육청 수집 종합 현황표</h4>
            <span className="text-[11px] text-slate-500">수집 기준</span>
          </div>

          <p className="sm:hidden pb-2 text-[11px] text-slate-400">← 옆으로 밀어서 볼 수 있습니다</p>
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
                {officeStats.map((stat) => (
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
            {sortedSources.map((src, idx) => (
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
