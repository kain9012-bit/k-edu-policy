import React, { useEffect, useState } from 'react';

/**
 * 방문 수(이번 주·누적).
 *
 * 두 갈래로 읽는다.
 *   1) /api/visits — 서버 함수가 GoatCounter API를 읽어 준다. 지연이 거의 없다.
 *   2) 실패하면 공개 카운터. 토큰 없이 읽히지만 응답이 최대 네 시간까지 캐시된다.
 *
 * 하루가 아니라 주 단위로 보여 준다. '오늘'로 두면 캐시 탓에 0이 오래 붙어 있었고,
 * 주 단위면 그 시차가 묻힌다. 주는 월요일에 시작해 일요일에 끝난다.
 *
 * 값을 못 읽으면 아무것도 그리지 않는다 — 통계가 없다고 화면이 망가질 이유는 없다.
 */
const GOATCOUNTER = 'https://k-edu-policy.goatcounter.com';

/** 이번 주 월요일 (YYYY-MM-DD) */
function mondayOfThisWeek(now = new Date()): string {
  const d = new Date(now);
  // getDay()는 일요일이 0이다. 일요일을 그 주의 마지막 날로 보려면 6일을 되돌린다.
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

const format = (v: number | string) =>
  typeof v === 'number' ? v.toLocaleString('ko-KR') : v;

export const VisitorCount: React.FC = () => {
  const [total, setTotal] = useState<string | null>(null);
  const [week, setWeek] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    /** 예비 경로: 공개 카운터. 특수 경로 TOTAL 은 0만 돌려주므로 '/' 를 직접 읽는다. */
    const readPublicCounter = async () => {
      const read = async (query: string) => {
        try {
          const res = await fetch(`${GOATCOUNTER}/counter/%2F.json${query}`);
          if (!res.ok) return null;
          const json = await res.json();
          return typeof json.count === 'string' ? json.count : null;
        } catch {
          return null;
        }
      };
      const [all, thisWeek] = await Promise.all([
        read(''),
        read(`?start=${mondayOfThisWeek()}`),
      ]);
      if (!alive || !all) return;
      setTotal(all);
      setWeek(thisWeek);
    };

    (async () => {
      try {
        const res = await fetch('/api/visits');
        if (res.ok) {
          const live = await res.json();
          if (typeof live.total === 'number') {
            if (!alive) return;
            setTotal(format(live.total));
            setWeek(typeof live.week === 'number' ? format(live.week) : null);
            return;
          }
        }
      } catch {
        /* 서버 함수가 없거나 막혔으면 아래로 넘어간다 */
      }
      await readPublicCounter();
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (!total) return null;

  return (
    // 단위를 붙이지 않는다. 주간 값은 다녀간 사람 수에 가깝지만
    // 누적 값은 날짜별 값을 더한 것이라, '명'이든 '회'든 한쪽은 틀린 말이 된다.
    <p className="tabular-nums">
      이번 주 방문 <strong className="font-bold text-slate-900">{week ?? '-'}</strong> · 누적{' '}
      <strong className="font-bold text-slate-900">{total}</strong>
    </p>
  );
};
