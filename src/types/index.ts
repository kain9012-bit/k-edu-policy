export type DocumentClassificationStatus = '정책계획서' | '정책참고자료' | '제외대상' | '확인필요';

export interface Attachment {
  name: string;
  url: string;
}

export interface PolicyDocument {
  id: string;
  office: string; // e.g. "gyeongnam"
  short_name: string; // e.g. "경남"
  board_id: string;
  board_name: string;
  board_type: string; // "계획서전용" | "정책집중" | "분산형"
  title: string;
  department?: string;
  published_date?: string;
  policy_year: number;
  document_type?: string;
  policy_category: string[];
  post_url: string;
  login_required: boolean;
  attachments: Attachment[];
  attachment_names: string[];
  classification_status: DocumentClassificationStatus;
  collected_at: string;
}

export interface OfficeStat {
  short_name: string;
  name: string;
  boards: number;
  count: number;
  plan_count: number;
  latest_post_date: string;
  last_success: string;
  failed_boards: number;
  empty_boards: number;
}

export interface BoardSource {
  office: string;
  board_name: string;
  board_type: string;
  menu_path: string;
  list_url: string;
  login_required: boolean;
  license: string;
  robots: string;
  count: number;
  plan_count: number;
  latest_post_date: string;
  status: string;
  last_collected: string;
}

export interface CrawlLog {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
}

export interface DocumentsData {
  generated_at: string;
  count: number;
  offices: string[];
  years: number[];
  departments: string[];
  document_types: string[];
  categories: string[];
  statuses: DocumentClassificationStatus[];
  coverage: {
    connected: number;
    total: number;
    boards: number;
    active_offices: number;
  };
  office_stats: OfficeStat[];
  sources: BoardSource[];
  logs: CrawlLog[];
  documents: PolicyDocument[];
}

export interface InternalDocument {
  id: string;
  office: string; // e.g. "경상남도교육청"
  department: string;
  title: string;
  doc_no: string; // e.g. "초등교육과-12097"
  published_date: string;
  has_original: boolean;
  readable: boolean;
}

export interface InfoListData {
  source: string;
  generated_at: string;
  count: number;
  offices: string[];
  departments: string[];
  years: number[];
  coverage: {
    from: string;
    to: string;
    days: number;
    scanned: number;
    failed_days: string[];
  };
  documents: InternalDocument[];
}

export interface BudgetRow {
  year: number;
  region: string; // e.g. "서울", "경기"
  region_code: string;
  item: string; // "세출예산액" or policy item
  amount: number; // in Won
  is_total: boolean;
  is_sub: boolean;
}

export interface BudgetData {
  source: string;
  license: string;
  years: number[];
  regions: string[];
  policy_items: string[];
  /** 정책사업 아래 단위사업. 합계가 총액을 넘지 않도록 목록을 나눠 쓴다. */
  unit_items?: string[];
  item_levels?: {
    total: string;
    policy_items: string[];
    children: Record<string, string[]>;
  };
  rows: BudgetRow[];
}

export type ActiveTab = 'home' | 'documents' | 'infolist' | 'budget' | 'sources';
