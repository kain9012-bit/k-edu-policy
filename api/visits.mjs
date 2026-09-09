// 방문 수(이번 주·누적)를 GoatCounter API에서 읽어 돌려준다.
//
// 왜 서버 함수를 거치는가:
//   공개 카운터(/counter/….json)는 응답을 최대 네 시간까지 캐시한다.
//   아침에 들어온 방문이 한참 뒤에야 화면에 반영돼 0이 오래 붙어 있었다.
//   API는 그런 지연이 없지만 토큰이 필요하고, 토큰을 화면 코드에 둘 수는 없다.
//   그래서 이 함수가 토큰을 들고 대신 읽어 준다.
//
// 환경변수(Vercel → Settings → Environment Variables):
//   GOATCOUNTER_API_TOKEN  발급받은 토큰. 권한은 Read statistics 하나면 된다.
//   GOATCOUNTER_SITE       https://k-edu-policy.goatcounter.com (없으면 아래 기본값)

const SITE = (process.env.GOATCOUNTER_SITE || 'https://k-edu-policy.goatcounter.com').replace(/\/+$/, '');
const TOKEN = process.env.GOATCOUNTER_API_TOKEN;

// 누적의 시작점. 이 서비스는 2026년에 열었으므로 그 이전으로 잡아 두면 된다.
const SINCE = '2026-01-01T00:00:00Z';
const CACHE_MS = 60_000;

let cached = null;
let cachedAt = 0;

/** 이번 주 월요일 0시(한국 시간)를 UTC 문자열로. 주는 월요일에 시작해 일요일에 끝난다. */
function mondayUtc(now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 3600_000);
  const day = (kst.getUTCDay() + 6) % 7;            // 일요일(0)을 그 주의 마지막 날로 본다
  const monday = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() - day));
  return new Date(monday.getTime() - 9 * 3600_000).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** 주어진 시점 이후의 '/' 경로 조회수. 이 서비스는 주소가 '/' 하나라 그게 곧 방문 수다. */
async function total(start) {
  const url = new URL(`${SITE}/api/v0/stats/total`);
  url.searchParams.set('start', start);
  url.searchParams.set('include_paths', '/');
  url.searchParams.set('path_by_name', 'true');
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error(`goatcounter ${response.status}`);
  return Number((await response.json()).total ?? 0);
}

function json(body, status = 200, cacheSeconds = 0) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cacheSeconds
        ? `public, s-maxage=${cacheSeconds}, stale-while-revalidate=300`
        : 'no-store',
    },
  });
}

export async function GET() {
  if (!TOKEN) return json({ error: 'GOATCOUNTER_API_TOKEN이 없습니다.' }, 503);
  if (cached && Date.now() - cachedAt < CACHE_MS) return json(cached, 200, 60);
  try {
    const [all, week] = await Promise.all([total(SINCE), total(mondayUtc())]);
    cached = { total: all, week, updatedAt: new Date().toISOString() };
    cachedAt = Date.now();
    return json(cached, 200, 60);
  } catch (error) {
    return json({ error: error.message }, 502);
  }
}
