import React, { useState, useMemo, useEffect } from 'react';
import { BudgetData, BudgetRow } from '../types';
import { sortOffices, fullOfficeName } from '../lib/offices';
import { buildItemGroups, budgetItemLevel } from '../lib/budgetItems';
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
  CartesianGrid,
  PieChart,
  Pie
} from 'recharts';

/** 좁은 화면인지. 시도 17곳을 가로로 늘어놓으면 이름이 겹쳐서 세로로 눕힌다. */
function useNarrowScreen() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return narrow;
}

/** 예산 구성 도넛·범례에 쓰는 색. 순서가 곧 비중 순서다. */
const PIE_COLORS = ['#256ef4', '#1c589c', '#8a949e', '#b1b8be', '#cdd1d5'];

interface BudgetTabProps {
  data: BudgetData;
}

export const BudgetTab: React.FC<BudgetTabProps> = ({ data }) => {
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedItem, setSelectedItem] = useState<string>('세출예산액');
  const [highlightRegion, setHighlightRegion] = useState<string>('전북');
  // 추이를 금액으로 볼지 비중으로 볼지
  const [trendMode, setTrendMode] = useState<'amount' | 'share'>('amount');
  const narrow = useNarrowScreen();

  // 정책사업(상위)과 그 아래 단위사업을 묶어서 보여준다.
  // 섞어서 나열하면 '인건비'와 '교육복지'처럼 층위가 다른 것을 나란히 비교하게 된다.
  // 계층은 데이터에 실려 오지만, 아직 갱신 전이면 lib의 기준값을 쓴다.
  const itemGroups = useMemo(() => buildItemGroups(data), [data]);
  const selectedLevel = useMemo(() => budgetItemLevel(selectedItem, data), [selectedItem, data]);

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

  // 총액 대비 비중. 금액만 보면 교육청 규모에 좌우돼 '많이 쓰는지'를 알 수 없다.
  // 예) 전북 교수학습활동지원은 금액 4위지만 비중은 8.2%로 전국 1위다.
  const shareInfo = useMemo(() => {
    const total = data.item_levels?.total ?? '세출예산액';
    if (selectedItem === total) return null;

    const totals = new Map<string, number>();
    for (const r of data.rows) {
      if (r.year === selectedYear && r.item === total) totals.set(r.region, r.amount);
    }
    const shares: { region: string; share: number }[] = [];
    for (const r of currentYearRows) {
      const t = totals.get(r.region);
      if (t) shares.push({ region: r.region, share: (r.amount / t) * 100 });
    }
    if (!shares.length) return null;

    const sorted = [...shares].sort((a, b) => b.share - a.share);
    const avg = shares.reduce((n, x) => n + x.share, 0) / shares.length;
    const mineIdx = sorted.findIndex((x) => x.region === highlightRegion);

    return {
      avg,
      top: sorted[0],
      bottom: sorted[sorted.length - 1],
      mine: mineIdx >= 0 ? { ...sorted[mineIdx], rank: mineIdx + 1 } : null,
      total: shares.length,
      byRegion: new Map(shares.map((x) => [x.region, x.share])),
    };
  }, [data.rows, data.item_levels, selectedItem, selectedYear, currentYearRows, highlightRegion]);

  const TOTAL_ITEM = data.item_levels?.total ?? '세출예산액';
  const unitItems = useMemo(
    () => Object.values(data.item_levels?.children ?? {}).flat() as string[],
    [data.item_levels]
  );

  /** (연도, 교육청) → 항목별 금액 */
  const amountAt = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of data.rows) m.set(`${r.year}|${r.region}|${r.item}`, r.amount);
    return (year: number, region: string, item: string) => m.get(`${year}|${region}|${item}`) ?? 0;
  }, [data.rows]);

  // ① 우리 교육청 예산이 어떻게 쪼개지는지. 항목을 하나씩 고르지 않아도 전체 그림이 보인다.
  const composition = useMemo(() => {
    const total = amountAt(selectedYear, highlightRegion, TOTAL_ITEM);
    if (!total) return null;
    const parts = (data.policy_items ?? [])
      .map((item) => ({ item, amount: amountAt(selectedYear, highlightRegion, item) }))
      .filter((x) => x.amount > 0)
      .sort((a, b) => b.amount - a.amount);
    return { total, parts };
  }, [amountAt, selectedYear, highlightRegion, data.policy_items, TOTAL_ITEM]);

  // ③ 전년 대비 크게 늘거나 준 항목. 항목을 하나씩 눌러보지 않아도 먼저 짚어준다.
  const bigChanges = useMemo(() => {
    const prevYear = selectedYear - 1;
    if (!data.years.includes(prevYear)) return null;
    const list = [...(data.policy_items ?? []), ...unitItems]
      .map((item) => {
        const before = amountAt(prevYear, highlightRegion, item);
        const after = amountAt(selectedYear, highlightRegion, item);
        // 규모가 아주 작은 항목은 몇 %가 튀어도 뜻이 없다
        if (before < 1e10) return null;
        return { item, before, after, rate: (after / before - 1) * 100 };
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
      .sort((a, b) => b.rate - a.rate);
    if (!list.length) return null;
    return {
      prevYear,
      up: list.filter((x) => x.rate > 3).slice(0, 3),
      down: list.filter((x) => x.rate < -3).slice(-3).reverse(),
    };
  }, [data.years, data.policy_items, unitItems, amountAt, selectedYear, highlightRegion]);

  // 연도별 추이. 금액과 비중을 같은 차트에서 바꿔 볼 수 있게 둘 다 담는다.
  // 비중은 전국 평균도 함께 그려야 '많이 쓰는지'가 판단된다.
  const trendData = useMemo(() => {
    return data.years
      .map((y) => {
        const amount = amountAt(y, highlightRegion, selectedItem);
        const mineTotal = amountAt(y, highlightRegion, TOTAL_ITEM);
        const share = mineTotal ? (amount / mineTotal) * 100 : 0;
        const each = data.regions
          .map((r) => {
            const t = amountAt(y, r, TOTAL_ITEM);
            return t ? (amountAt(y, r, selectedItem) / t) * 100 : null;
          })
          .filter((v): v is number => v !== null && v > 0);
        const avgShare = each.length ? each.reduce((n, v) => n + v, 0) / each.length : 0;
        return {
          year: `${y}년`,
          amount: Math.round(amount / 100_000_000),   // 억 원
          share: +share.toFixed(1),
          avgShare: +avgShare.toFixed(1),
          formatted: amount ? formatAmount(amount) : '데이터 없음',
        };
      })
      .filter((d) => d.amount > 0);
  }, [data.years, data.regions, amountAt, highlightRegion, selectedItem, TOTAL_ITEM]);

  const trendFirst = trendData[0];
  const trendLast = trendData[trendData.length - 1];

  return (
    <div className="space-y-6 pb-12">
      {/* 조건 고르는 영역. 홈의 검색 띠와 같은 방식으로 화면 폭을 채워
          아래 결과와 경계로 구분한다. */}
      <section
        className="relative left-1/2 w-screen -translate-x-1/2 -mt-6 py-6
                   bg-blue-50 border-b border-blue-100"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        {/* 탭 소제목 — 세 탭이 같은 크기·굵기를 쓴다 */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight flex items-center gap-2 sm:gap-2.5">
            <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 shrink-0" aria-hidden="true" />
            세출예산 비교
          </h2>
          <p className="text-sm text-slate-500">
            지방교육재정알리미 · {data.regions.length}개 시도교육청
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Item Selector */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-slate-400" /> 세출예산 항목
            {selectedLevel && (
              <span className="ml-1 font-medium text-slate-400">· {selectedLevel}</span>
            )}
          </label>
          <select
            value={selectedItem}
            onChange={(e) => setSelectedItem(e.target.value)}
            className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 font-medium text-slate-800 focus:ring-1 focus:ring-blue-500"
          >
            <option value="세출예산액">세출예산액 (총액)</option>
            {itemGroups.map(({ policy, children }) => (
              <optgroup key={policy} label={policy}>
                <option value={policy}>{policy}</option>
                {children.map((c) => (
                  <option key={c} value={c}>
                    {'\u00A0\u00A0'}└ {c}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Year Selector */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" /> 회계 연도
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 font-medium text-slate-800 focus:ring-1 focus:ring-blue-500"
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
          <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-slate-400" /> 우리 교육청 강조 선택
          </label>
          <select
            value={highlightRegion}
            onChange={(e) => setHighlightRegion(e.target.value)}
            className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 font-medium text-slate-800 focus:ring-1 focus:ring-blue-500"
          >
            {regionOptions.map((reg) => (
              <option key={reg} value={reg}>
                {fullOfficeName(reg)}
              </option>
            ))}
          </select>
        </div>
        </div>
        </div>
      </section>

      {/* ① 예산 구성 한눈에 · ③ 급증·급감 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {composition && (
          <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-3">
            <div>
              <h4 className="text-base font-bold text-slate-900">
                {fullOfficeName(highlightRegion)} 예산은 이렇게 쪼개집니다
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedYear}년 세출예산 {formatAmount(composition.total)}
              </p>
            </div>

            {/* 왼쪽 도넛, 오른쪽 항목 목록 */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative w-52 h-52 shrink-0 pointer-events-none">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={composition.parts.map((p) => ({ name: p.item, value: p.amount }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={94}
                      paddingAngle={1}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {composition.parts.map((p, i) => (
                        <Cell key={p.item} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* 가운데에 총액을 둔다 */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[11px] text-slate-400 font-medium">세출예산</span>
                  <span className="text-sm font-bold text-slate-900 tabular-nums">
                    {formatAmount(composition.total)}
                  </span>
                </div>
              </div>

              <ul className="flex-1 w-full space-y-1.5">
                {composition.parts.map((p, i) => (
                  <li key={p.item} className="flex items-center gap-2 text-sm">
                    <span
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedItem(p.item)}
                      className="flex-1 text-left text-slate-700 hover:text-blue-700 hover:underline"
                    >
                      {p.item}
                    </button>
                    <span className="tabular-nums text-slate-500">{formatAmount(p.amount)}</span>
                    <span className="tabular-nums font-bold text-slate-900 w-14 text-right">
                      {((p.amount / composition.total) * 100).toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {bigChanges && (bigChanges.up.length > 0 || bigChanges.down.length > 0) && (
          <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-3">
            <div>
              <h4 className="text-base font-bold text-slate-900">전년 대비 크게 달라진 항목</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {bigChanges.prevYear}년 → {selectedYear}년 · 100억 미만 항목은 뺐습니다
              </p>
            </div>

            <div className="space-y-3">
              {[
                { label: '늘어난 곳', rows: bigChanges.up, up: true },
                { label: '줄어든 곳', rows: bigChanges.down, up: false },
              ].map(({ label, rows, up }) =>
                rows.length ? (
                  <div key={label} className="space-y-1.5">
                    <p className="text-xs font-bold text-slate-500">{label}</p>
                    {rows.map((c) => (
                      <div key={c.item} className="flex items-center gap-2 text-sm">
                        <span className={`font-bold shrink-0 ${up ? 'text-emerald-600' : 'text-red-500'}`}>
                          {up ? '▲' : '▼'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedItem(c.item)}
                          className="flex-1 text-left text-slate-700 hover:text-blue-700 hover:underline"
                        >
                          {c.item}
                        </button>
                        <span className="text-xs text-slate-400 tabular-nums">
                          {formatAmount(c.before)} → {formatAmount(c.after)}
                        </span>
                        <span
                          className={`tabular-nums font-bold w-16 text-right ${
                            up ? 'text-emerald-600' : 'text-red-500'
                          }`}
                        >
                          {c.rate > 0 ? '+' : ''}
                          {c.rate.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null
              )}
            </div>
          </div>
        )}
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

          <div className="flex items-stretch gap-2 shrink-0">
            <div className="bg-slate-800 px-4 py-2.5 rounded-lg border border-slate-700 text-right">
              <span className="text-xs text-slate-400 block font-medium">해당 항목 예산액</span>
              <span className="text-lg font-bold text-amber-400 tabular-nums">
                {formatAmount(highlightedRankInfo.row.amount)}
              </span>
            </div>

            {/* 금액 순위는 교육청 규모에 좌우된다. 총액 대비 비중이 '많이 쓰는지'를 말해준다. */}
            {shareInfo?.mine && (
              <div className="bg-slate-800 px-4 py-2.5 rounded-lg border border-slate-700 text-right">
                <span className="text-xs text-slate-400 block font-medium">
                  총액 대비 비중 · 비중 {shareInfo.mine.rank}위
                </span>
                <span className="text-lg font-bold text-white tabular-nums">
                  {shareInfo.mine.share.toFixed(1)}%
                </span>
                <span
                  className={`ml-1.5 text-xs font-bold tabular-nums ${
                    shareInfo.mine.share >= shareInfo.avg ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  전국평균 {shareInfo.avg.toFixed(1)}%
                  {' '}({shareInfo.mine.share >= shareInfo.avg ? '+' : ''}
                  {(shareInfo.mine.share - shareInfo.avg).toFixed(1)}%p)
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 비중 요약 — 금액 순위만으로는 안 보이는 것 */}
      {shareInfo?.mine && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-slate-700 leading-relaxed">
          <strong className="font-bold text-slate-900">{fullOfficeName(highlightRegion)}</strong>은
          세출예산의 <strong className="font-bold text-blue-700">{shareInfo.mine.share.toFixed(1)}%</strong>를
          {' '}<strong className="font-bold text-slate-900">{selectedItem}</strong>에 씁니다.
          전국 평균은 {shareInfo.avg.toFixed(1)}%로,{' '}
          {Math.abs(shareInfo.mine.share - shareInfo.avg) < 0.05 ? (
            '평균과 비슷합니다.'
          ) : (
            <>
              평균보다{' '}
              <strong className="font-bold text-slate-900">
                {Math.abs(shareInfo.mine.share - shareInfo.avg).toFixed(1)}%p{' '}
                {shareInfo.mine.share > shareInfo.avg ? '높습니다' : '낮습니다'}
              </strong>
              . (비중 {shareInfo.mine.rank}위 / {shareInfo.total}곳)
            </>
          )}
          <span className="block text-xs text-slate-500 mt-1.5">
            가장 높은 곳 {shareInfo.top.region} {shareInfo.top.share.toFixed(1)}% ·
            가장 낮은 곳 {shareInfo.bottom.region} {shareInfo.bottom.share.toFixed(1)}%
          </span>
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

          <div
            className="w-full pt-2"
            style={{ height: narrow ? Math.max(280, chartRows.length * 26 + 40) : 320 }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartRows}
                layout={narrow ? 'vertical' : 'horizontal'}
                margin={
                  narrow
                    ? { top: 4, right: 16, left: 4, bottom: 4 }
                    : { top: 10, right: 10, left: 10, bottom: 25 }
                }
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={narrow}
                  horizontal={!narrow}
                  stroke="#e6e8ea"
                />
                {narrow ? (
                  <>
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: '#6d7882' }}
                      domain={[0, maxAmount * 1.08]}
                      tickFormatter={tickWon}
                    />
                    <YAxis
                      type="category"
                      dataKey="region"
                      tick={{ fontSize: 11, fill: '#58616a' }}
                      width={44}
                      interval={0}
                    />
                  </>
                ) : (
                  <>
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
                  </>
                )}
                <Tooltip
                  formatter={(val: number) => [`${formatAmount(val)} (${Math.round(val / 100_000_000).toLocaleString()}억)`, '예산액']}
                  labelFormatter={(lbl) => fullOfficeName(String(lbl))}
                  contentStyle={{ borderRadius: '8px', borderColor: '#cdd1d5', fontSize: '13px' }}
                />
                <Bar dataKey="amount" radius={narrow ? [0, 4, 4, 0] : [4, 4, 0, 0]} isAnimationActive={false}>
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
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                {fullOfficeName(highlightRegion)} 연도별 추이
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">[{selectedItem}] 항목</p>
            </div>

            {/* 금액은 규모, 비중은 우선순위를 보여준다. 같은 차트에서 바꿔 본다. */}
            <div className="inline-flex rounded-md border border-slate-300 overflow-hidden text-xs shrink-0">
              {([
                ['amount', '금액'],
                ['share', '비중'],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTrendMode(mode)}
                  aria-pressed={trendMode === mode}
                  className={`px-3 py-1.5 font-bold transition-colors ${
                    trendMode === mode ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {trendFirst && trendLast && (
            <p className="text-xs text-slate-600">
              {trendMode === 'amount' ? (
                <>
                  {trendFirst.year} {tickEok(trendFirst.amount)} → {trendLast.year}{' '}
                  <strong className="font-bold text-slate-900">{tickEok(trendLast.amount)}</strong>
                  <span
                    className={`ml-1.5 font-bold tabular-nums ${
                      trendLast.amount >= trendFirst.amount ? 'text-emerald-600' : 'text-red-500'
                    }`}
                  >
                    ({trendLast.amount >= trendFirst.amount ? '+' : ''}
                    {(((trendLast.amount - trendFirst.amount) / trendFirst.amount) * 100).toFixed(1)}%)
                  </span>
                </>
              ) : (
                <>
                  {trendFirst.year} {trendFirst.share}% → {trendLast.year}{' '}
                  <strong className="font-bold text-slate-900">{trendLast.share}%</strong>
                  <span
                    className={`ml-1.5 font-bold tabular-nums ${
                      trendLast.share >= trendFirst.share ? 'text-emerald-600' : 'text-red-500'
                    }`}
                  >
                    ({trendLast.share >= trendFirst.share ? '+' : ''}
                    {(trendLast.share - trendFirst.share).toFixed(1)}%p)
                  </span>
                  <span className="text-slate-400"> · 전국 평균 {trendLast.avgShare}%</span>
                </>
              )}
            </p>
          )}

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e8ea" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#58616a' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6d7882' }}
                  width={64}
                  domain={trendMode === 'share' ? ['dataMin - 3', 'dataMax + 3'] : undefined}
                  tickFormatter={(v) =>
                    trendMode === 'share' ? `${Number(v).toFixed(0)}%` : tickEok(Number(v))
                  }
                />
                <Tooltip
                  formatter={(val: number, name: string) =>
                    trendMode === 'share'
                      ? [`${val}%`, name === 'share' ? fullOfficeName(highlightRegion) : '전국 평균']
                      : [`${(val / 10000).toFixed(2)}조 원 (${val.toLocaleString()}억)`, '예산액']
                  }
                  contentStyle={{ borderRadius: '8px', borderColor: '#cdd1d5', fontSize: '13px' }}
                />
                {trendMode === 'share' && (
                  <Line type="monotone" dataKey="avgShare" stroke="#b1b8be" strokeWidth={2}
                        strokeDasharray="4 4" dot={{ r: 3, fill: '#b1b8be' }} isAnimationActive={false} />
                )}
                <Line
                  type="monotone"
                  dataKey={trendMode === 'share' ? 'share' : 'amount'}
                  stroke="#256ef4"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#256ef4' }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {trendMode === 'share' && (
            <p className="text-xs text-slate-500">
              <span className="inline-block w-3 h-0.5 bg-blue-600 align-middle mr-1" />
              {fullOfficeName(highlightRegion)}
              <span className="inline-block w-3 h-0.5 bg-slate-300 align-middle ml-3 mr-1" />
              전국 평균 · 비중이 오르면 다른 데 쓸 몫이 그만큼 줄어듭니다.
            </p>
          )}
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

        <p className="sm:hidden pb-2 text-[11px] text-slate-400">← 옆으로 밀어서 볼 수 있습니다</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-16 text-center">순위</th>
                <th className="py-3 px-4">교육청</th>
                <th className="py-3 px-4 text-right">예산 금액</th>
                <th className="py-3 px-4 text-right">총액 대비 비중</th>
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
                    <td className="py-3 px-4 font-bold">{fullOfficeName(row.region)}</td>
                    <td className="py-3 px-4 text-right font-bold text-indigo-700 tabular-nums">
                      {formatAmount(row.amount)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      {(() => {
                        const sh = shareInfo?.byRegion.get(row.region);
                        if (sh === undefined) return <span className="text-slate-300">—</span>;
                        const gap = sh - (shareInfo?.avg ?? 0);
                        return (
                          <>
                            <span className="font-bold text-slate-900">{sh.toFixed(1)}%</span>
                            <span
                              className={`ml-1.5 text-xs font-medium ${
                                gap >= 0 ? 'text-emerald-600' : 'text-red-500'
                              }`}
                            >
                              {gap >= 0 ? '+' : ''}
                              {gap.toFixed(1)}%p
                            </span>
                          </>
                        );
                      })()}
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
