/**
 * 세출예산 항목 계층.
 *
 * 지방교육재정알리미 API(opbdfnctByPoli)는 정책사업(상위)과 단위사업(하위)을
 * 한 목록에 섞어서 준다. 그대로 나열하면 '인건비'와 '교육복지'처럼 층위가 다른 것을
 * 나란히 비교하게 되고, 전부 더하면 총액의 144%가 나온다.
 *
 * 아래 계층은 2022~2026년 17개 시도교육청 85개 조합 전부에서 합계 오차 0%로 확인했다.
 *   세출예산액       = 인건비 + 유아및초중등교육 + 평생교육 + 교육일반 + 예비비
 *   유아및초중등교육  = 교수학습활동지원 + 교육복지 + 보건급식 + 학교재정지원관리
 *                     + 학교시설여건개선 + 인적자원운용
 *   교육일반         = 교육행정일반 + 기관운영 + 재무활동
 *
 * 같은 내용이 config/budget_items.json 에도 있고 수집기가 data/budget.json 에 넣어준다.
 * 여기 둔 값은 데이터가 아직 갱신되지 않았을 때 쓰는 기준값이다.
 */
export const BUDGET_TOTAL = '세출예산액';

export const BUDGET_POLICY_ITEMS = [
  '인건비',
  '유아및초중등교육',
  '평생교육',
  '교육일반',
  '예비비',
] as const;

export const BUDGET_CHILDREN: Record<string, string[]> = {
  유아및초중등교육: [
    '교수학습활동지원',
    '교육복지',
    '보건급식',
    '학교재정지원관리',
    '학교시설여건개선',
    '인적자원운용',
  ],
  교육일반: ['교육행정일반', '기관운영', '재무활동'],
};

export interface BudgetItemGroup {
  policy: string;
  children: string[];
}

/**
 * 항목 목록을 정책사업 → 단위사업 순서로 묶는다.
 * 데이터에 계층이 실려 있으면 그걸 쓰고, 없으면 위 기준값을 쓴다.
 */
export function buildItemGroups(data: {
  policy_items?: string[];
  item_levels?: { total: string; policy_items: string[]; children: Record<string, string[]> };
}): BudgetItemGroup[] {
  const children = data.item_levels?.children ?? BUDGET_CHILDREN;
  // 데이터의 policy_items에 단위사업이 섞여 있던 시절이 있어, 계층에 있는 것만 상위로 인정한다.
  const known = new Set<string>(BUDGET_POLICY_ITEMS);
  const policies = (data.item_levels?.policy_items ?? data.policy_items ?? [])
    .filter((p) => known.has(p) || p in children);
  const list = policies.length ? policies : [...BUDGET_POLICY_ITEMS];
  return list.map((policy) => ({ policy, children: children[policy] ?? [] }));
}

/** 고른 항목이 어느 층위인지 한국어로 */
export function budgetItemLevel(
  item: string,
  data: { item_levels?: { total: string; policy_items: string[]; children: Record<string, string[]> } }
): string {
  if (item === (data.item_levels?.total ?? BUDGET_TOTAL)) return '총액';
  const children = data.item_levels?.children ?? BUDGET_CHILDREN;
  const policies = data.item_levels?.policy_items ?? [...BUDGET_POLICY_ITEMS];
  if (policies.includes(item)) return '정책사업';
  for (const [parent, list] of Object.entries(children)) {
    if (list.includes(item)) return `${parent}의 단위사업`;
  }
  return '';
}
