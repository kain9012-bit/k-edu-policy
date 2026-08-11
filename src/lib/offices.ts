/**
 * 시도교육청 표시 순서.
 *
 * 가나다순으로 두면 '강원 · 경기 · 경남 …'처럼 정부 문서에서 쓰는 순서와 어긋난다.
 * 행정구역 순서(특별시 → 광역시 → 특별자치시 → 도)를 따른다.
 */
export const OFFICE_ORDER = [
  // 전남광주통합특별시는 특별시라 서울 다음에 온다.
  '서울', '전남광주', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
  '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
] as const;

/** 짧은 이름 · 정식 명칭 · 영문 키를 모두 같은 자리로 모으기 위한 별칭 */
const ALIASES: Record<string, string[]> = {
  서울: ['서울', 'seoul'],
  전남광주: ['전남광주', '통합특별시', 'jeonnamgwangju'],
  부산: ['부산', 'busan'],
  대구: ['대구', 'daegu'],
  인천: ['인천', 'incheon'],
  광주: ['광주', 'gwangju'],
  대전: ['대전', 'daejeon'],
  울산: ['울산', 'ulsan'],
  세종: ['세종', 'sejong'],
  경기: ['경기', 'gyeonggi'],
  강원: ['강원', 'gangwon'],
  충북: ['충북', '충청북도', 'chungbuk'],
  충남: ['충남', '충청남도', 'chungnam'],
  전북: ['전북', 'jeonbuk'],
  전남: ['전남', '전라남도', 'jeonnam'],
  경북: ['경북', '경상북도', 'gyeongbuk'],
  경남: ['경남', '경상남도', 'gyeongnam'],
  제주: ['제주', 'jeju'],
};

/**
 * 교육청 이름의 순서 값. 못 알아보면 맨 뒤로 보낸다.
 * '경남', '경상남도교육청', 'gyeongnam' 모두 같은 값을 돌려준다.
 */
export function officeRank(name: string): number {
  const s = (name || '').toLowerCase();
  for (let i = 0; i < OFFICE_ORDER.length; i++) {
    const key = OFFICE_ORDER[i];
    // '전남광주통합특별시'가 '광주'나 '전남'으로 잡히지 않도록
    // 목록에서 더 앞선 자리(전남광주)를 먼저 확인한다.
    if (ALIASES[key].some((a) => s.includes(a.toLowerCase()))) return i;
  }
  return OFFICE_ORDER.length;
}

/**
 * 어떤 표기로 들어와도 약칭으로 바꾼다.
 * '경상남도교육청' · 'gyeongnam' · '경남' → '경남'
 * 알아보지 못하면 '교육청'만 떼고 원래 이름을 돌려준다.
 */
export function shortOfficeName(name: string): string {
  const rank = officeRank(name);
  if (rank < OFFICE_ORDER.length) return OFFICE_ORDER[rank];
  return (name || '').replace(/교육청$/, '');
}

/**
 * 정식 명칭. 약칭에 '교육청'을 그냥 붙이면
 * '경기교육청' · '강원교육청'처럼 실제로 없는 이름이 된다.
 */
const FULL_NAMES: Record<string, string> = {
  서울: '서울특별시교육청',
  전남광주: '전남광주통합특별시교육청',
  부산: '부산광역시교육청',
  대구: '대구광역시교육청',
  인천: '인천광역시교육청',
  광주: '광주광역시교육청',
  대전: '대전광역시교육청',
  울산: '울산광역시교육청',
  세종: '세종특별자치시교육청',
  경기: '경기도교육청',
  강원: '강원특별자치도교육청',
  충북: '충청북도교육청',
  충남: '충청남도교육청',
  전북: '전북특별자치도교육청',
  전남: '전라남도교육청',
  경북: '경상북도교육청',
  경남: '경상남도교육청',
  제주: '제주특별자치도교육청',
};

/**
 * 어떤 표기로 들어와도 정식 명칭으로 바꾼다.
 * '경기' · 'gyeonggi' · '경기도교육청' → '경기도교육청'
 */
export function fullOfficeName(name: string): string {
  const rank = officeRank(name);
  if (rank < OFFICE_ORDER.length) return FULL_NAMES[OFFICE_ORDER[rank]];
  return name || '';
}

/** 교육청 목록을 정식 순서로 정렬한다(원본 배열은 건드리지 않는다). */
export function sortOffices<T>(items: T[], key: (item: T) => string): T[] {
  return [...items].sort((a, b) => {
    const d = officeRank(key(a)) - officeRank(key(b));
    return d !== 0 ? d : key(a).localeCompare(key(b), 'ko');
  });
}
