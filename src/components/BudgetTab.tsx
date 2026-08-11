import React, { useState, useMemo } from 'react';
import { BudgetData, BudgetRow } from '../types';
import { sortOffices, fullOfficeName } from '../lib/offices';
import { BarChart3, TrendingUp, Award, Building2, Calendar, Filter, DollarSign, Info } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';

interface BudgetTabProps {
  data: BudgetData;
}

export const BudgetTab: React.FC<BudgetTabProps> = ({ data }) => {
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedItem, setSelectedItem] = useState<string>('세출예산액');
  const [highlightRegion, setHighlightRegion] = useState<string>('경남');

  // 교육청은 행정구역 순서로 늘어놓는다.
  const regionOptions = useMemo(() => sortOffices<string>(data.regions, (r) => r), [data.regions]);

  // 축 눈금용 짧은 표기. 입력은 '원' 단위.
  const tickWon = (won: number) => {
    if (won >= 1_000_000_000_000) return `${(won / 1_000_000_000_000).toFixed(1)}조`;
    if (won >= 100_000_000) return `${Math.round(won / 100_000_000).toLocaleString()}억`;
    return won.toLocaleString();
  };
  // 축 눈금용 짧은 표기. 입력은 '억 원' 단위.
  const tickEok = (eok: number) => {
    if (eok >= 10_000) return `${(eok / 10_000).toFixed(1)}조`;
    return `${eok.toLocaleString()}억`;
  };

  // Helper to format won amounts into Jo / Eok Won
  const formatAmount = (amount: number) => {
    if (amount >= 1_000_000_000_000) {
      const jo = (amount / 1_000_000_000_000).toFixed(2);
      return `${jo}조 원`;
    }
    if (amount >= 100_000_000) {
      const eok = Math.round(amount / 100_000_000).toLocaleString();
      return `${eok}억 원`;
    }
    return `${amount.toLocaleString()} 원`;
  };

  // Filtered rows for selected year and item across 17 regions
  const currentYearRows = useMemo(() => {
    return data.rows
      .filter((r) => r.year === selectedYear && r.item === selectedItem)
      .sort((a, b) => b.amount - a.amount);
  }, [data.rows, selectedYear, selectedItem]);

  // 축 최대값. recharts 자동 계산에 맡기면 막대가 바닥에 깔린다.
  const maxAmount = useMemo(
    () => currentYearRows.reduce((m, r) => Math.max(m, r.amount), 0),
    [currentYearRows]
  );

  // 차트에는 필요한 두 값만 넘긴다.
  // year·region_code 같은 숫자 필드가 함께 있으면 축 범위가 엉뚱하게 잡힌다.
  const chartRows = useMemo(
    () => currentYearRows.map((r) => ({ region: r.region, amount: r.amount })),
    [currentYearRows]
  );

  // Rank calculation for highlighted office
  const highlightedRankInfo = useMemo(() => {
    const idx = currentYearRows.findIndex((r) => r.region === highlightRegion);
    if (idx === -1) return null;
    return {
      rank: idx + 1,
      total: currentYearRows.length,
      row: currentYearRows[idx],
    };
  }, [currentYearRows, highlightRegion]);

  // Multi-year trend data for highlighted office
  const trendData = useMemo(() => {
    return data.years
      .map((y) => {
        const row = data.rows.find(
          (r) => r.year === y && r.region === highlightRegion && r.item === selectedItem
        );
        return {
          year: `${y}년`,
          amount: row ? Math.round(row.amount / 100_000_000) : 0, // In 억 원
          formatted: row ? formatAmount(row.amount) : '데이터 없음',
        };
      })
      .filter((d) => d.amount > 0);
  }, [data.rows, data.years, highlightRegion, selectedItem]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner - Clean Minimal Style */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-2">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
            <BarChart3 className="w-5 h-5 text-amber-600" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              {data.regions.length}개 시도교육청 세출예산 현황 비교
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                지방교육재정알리미 Open API
              </span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              지방교육재정알리미 자료로 정책사업별 세출예산을 교육청끼리 견줍니다. 우리 교육청이 어디쯤인지 확인해 보세요.
            </p>
          </div>
        </div>
      </div>

      {/* Control Panel Bar */}
      <div className="bg-white rounded-lg shadow-xs border border-slate-200 p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Item Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-amber-600" /> 세출예산 항목 선택
          </label>
          <select
            value={selectedItem}
            onChange={(e) => setSelectedItem(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-semibold text-slate-800 focus:ring-1 focus:ring-amber-500"
          >
            <option value="세출예산액">세출예산액 (총액)</option>
            {data.policy_items.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {/* Year Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-blue-600" /> 회계 연도
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-semibold text-slate-800 focus:ring-1 focus:ring-blue-500"
          >
            {data.years.map((y) => (
              <option key={y} value={y}>
                {y}년도 예산
              </option>
            ))}
          </select>
        </div>

        {/* Highlight Region Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-blue-600" /> 우리 교육청 강조 선택
          </label>
          <select
            value={highlightRegion}
            onChange={(e) => setHighlightRegion(e.target.value)}
            className="w-full text-xs bg-blue-50/60 border border-blue-200 rounded-lg p-2.5 font-bold text-blue-900 focus:ring-1 focus:ring-blue-500"
          >
            {regionOptions.map((reg) => (
              <option key={reg} value={reg}>
                {fullOfficeName(reg)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Rank Highlight KPI Box */}
      {highlightedRankInfo && (
        <div className="bg-slate-900 text-white rounded-lg p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xl border border-amber-500/30 tabular-nums">
              #{highlightedRankInfo.rank}
            </div>
            <div>
              <div className="text-xs text-slate-400">
                {selectedYear}년 {selectedItem} 기준
              </div>
              <h4 className="text-base font-bold text-white">
                <span className="text-amber-400">{fullOfficeName(highlightRegion)}</span>은 전국{' '}
                {highlightedRankInfo.total}개 교육청 중{' '}
                <strong className="text-amber-300 underline underline-offset-4 font-bold">
                  {highlightedRankInfo.rank}위
                </strong>{' '}
                입니다.
              </h4>
            </div>
          </div>

          <div className="bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-700 text-right">
            <span className="text-[11px] text-slate-400 block font-medium">해당 항목 예산액</span>
            <span className="text-lg font-bold text-amber-400 tabular-nums">
              {formatAmount(highlightedRankInfo.row.amount)}
            </span>
          </div>
        </div>
      )}

      {/* Chart Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Regional Comparison Bar Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-lg p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              {selectedYear}년 전국 시도교육청 [{selectedItem}] 예산 순위
            </h4>
            <span className="text-xs text-slate-500 tabular-nums">단위: 원</span>
          </div>

          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRows} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6e8ea" />
                <XAxis dataKey="region" tick={{ fontSize: 11, fill: '#58616a' }} interval={0} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6d7882' }}
                  width={64}
                  // 자동 범위로 두면 축 최대가 실제 최댓값보다 훨씬 크게 잡혀
                  // 막대가 바닥에 깔린다. 최댓값을 직접 계산해 넣는다.
                  domain={[0, maxAmount * 1.08]}
                  allowDataOverflow={false}
                  tickFormatter={tickWon}
                />
                <Tooltip
                  formatter={(val: number) => [`${formatAmount(val)} (${Math.round(val / 100_000_000).toLocaleString()}억)`, '예산액']}
                  labelFormatter={(lbl) => fullOfficeName(String(lbl))}
                  contentStyle={{ borderRadius: '8px', borderColor: '#cdd1d5', fontSize: '13px' }}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {chartRows.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.region === highlightRegion ? '#d63d4a' : '#256ef4'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Multi-year Trend Chart (1 col) */}
        <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-xs space-y-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              {fullOfficeName(highlightRegion)} 연도별 추이
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">[{selectedItem}] 항목 예산 변동</p>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e8ea" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#58616a' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6d7882' }} width={64} tickFormatter={tickEok} />
                <Tooltip
                  formatter={(val: number) => [`${(val / 10000).toFixed(2)}조 원 (${val.toLocaleString()}억)`, '예산액']}
                  contentStyle={{ borderRadius: '8px', borderColor: '#cdd1d5', fontSize: '13px' }}
                />
                <Line type="monotone" dataKey="amount" stroke="#256ef4" strokeWidth={2.5} dot={{ r: 4, fill: '#256ef4' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Data Table */}
      <div className="bg-white rounded-lg border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800">
            {selectedYear}년도 시도교육청 세출예산 상세 비교표 ({selectedItem})
          </h4>
          <span className="text-[11px] text-slate-500">출처: 지방교육재정알리미</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-16 text-center">순위</th>
                <th className="py-3 px-4">교육청</th>
                <th className="py-3 px-4">기관코드</th>
                <th className="py-3 px-4 text-right">예산 금액</th>
                <th className="py-3 px-4 text-center">강조 선택</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {currentYearRows.map((row, idx) => {
                const isHighlight = row.region === highlightRegion;
                return (
                  <tr
                    key={row.region}
                    className={`hover:bg-slate-50 transition ${
                      isHighlight ? 'bg-amber-50/70 font-bold text-amber-950' : 'text-slate-800'
                    }`}
                  >
                    <td className="py-3 px-4 text-center font-bold">
                      <span
                        className={`inline-block w-6 h-6 rounded-full text-center leading-6 text-[11px] ${
                          idx === 0
                            ? 'bg-amber-500 text-white font-bold'
                            : idx === 1
                            ? 'bg-slate-300 text-slate-800 font-bold'
                            : idx === 2
                            ? 'bg-amber-700/80 text-white font-bold'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold">{row.region}특별시·도교육청</td>
                    <td className="py-3 px-4 tabular-nums text-slate-400">{row.region_code}</td>
                    <td className="py-3 px-4 text-right font-bold text-indigo-700">
                      {formatAmount(row.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setHighlightRegion(row.region)}
                        className={`px-2.5 py-1 text-[11px] rounded-lg transition font-semibold ${
                          isHighlight
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {isHighlight ? '선택됨' : '선택'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
