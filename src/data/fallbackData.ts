import { DocumentsData, InfoListData, BudgetData } from '../types';

/**
 * 데이터가 도착하기 전에 쓰는 '빈 껍데기'다.
 *
 * 예전에는 여기에 그럴듯한 표본 문서가 들어 있었다. 화면이 비어 보이지 않게 하려던 것인데,
 * 지어낸 문서번호(초등교육과-12097)와 가짜 정보공개포털 링크가 진짜처럼 보이는 게 문제였다.
 * 회선이 끊긴 사용자가 그 번호로 실제 정보공개청구를 넣을 수 있고,
 * 수집 내역을 가공 없이 공개한다는 이 서비스의 취지와도 정면으로 어긋난다.
 *
 * 그래서 표본을 전부 걷어냈다. 데이터를 못 받으면 빈 화면과 함께
 * '불러오지 못했습니다' 안내를 띄운다. 없는 걸 있는 척하지 않는다.
 */

export const emptyDocumentsData: DocumentsData = {
  generated_at: '',
  count: 0,
  offices: [],
  years: [],
  departments: [],
  document_types: [],
  categories: [],
  statuses: [],
  coverage: { connected: 0, total: 0, boards: 0, active_offices: 0, agency_count: 0 },
  office_stats: [],
  sources: [],
  logs: [],
  documents: [],
};

export const emptyInfoListData: InfoListData = {
  source: '',
  generated_at: '',
  count: 0,
  offices: [],
  departments: [],
  years: [],
  coverage: { from: '', to: '', days: 0, scanned: 0, failed_days: [] },
  documents: [],
};

export const emptyBudgetData: BudgetData = {
  source: '',
  license: '',
  years: [],
  regions: [],
  policy_items: [],
  unit_items: [],
  rows: [],
};
