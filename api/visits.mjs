// 방문 수(오늘·누적)를 GoatCounter API에서 읽어 돌려준다.
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

// 값 끝에 공백이나 줄바꿈이 섞여 들어오는 일이 잦아 먼저 털어낸다.
const SITE = (process.env.GOATCOUNTER_SITE || 'https://k-edu-policy.goatcounter.com')
  .trim()
  .replace(/\/+$/, '');
const TOKEN = (process.env.GOATCOUNTER_API_TOKEN || '').trim();

// 누적의 시작점. 이 서비스는 2026년에 열었으므로 그 이전으로 잡아 두면 된다.
const SINCE = '2026-01-01T00:00:00Z';
const CACHE_MS = 60_000;

let cached = null;
let cachedAt = 0;

/** 오늘 0시(한국 시간)를 UTC 문자열로. 러너는 UTC라 그냥 자정을 쓰면 아홉 시간이 어긋난다. */
function todayUtc(now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 3600_000);
  const midnight = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate());
  return new Date(midnight - 9 * 3600_000).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

async function ask(url) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  });
  const text = await response.text();
  return { ok: response.ok, status: response.status, text };
}

/**
 * 주어진 시점 이후의 방문 수.
 *
 * 먼저 '/' 경로만 세어 본다. 이 서비스는 주소가 '/' 하나라 그게 곧 방문 수다.
 * 그런데 경로를 이름으로 찾는 방식은 그 이름이 아직 없으면 404가 난다.
 * 그때는 경로를 가리지 않고 사이트 전체로 다시 물어본다.
 */
async function total(start) {
  const withPath = new URL(`${SITE}/api/v0/stats/total`);
  withPath.searchParams.set('start', start);
  withPath.searchParams.set('include_paths', '/');
  withPath.searchParams.set('path_by_name', 'true');

  let r = await ask(withPath);
  let used = withPath;

  if (!r.ok && r.status === 404) {
    const whole = new URL(`${SITE}/api/v0/stats/total`);
    whole.searchParams.set('start', start);
    r = await ask(whole);
    used = whole;
  }

  if (!r.ok) {
    const err = new Error(`goatcounter ${r.status}`);
    err.detail = { url: used.toString(), body: r.text.slice(0, 200) };
    throw err;
  }
  return Number(JSON.parse(r.text).total ?? 0);
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
    const [all, today] = await Promise.all([total(SINCE), total(todayUtc())]);
    cached = { total: all, today, updatedAt: new Date().toISOString() };
    cachedAt = Date.now();
    return json(cached, 200, 60);
  } catch (error) {
    // 어디를 불렀는지 남긴다. 토큰은 담기지 않는다.
    return json({ error: error.message, ...(error.detail || {}) }, 502);
  }
}
