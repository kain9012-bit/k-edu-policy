import { DocumentsData, InfoListData, BudgetData } from '../types';

export const fallbackDocumentsData: DocumentsData = {
  generated_at: "2026-08-10 12:29:58",
  count: 3820,
  offices: ["서울", "경기", "부산", "대구", "인천", "광주", "대전", "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"],
  years: [2022, 2023, 2024, 2025, 2026],
  departments: ["중등교육과", "초등교육과", "교육복지과", "유아특수교육과", "미래교육과", "체육건강과", "정책기획과", "교원인사과", "진로직업과", "학교안전과"],
  document_types: ["기본계획", "추진계획", "운영계획", "시행계획", "종합계획", "세부계획"],
  categories: ["늘봄·방과후", "기초학력", "AI·디지털교육", "고교학점제", "교육복지", "급식·보건", "교원정책", "특수교육", "유보통합", "학교안전", "진로·직업"],
  statuses: ["정책계획서", "정책참고자료", "제외대상", "확인필요"],
  coverage: {
    connected: 16,
    total: 16,
    boards: 179,
    active_offices: 16
  },
  office_stats: [
    { short_name: "서울", name: "서울특별시교육청", boards: 25, count: 1074, plan_count: 666, latest_post_date: "2026-08-04", last_success: "2026-08-10 12:19:38", failed_boards: 0, empty_boards: 0 },
    { short_name: "경기", name: "경기도교육청", boards: 28, count: 1120, plan_count: 710, latest_post_date: "2026-08-08", last_success: "2026-08-10 12:18:22", failed_boards: 0, empty_boards: 1 },
    { short_name: "부산", name: "부산광역시교육청", boards: 14, count: 340, plan_count: 215, latest_post_date: "2026-08-01", last_success: "2026-08-10 12:15:10", failed_boards: 0, empty_boards: 0 },
    { short_name: "대구", name: "대구광역시교육청", boards: 12, count: 280, plan_count: 180, latest_post_date: "2026-07-29", last_success: "2026-08-10 12:16:45", failed_boards: 0, empty_boards: 0 },
    { short_name: "인천", name: "인천광역시교육청", boards: 11, count: 250, plan_count: 160, latest_post_date: "2026-08-05", last_success: "2026-08-10 12:14:30", failed_boards: 0, empty_boards: 0 },
    { short_name: "광주", name: "광주광역시교육청", boards: 9, count: 190, plan_count: 120, latest_post_date: "2026-07-25", last_success: "2026-08-10 12:13:00", failed_boards: 0, empty_boards: 0 },
    { short_name: "대전", name: "대전광역시교육청", boards: 8, count: 170, plan_count: 110, latest_post_date: "2026-07-28", last_success: "2026-08-10 12:12:15", failed_boards: 0, empty_boards: 0 },
    { short_name: "울산", name: "울산광역시교육청", boards: 7, count: 150, plan_count: 95, latest_post_date: "2026-07-20", last_success: "2026-08-10 12:11:40", failed_boards: 0, empty_boards: 0 },
    { short_name: "세종", name: "세종특별자치시교육청", boards: 6, count: 140, plan_count: 90, latest_post_date: "2026-08-02", last_success: "2026-08-10 12:10:00", failed_boards: 0, empty_boards: 0 },
    { short_name: "강원", name: "강원특별자치도교육청", boards: 10, count: 210, plan_count: 135, latest_post_date: "2026-08-03", last_success: "2026-08-10 12:14:10", failed_boards: 0, empty_boards: 0 },
    { short_name: "충북", name: "충청북도교육청", boards: 8, count: 180, plan_count: 115, latest_post_date: "2026-07-30", last_success: "2026-08-10 12:15:00", failed_boards: 0, empty_boards: 0 },
    { short_name: "충남", name: "충청남도교육청", boards: 9, count: 200, plan_count: 130, latest_post_date: "2026-08-06", last_success: "2026-08-10 12:16:20", failed_boards: 0, empty_boards: 0 },
    { short_name: "전북", name: "전북특별자치도교육청", boards: 10, count: 220, plan_count: 140, latest_post_date: "2026-08-07", last_success: "2026-08-10 12:17:15", failed_boards: 0, empty_boards: 0 },
    { short_name: "전남", name: "전라남도교육청", boards: 11, count: 230, plan_count: 150, latest_post_date: "2026-08-02", last_success: "2026-08-10 12:18:00", failed_boards: 0, empty_boards: 0 },
    { short_name: "경북", name: "경상북도교육청", boards: 12, count: 260, plan_count: 170, latest_post_date: "2026-08-05", last_success: "2026-08-10 12:18:45", failed_boards: 0, empty_boards: 0 },
    { short_name: "경남", name: "경상남도교육청", boards: 13, count: 290, plan_count: 185, latest_post_date: "2026-08-09", last_success: "2026-08-10 12:17:33", failed_boards: 0, empty_boards: 0 },
    { short_name: "제주", name: "제주특별자치도교육청", boards: 6, count: 130, plan_count: 80, latest_post_date: "2026-07-27", last_success: "2026-08-10 12:10:50", failed_boards: 0, empty_boards: 0 }
  ],
  sources: [
    { office: "경남", board_name: "업무공유자료실", board_type: "분산형", menu_path: "소통·참여 > 자료실 > 업무공유자료실", list_url: "https://www.gne.go.kr/board/list.gne?boardId=gne-businessdata", login_required: false, license: "공공누리 제1유형", robots: "허용", count: 290, plan_count: 185, latest_post_date: "2026-08-09", status: "성공", last_collected: "2026-08-10 12:17:33" },
    { office: "전북", board_name: "기본계획안내", board_type: "계획서전용", menu_path: "행정정보 > 정책자료 > 기본계획안내", list_url: "https://www.jbe.go.kr/board/list.jbe?boardId=jbe-basicplan", login_required: true, license: "기관 공개자료(로그인 필요) · 공공누리 표기 확인", robots: "허용", count: 100, plan_count: 88, latest_post_date: "2026-05-26", status: "성공", last_collected: "2026-08-10 12:17:00" },
    { office: "서울", board_name: "정책자료실", board_type: "정책집중", menu_path: "행정정보 > 주요정책 > 정책자료실", list_url: "https://www.sen.go.kr/sen/board/list.sen?boardId=sen-policy", login_required: false, license: "공공누리 제1유형", robots: "허용", count: 450, plan_count: 320, latest_post_date: "2026-08-04", status: "성공", last_collected: "2026-08-10 12:19:38" },
    { office: "경기", board_name: "통합자료실", board_type: "분산형", menu_path: "정보마당 > 통합자료실 > 기본계획", list_url: "https://www.goe.go.kr/board/list.goe?boardId=goe-data", login_required: false, license: "공공누리 제1유형", robots: "허용", count: 520, plan_count: 380, latest_post_date: "2026-08-08", status: "성공", last_collected: "2026-08-10 12:18:22" }
  ],
  logs: [
    { timestamp: "2026-08-10 12:29:58", level: "INFO", message: "16개 교육청 179개 게시판 크롤링 완료. 총 3,820건 중 정책계획서 2,340건 식별." },
    { timestamp: "2026-08-10 12:19:38", level: "INFO", message: "서울특별시교육청 정책자료실 450건 수집 완료." },
    { timestamp: "2026-08-10 12:18:22", level: "INFO", message: "경기도교육청 통합자료실 520건 수집 완료." },
    { timestamp: "2026-08-10 12:17:33", level: "INFO", message: "경상남도교육청 업무공유자료실 290건 수집 완료." }
  ],
  documents: [
    {
      id: "112cde182ad0a760",
      office: "gyeongnam",
      short_name: "경남",
      board_id: "gyeongnam-businessdata",
      board_name: "업무공유자료실",
      board_type: "분산형",
      title: "2026 경남형 늘봄학교 맞춤형 공간 및 프로그램 종합 추진 계획",
      department: "초등교육과",
      published_date: "2026-09-01",
      policy_year: 2026,
      document_type: "추진계획",
      policy_category: ["늘봄·방과후", "교육복지"],
      post_url: "https://www.gne.go.kr/board/view.gne?boardId=gne-businessdata&menuId=0101&dataSid=108421",
      login_required: false,
      attachments: [
        { name: "2026_경남_늘봄학교_추진계획.hwp", url: "https://www.gne.go.kr/download.gne?fileId=98124" },
        { name: "붙임_늘봄교실_공간구성_가이드라인.pdf", url: "https://www.gne.go.kr/download.gne?fileId=98125" }
      ],
      attachment_names: ["2026_경남_늘봄학교_추진계획.hwp", "붙임_늘봄교실_공간구성_가이드라인.pdf"],
      classification_status: "정책계획서",
      collected_at: "2026-08-10 12:17:33"
    },
    {
      id: "sen2026080401",
      office: "seoul",
      short_name: "서울",
      board_id: "sen-policy",
      board_name: "정책자료실",
      board_type: "정책집중",
      title: "2026 서울 기초학력 보장 및 학습지원대상학생 다중지원 종합 기본계획",
      department: "중등교육과",
      published_date: "2026-08-04",
      policy_year: 2026,
      document_type: "기본계획",
      policy_category: ["기초학력"],
      post_url: "https://www.sen.go.kr/sen/board/view.sen?boardId=sen-policy&dataSid=20194",
      login_required: false,
      attachments: [
        { name: "2026_서울_기초학력보장_기본계획.hwpx", url: "https://www.sen.go.kr/download.sen?fileId=5412" }
      ],
      attachment_names: ["2026_서울_기초학력보장_기본계획.hwpx"],
      classification_status: "정책계획서",
      collected_at: "2026-08-10 12:19:38"
    },
    {
      id: "goe2026080802",
      office: "gyeonggi",
      short_name: "경기",
      board_id: "goe-data",
      board_name: "통합자료실",
      board_type: "분산형",
      title: "2026 경기 AI-디지털 교과서 도입 및 디지털 기반 수업 혁신 시행계획",
      department: "미래교육과",
      published_date: "2026-08-08",
      policy_year: 2026,
      document_type: "시행계획",
      policy_category: ["AI·디지털교육"],
      post_url: "https://www.goe.go.kr/board/view.goe?boardId=goe-data&dataSid=88421",
      login_required: false,
      attachments: [
        { name: "2026_경기_AI디지털교과서_시행계획.pdf", url: "https://www.goe.go.kr/download.goe?fileId=1023" }
      ],
      attachment_names: ["2026_경기_AI디지털교과서_시행계획.pdf"],
      classification_status: "정책계획서",
      collected_at: "2026-08-10 12:18:22"
    },
    {
      id: "jbe2026052601",
      office: "jeonbuk",
      short_name: "전북",
      board_id: "jbe-basicplan",
      board_name: "기본계획안내",
      board_type: "계획서전용",
      title: "2026 전북형 고교학점제 전면 실시 및 이수기준 미달 예방 지원 계획",
      department: "중등교육과",
      published_date: "2026-05-26",
      policy_year: 2026,
      document_type: "추진계획",
      policy_category: ["고교학점제"],
      post_url: "https://www.jbe.go.kr/board/view.jbe?boardId=jbe-basicplan&dataSid=4412",
      login_required: true,
      attachments: [
        { name: "2026_전북_고교학점제_지원계획.hwp", url: "https://www.jbe.go.kr/download.jbe?fileId=3312" }
      ],
      attachment_names: ["2026_전북_고교학점제_지원계획.hwp"],
      classification_status: "정책계획서",
      collected_at: "2026-08-10 12:17:00"
    },
    {
      id: "pen2026080101",
      office: "busan",
      short_name: "부산",
      board_id: "pen-policy",
      board_name: "정책자료실",
      board_type: "정책집중",
      title: "2026 부산 다문화 및 취약계층 학생 교육복지우선지원사업 운영계획",
      department: "교육복지과",
      published_date: "2026-08-01",
      policy_year: 2026,
      document_type: "운영계획",
      policy_category: ["교육복지"],
      post_url: "https://www.pen.go.kr/board/view.pen?boardId=pen-policy&dataSid=9921",
      login_required: false,
      attachments: [
        { name: "2026_부산_교육복지우선지원_운영계획.hwp", url: "https://www.pen.go.kr/download.pen?fileId=1298" }
      ],
      attachment_names: ["2026_부산_교육복지우선지원_운영계획.hwp"],
      classification_status: "정책계획서",
      collected_at: "2026-08-10 12:15:10"
    },
    {
      id: "dge2026072901",
      office: "daegu",
      short_name: "대구",
      board_id: "dge-data",
      board_name: "업무자료실",
      board_type: "분산형",
      title: "2026 대구 친환경 학교급식 지원 및 급식실 환기설비 개선 사업 계획",
      department: "체육건강과",
      published_date: "2026-07-29",
      policy_year: 2026,
      document_type: "세부계획",
      policy_category: ["급식·보건", "학교안전"],
      post_url: "https://www.dge.go.kr/board/view.dge?boardId=dge-data&dataSid=6712",
      login_required: false,
      attachments: [
        { name: "2026_대구_학교급식개선_계획.pdf", url: "https://www.dge.go.kr/download.dge?fileId=4410" }
      ],
      attachment_names: ["2026_대구_학교급식개선_계획.pdf"],
      classification_status: "정책계획서",
      collected_at: "2026-08-10 12:16:45"
    },
    {
      id: "ice2026080501",
      office: "incheon",
      short_name: "인천",
      board_id: "ice-plan",
      board_name: "기본계획실",
      board_type: "계획서전용",
      title: "2026 인천 교원 역량 강화 및 학습공동체 활성화 종합 기본계획",
      department: "교원인사과",
      published_date: "2026-08-05",
      policy_year: 2026,
      document_type: "기본계획",
      policy_category: ["교원정책"],
      post_url: "https://www.ice.go.kr/board/view.ice?boardId=ice-plan&dataSid=1204",
      login_required: false,
      attachments: [
        { name: "2026_인천_교원역량강화_기본계획.hwp", url: "https://www.ice.go.kr/download.ice?fileId=7812" }
      ],
      attachment_names: ["2026_인천_교원역량강화_기본계획.hwp"],
      classification_status: "정책계획서",
      collected_at: "2026-08-10 12:14:30"
    },
    {
      id: "gen2026072501",
      office: "gwangju",
      short_name: "광주",
      board_id: "gen-data",
      board_name: "통합자료실",
      board_type: "분산형",
      title: "2026 광주 장애학생 맞춤형 특수교육 및 행동중재 지원 시행계획",
      department: "유아특수교육과",
      published_date: "2026-07-25",
      policy_year: 2026,
      document_type: "시행계획",
      policy_category: ["특수교육"],
      post_url: "https://www.gen.go.kr/board/view.gen?boardId=gen-data&dataSid=5541",
      login_required: false,
      attachments: [
        { name: "2026_광주_특수교육지원_시행계획.pdf", url: "https://www.gen.go.kr/download.gen?fileId=3310" }
      ],
      attachment_names: ["2026_광주_특수교육지원_시행계획.pdf"],
      classification_status: "정책계획서",
      collected_at: "2026-08-10 12:13:00"
    },
    {
      id: "gbe2026080501",
      office: "gyeongbuk",
      short_name: "경북",
      board_id: "gbe-policy",
      board_name: "정책자료실",
      board_type: "정책집중",
      title: "2026 경북 유보통합 추진 기반 조성 및 관리체계 일원화 실행계획",
      department: "유아특수교육과",
      published_date: "2026-08-05",
      policy_year: 2026,
      document_type: "추진계획",
      policy_category: ["유보통합"],
      post_url: "https://www.gbe.kr/board/view.gbe?boardId=gbe-policy&dataSid=9012",
      login_required: false,
      attachments: [
        { name: "2026_경북_유보통합_실행계획.hwp", url: "https://www.gbe.kr/download.gbe?fileId=6120" }
      ],
      attachment_names: ["2026_경북_유보통합_실행계획.hwp"],
      classification_status: "정책계획서",
      collected_at: "2026-08-10 12:18:45"
    },
    {
      id: "cne2026080601",
      office: "chungnam",
      short_name: "충남",
      board_id: "cne-data",
      board_name: "업무공유자료실",
      board_type: "분산형",
      title: "2026 충남 직업계고 체질 개선 및 신산업 분야 진로직업교육 계획",
      department: "진로직업과",
      published_date: "2026-08-06",
      policy_year: 2026,
      document_type: "추진계획",
      policy_category: ["진로·직업"],
      post_url: "https://www.cne.go.kr/board/view.cne?boardId=cne-data&dataSid=3412",
      login_required: false,
      attachments: [
        { name: "2026_충남_직업교육개선계획.pdf", url: "https://www.cne.go.kr/download.cne?fileId=2290" }
      ],
      attachment_names: ["2026_충남_직업교육개선계획.pdf"],
      classification_status: "정책계획서",
      collected_at: "2026-08-10 12:16:20"
    },
    {
      id: "cbe2026073001",
      office: "chungbuk",
      short_name: "충북",
      board_id: "cbe-plan",
      board_name: "기본계획실",
      board_type: "계획서전용",
      title: "2026 충북 학교 안전사고 예방 및 365일 안전한 학교환경 조성 계획",
      department: "학교안전과",
      published_date: "2026-07-30",
      policy_year: 2026,
      document_type: "기본계획",
      policy_category: ["학교안전"],
      post_url: "https://www.cbe.go.kr/board/view.cbe?boardId=cbe-plan&dataSid=7812",
      login_required: false,
      attachments: [
        { name: "2026_충북_학교안전예방_기본계획.hwp", url: "https://www.cbe.go.kr/download.cbe?fileId=5012" }
      ],
      attachment_names: ["2026_충북_학교안전예방_기본계획.hwp"],
      classification_status: "정책계획서",
      collected_at: "2026-08-10 12:15:00"
    },
    {
      id: "kwe2026080301",
      office: "gangwon",
      short_name: "강원",
      board_id: "kwe-data",
      board_name: "통합자료실",
      board_type: "분산형",
      title: "2026 강원 늘봄학교 확대 및 지자체 연동 보육 인프라 구축 방안",
      department: "초등교육과",
      published_date: "2026-08-03",
      policy_year: 2026,
      document_type: "추진계획",
      policy_category: ["늘봄·방과후", "교육복지"],
      post_url: "https://www.kwe.go.kr/board/view.kwe?boardId=kwe-data&dataSid=4120",
      login_required: false,
      attachments: [
        { name: "2026_강원_늘봄학교_확대방안.hwp", url: "https://www.kwe.go.kr/download.kwe?fileId=2104" }
      ],
      attachment_names: ["2026_강원_늘봄학교_확대방안.hwp"],
      classification_status: "정책계획서",
      collected_at: "2026-08-10 12:14:10"
    },
    {
      id: "ref2026080101",
      office: "seoul",
      short_name: "서울",
      board_id: "sen-policy",
      board_name: "정책자료실",
      board_type: "정책집중",
      title: "[참고자료] 2026 전국 시도교육청 AI 학습용 데이터 구축 현황 보고서",
      department: "미래교육과",
      published_date: "2026-08-01",
      policy_year: 2026,
      document_type: "참고자료",
      policy_category: ["AI·디지털교육"],
      post_url: "https://www.sen.go.kr/sen/board/view.sen?boardId=sen-policy&dataSid=19980",
      login_required: false,
      attachments: [
        { name: "AI_학습용_데이터_현황_보고서.pdf", url: "https://www.sen.go.kr/download.sen?fileId=5110" }
      ],
      attachment_names: ["AI_학습용_데이터_현황_보고서.pdf"],
      classification_status: "정책참고자료",
      collected_at: "2026-08-10 12:19:38"
    },
    {
      id: "exc2026071501",
      office: "gyeonggi",
      short_name: "경기",
      board_id: "goe-data",
      board_name: "통합자료실",
      board_type: "분산형",
      title: "[입찰공고] 2026학년도 경기 미래형 교실 PC 및 디바이스 임대 사업 입찰",
      department: "행정과",
      published_date: "2026-07-15",
      policy_year: 2026,
      document_type: "공고",
      policy_category: ["AI·디지털교육"],
      post_url: "https://www.goe.go.kr/board/view.goe?boardId=goe-data&dataSid=87120",
      login_required: false,
      attachments: [],
      attachment_names: [],
      classification_status: "제외대상",
      collected_at: "2026-08-10 12:18:22"
    }
  ]
};

export const fallbackInfoListData: InfoListData = {
  source: "정보공개포털(open.go.kr) 정보목록",
  generated_at: "2026-08-11 03:23:13",
  count: 46001,
  offices: [
    "서울특별시교육청",
    "부산광역시교육청",
    "대구광역시교육청",
    "인천광역시교육청",
    "광주광역시교육청",
    "대전광역시교육청",
    "울산광역시교육청",
    "세종특별자치시교육청",
    "경기도교육청",
    "강원특별자치도교육청",
    "충청북도교육청",
    "충청남도교육청",
    "전북특별자치도교육청",
    "전라남도교육청",
    "경상북도교육청",
    "경상남도교육청",
    "제주특별자치도교육청"
  ],
  departments: [
    "초등교육과",
    "중등교육과",
    "교육복지과",
    "유아특수교육과",
    "미래교육과",
    "체육건강과",
    "정책기획과",
    "교원인사과",
    "진로직업과",
    "학교안전과"
  ],
  years: [2026],
  coverage: {
    from: "2026-01-01",
    to: "2026-08-11",
    days: 223,
    scanned: 382960,
    failed_days: []
  },
  documents: [
    {
      id: "il-S10CB261704749847000-20260619162946",
      office: "경상남도교육청",
      department: "초등교육과",
      title: "2026. 초등(특수)교감 자격연수대상자 지명을 위한 심층면접시험 평가 위원 위촉 계획",
      doc_no: "초등교육과-12097",
      published_date: "2026-06-19",
      has_original: false,
      readable: false
    },
    {
      id: "il-B1000001298412039123-20260710091522",
      office: "서울특별시교육청",
      department: "중등교육과",
      title: "2026학년도 서울 공립 중등학교 교사 임용후보자 선정경쟁시험 시행 내부 기본계획안",
      doc_no: "중등교육과-15420",
      published_date: "2026-07-10",
      has_original: false,
      readable: false
    },
    {
      id: "il-J1000084129481928341-20260802142010",
      office: "경기도교육청",
      department: "미래교육과",
      title: "2026 경기 스마트기기 보급 및 학내 데이터망 통합 교체 사업 예산 집행 계획",
      doc_no: "미래교육과-8412",
      published_date: "2026-08-02",
      has_original: false,
      readable: false
    },
    {
      id: "il-C1000091241928412941-20260515113000",
      office: "전북특별자치도교육청",
      department: "초등교육과",
      title: "2026 전북형 늘봄학교 거점형 센터 건립을 위한 타당성 조사 및 추진단 운영계획",
      doc_no: "초등교육과-9812",
      published_date: "2026-05-15",
      has_original: false,
      readable: false
    },
    {
      id: "il-C1000054129412984129-20260722160510",
      office: "부산광역시교육청",
      department: "교육복지과",
      title: "2026 부산 취약계층 학생 꿈키움 장학금 지급 및 대상자 자체 심사 계획",
      doc_no: "교육복지과-4412",
      published_date: "2026-07-22",
      has_original: false,
      readable: false
    },
    {
      id: "il-C1000034129841209120-20260630104000",
      office: "대구광역시교육청",
      department: "체육건강과",
      title: "2026 대구 학교급식 종사자 건강검진 및 작업환경 측정 세부 추진계획",
      doc_no: "체육건강과-6780",
      published_date: "2026-06-30",
      has_original: false,
      readable: false
    },
    {
      id: "il-C1000021412984102941-20260805131500",
      office: "인천광역시교육청",
      department: "교원인사과",
      title: "2026 인천 수석교사 선발 심사 및 역량평가 위원 구성 계획",
      doc_no: "교원인사과-3104",
      published_date: "2026-08-05",
      has_original: false,
      readable: false
    },
    {
      id: "il-C1000019284102948129-20260701090000",
      office: "광주광역시교육청",
      department: "유아특수교육과",
      title: "2026 광주 공립유치원 학급편성 및 원아 배치 수급 계획",
      doc_no: "유아특수교육과-2015",
      published_date: "2026-07-01",
      has_original: false,
      readable: false
    },
    {
      id: "il-C1000012094810294812-20260808152000",
      office: "강원특별자치도교육청",
      department: "정책기획과",
      title: "2026 강원교육 주요업무평가 및 성과관리 지표 개선 계획",
      doc_no: "정책기획과-1102",
      published_date: "2026-08-08",
      has_original: false,
      readable: false
    },
    {
      id: "il-C1000088129410294812-20260611110000",
      office: "충청남도교육청",
      department: "진로직업과",
      title: "2026 충남 신산업 분야 직업계고 재구조화 사업 운영계획",
      doc_no: "진로직업과-5540",
      published_date: "2026-06-11",
      has_original: false,
      readable: false
    }
  ]
};

export const fallbackBudgetData: BudgetData = {
  source: "지방교육재정알리미 Open API (opbdfnctByPoli)",
  license: "공공누리 출처표시",
  years: [2022, 2023, 2024, 2025, 2026],
  regions: ["강원", "경기", "경남", "경북", "광주", "대구", "대전", "부산", "서울", "세종", "울산", "인천", "전남", "전북", "제주", "충남", "충북"],
  policy_items: [
    "교수학습활동지원",
    "교육복지",
    "교육일반",
    "교육행정일반",
    "기관운영",
    "보건급식",
    "예비비",
    "유아및초중등교육",
    "인건비",
    "인적자원운용",
    "재무활동",
    "평생교육",
    "학교시설여건개선",
    "학교재정지원관리"
  ],
  rows: [
    { year: 2026, region: "서울", region_code: "B10", item: "세출예산액", amount: 11250000000000, is_total: true, is_sub: false },
    { year: 2026, region: "서울", region_code: "B10", item: "교수학습활동지원", amount: 1850000000000, is_total: false, is_sub: true },
    { year: 2026, region: "서울", region_code: "B10", item: "교육복지", amount: 1280000000000, is_total: false, is_sub: true },
    { year: 2026, region: "서울", region_code: "B10", item: "보건급식", amount: 890000000000, is_total: false, is_sub: true },
    { year: 2026, region: "서울", region_code: "B10", item: "학교시설여건개선", amount: 1420000000000, is_total: false, is_sub: true },

    { year: 2026, region: "경기", region_code: "J10", item: "세출예산액", amount: 22400000000000, is_total: true, is_sub: false },
    { year: 2026, region: "경기", region_code: "J10", item: "교수학습활동지원", amount: 3900000000000, is_total: false, is_sub: true },
    { year: 2026, region: "경기", region_code: "J10", item: "교육복지", amount: 2650000000000, is_total: false, is_sub: true },
    { year: 2026, region: "경기", region_code: "J10", item: "보건급식", amount: 1780000000000, is_total: false, is_sub: true },
    { year: 2026, region: "경기", region_code: "J10", item: "학교시설여건개선", amount: 2980000000000, is_total: false, is_sub: true },

    { year: 2026, region: "부산", region_code: "C10", item: "세출예산액", amount: 5420000000000, is_total: true, is_sub: false },
    { year: 2026, region: "부산", region_code: "C10", item: "교수학습활동지원", amount: 920000000000, is_total: false, is_sub: true },
    { year: 2026, region: "부산", region_code: "C10", item: "교육복지", amount: 640000000000, is_total: false, is_sub: true },

    { year: 2026, region: "경남", region_code: "S10", item: "세출예산액", amount: 7180000000000, is_total: true, is_sub: false },
    { year: 2026, region: "경남", region_code: "S10", item: "교수학습활동지원", amount: 1180000000000, is_total: false, is_sub: true },
    { year: 2026, region: "경남", region_code: "S10", item: "교육복지", amount: 890000000000, is_total: false, is_sub: true },

    { year: 2026, region: "인천", region_code: "E10", item: "세출예산액", amount: 5350000000000, is_total: true, is_sub: false },
    { year: 2026, region: "경북", region_code: "R10", item: "세출예산액", amount: 6210000000000, is_total: true, is_sub: false },
    { year: 2026, region: "대구", region_code: "D10", item: "세출예산액", amount: 4320000000000, is_total: true, is_sub: false },
    { year: 2026, region: "전남", region_code: "Q10", item: "세출예산액", amount: 4980000000000, is_total: true, is_sub: false },
    { year: 2026, region: "전북", region_code: "P10", item: "세출예산액", amount: 4620000000000, is_total: true, is_sub: false },
    { year: 2026, region: "충남", region_code: "N10", item: "세출예산액", amount: 4910000000000, is_total: true, is_sub: false },
    { year: 2026, region: "충북", region_code: "M10", item: "세출예산액", amount: 3820000000000, is_total: true, is_sub: false },
    { year: 2026, region: "강원", region_code: "K10", item: "세출예산액", amount: 4120000000000, is_total: true, is_sub: false },
    { year: 2026, region: "광주", region_code: "F10", item: "세출예산액", amount: 3120000000000, is_total: true, is_sub: false },
    { year: 2026, region: "대전", region_code: "G10", item: "세출예산액", amount: 2890000000000, is_total: true, is_sub: false },
    { year: 2026, region: "울산", region_code: "H10", item: "세출예산액", amount: 2380000000000, is_total: true, is_sub: false },
    { year: 2026, region: "세종", region_code: "I10", item: "세출예산액", amount: 1210000000000, is_total: true, is_sub: false },
    { year: 2026, region: "제주", region_code: "T10", item: "세출예산액", amount: 1650000000000, is_total: true, is_sub: false },

    { year: 2025, region: "서울", region_code: "B10", item: "세출예산액", amount: 10588635087000, is_total: true, is_sub: false },
    { year: 2025, region: "경기", region_code: "J10", item: "세출예산액", amount: 21100000000000, is_total: true, is_sub: false },
    { year: 2024, region: "서울", region_code: "B10", item: "세출예산액", amount: 10120000000000, is_total: true, is_sub: false },
    { year: 2024, region: "경기", region_code: "J10", item: "세출예산액", amount: 19800000000000, is_total: true, is_sub: false },
    { year: 2023, region: "서울", region_code: "B10", item: "세출예산액", amount: 9850000000000, is_total: true, is_sub: false },
    { year: 2023, region: "경기", region_code: "J10", item: "세출예산액", amount: 18900000000000, is_total: true, is_sub: false },
    { year: 2022, region: "서울", region_code: "B10", item: "세출예산액", amount: 9210000000000, is_total: true, is_sub: false },
    { year: 2022, region: "경기", region_code: "J10", item: "세출예산액", amount: 17800000000000, is_total: true, is_sub: false }
  ]
};
