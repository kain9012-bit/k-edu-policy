import React, { useEffect, useState } from 'react';

/**
 * 방문자 수. GoatCounter의 공개 카운터를 읽어 온다.
 * 사이트 설정에서 'Allow adding visitor counts on your website'를 켜야 값이 온다.
 *
 * 하루 단위가 아니라 주 단위로 보여 준다.
 * 카운터 응답이 최대 4시간까지 캐시돼서, '오늘'로 두면 아침에 들어온 방문이
 * 한참 뒤에야 반영돼 0이 오래 붙어 있었다. 주 단위면 그 시차가 묻힌다.
 *
 * 값을 못 읽으면 아무것도 그리지 않는다 — 통계가 없다고 화면이 망가질 이유는 없다.
 */
const GOATCOUNTER = 'https://k-edu-policy.goatcounter.com';

/** 이번 주 월요일. 주는 월요일에 시작해 일요일에 끝난다. */
function mondayOfThisWeek(now = new Date()): string {
  const d = new Date(now);
  // getDay()는 일요일이 0이다. 일요일을 그 주의 마지막 날로 보려면 6일을 되돌려야 한다.
  const backToMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - backToMonday);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export const VisitorCount: React.FC = () => {
  const [total, setTotal] = useState<string | null>(null);
  const [week, setWeek] = useState<string | null>(null);

  useEffect(() => {
    // 특수 경로 TOTAL 은 0만 돌려주고 실제 값이 안 담긴다(확인함).
    // 이 서비스는 주소가 '/' 하나로 고정된 화면이라(탭은 주소를 바꾸지 않는다)
    // '/' 의 조회수가 곧 사이트 전체 방문수다.
    const read = async (query: string, apply: (v: string) => void) => {
      try {
        const res = await fetch(`${GOATCOUNTER}/counter/%2F.json${query}`);
        if (!res.ok) return;
        const json = await res.json();
        if (typeof json.count === 'string') apply(json.count);
      } catch {
        /* 통계는 있으면 좋고 없어도 그만이다 */
      }
    };

    read('', setTotal);
    read(`?start=${mondayOfThisWeek()}`, setWeek);
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
