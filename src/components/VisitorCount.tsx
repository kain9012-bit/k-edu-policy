import React, { useEffect, useState } from 'react';

/**
 * 방문자 수. GoatCounter의 공개 카운터를 읽어 온다.
 * 사이트 설정에서 'Allow adding visitor counts on your website'를 켜야 값이 온다.
 * 응답은 최대 4시간까지 캐시되므로 오늘 수치는 조금 늦게 반영된다.
 * 값을 못 읽으면 아무것도 그리지 않는다 — 통계가 없다고 화면이 망가질 이유는 없다.
 */
const GOATCOUNTER = 'https://k-edu-policy.goatcounter.com';

export const VisitorCount: React.FC = () => {
  const [total, setTotal] = useState<string | null>(null);
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    const d = new Date();
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;

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
    read(`?start=${ymd}`, setToday);
  }, []);

  if (!total) return null;

  return (
    <p className="tabular-nums">
      오늘 <strong className="font-bold text-slate-900">{today ?? '-'}</strong>명 · 누적{' '}
      <strong className="font-bold text-slate-900">{total}</strong>명
    </p>
  );
};
