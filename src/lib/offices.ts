/**
 * 시도교육청 표시 순서.
 *
 * 가나다순으로 두면 '강원 · 경기 · 경남 …'처럼 정부 문서에서 쓰는 순서와 어긋난다.
 * 행정구역 순서(특별시 → 광역시 → 특별자치시 → 도)를 따른다.
 */
export const OFFICE_ORDER = [
  '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
  '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
] as const;

/** 짧은 이름 · 정식 명칭 · 영문 키를 모두 같은 자리로 모으기 위한 별칭 */
const ALIASES: Record<string, string[]> = {
  서울: ['서울', 'seoul'],
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
  // '전남광주통합특별시교육청'처럼 두 지역이 합쳐진 이름은 아직 실체가 없다.
  // '광주'로 먼저 잡혀 순서에 끼어들지 않도록 맨 뒤로 보낸다.
  if (s.includes('통합')) return OFFICE_ORDER.length;
  for (let i = 0; i < OFFICE_ORDER.length; i++) {
    const key = OFFICE_ORDER[i];
    // '전남광주통합…'처럼 두 지역명이 함께 든 이름이 '광주'로 먼저 잡히지 않도록
    // 별칭이 이름 안에 있는지만 보고, 더 앞선 자리를 우선한다.
    if (ALIASES[key].some((a) => s.includes(a.toLowerCase()))) return i;
  }
  return OFFICE_ORDER.length;
}

/** 교육청 목록을 정식 순서로 정렬한다(원본 배열은 건드리지 않는다). */
export function sortOffices<T>(items: T[], key: (item: T) => string): T[] {
  return [...items].sort((a, b) => {
    const d = officeRank(key(a)) - officeRank(key(b));
    return d !== 0 ? d : key(a).localeCompare(key(b), 'ko');
  });
}
