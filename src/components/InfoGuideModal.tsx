import React from 'react';
import { Search, ShieldCheck, CheckCircle2, AlertOctagon, Users, Target, FileText, ArrowRight } from 'lucide-react';

interface InfoGuideModalProps {
  onClose: () => void;
}

export const InfoGuideModal: React.FC<InfoGuideModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
              기획·화면 명세서 기준
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-1">교육정책 통합검색(EduPolicy Search) 서비스 안내</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1">
            ✕
          </button>
        </div>

        {/* Section 1: Problem statement */}
        <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
            <Target className="w-4 h-4 text-indigo-600" /> 1. 무엇이 문제인가? 
          </h3>
          <p className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            전국 17개 시도교육청은 해마다 수천 건의 정책계획서(기본계획·추진계획·운영계획·시행계획 등)를 수립하지만, 각 교육청 10여 개 게시판에 파편화되어 실제로 찾을 수 없는 상태에 가깝습니다.
          </p>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
            <li className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100 font-medium">
              <strong className="text-indigo-900 block mb-0.5">흩어져 있는 게시판</strong>
              게시판 이름이 기본계획안내, 정책자료실, 업무공유자료실처럼 제각각.
            </li>
            <li className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100 font-medium">
              <strong className="text-indigo-900 block mb-0.5">교차 검색 불가</strong>
              "다른 교육청은 늘봄학교 계획을 어떻게 세웠나" 한 번에 확인 불가능.
            </li>
            <li className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100 font-medium">
              <strong className="text-indigo-900 block mb-0.5">내부결재 파편화</strong>
              게시판 미공개 계획은 정보공개포털 목록에만 흔적이 남음.
            </li>
            <li className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100 font-medium">
              <strong className="text-indigo-900 block mb-0.5">계획과 예산의 분리</strong>
              계획 문서와 해당 사업 예산이 서로 다른 시스템에 존재.
            </li>
          </ul>
        </div>

        {/* Section 2: Core Values */}
        <div className="space-y-2 text-xs">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> 2. 4대 핵심 가치
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <strong className="text-emerald-900 block font-bold mb-1">찾을 수 있게</strong>
              17개 교육청 계획을 제목 한 번으로 색인
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200">
              <strong className="text-indigo-900 block font-bold mb-1">원문으로 연결</strong>
              재배포 대신 링크. 정본은 각 교육청 게시글
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <strong className="text-amber-900 block font-bold mb-1">숨기지 않기</strong>
              출처, 수집 시각, 실패 내역을 투명 노출
            </div>
            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200">
              <strong className="text-slate-900 block font-bold mb-1">공개된 것만</strong>
              비공개·개인정보는 미수집 및 제외
            </div>
          </div>
        </div>

        {/* Section 3: Target Users */}
        <div className="space-y-2 text-xs">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-sky-600" /> 3. 대상 사용자
          </h3>

          <div className="space-y-1.5">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-indigo-700 block mb-0.5">1순위 — 시도교육청·교육지원청 정책 담당자</span>
              <p className="text-slate-600 text-[11px]">
                새 정책 기본계획 작성 시 "다른 교육청은 뭐라고 썼지?", "예산 규모는 어디쯤이지?"에 바로 대답합니다.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-sky-700 block mb-0.5">2순위 — 교육정책 연구자·기자</span>
              <p className="text-slate-600 text-[11px]">
                연도별·교육청별 계획 문서 존재 여부 및 공개 수준 비교, 정확한 문서번호 확인을 통한 정보공개청구를 지원합니다.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Non-goals */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-xs text-red-900 space-y-1.5">
          <h4 className="font-bold flex items-center gap-1.5 text-red-800">
            <AlertOctagon className="w-4 h-4 text-red-600" /> 이 서비스가 하지 않는 일
          </h4>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-red-800/90 pl-1">
            <li>학생·학부모 대상 민원 안내 서비스가 아닙니다.</li>
            <li>계획서 내용을 요약·해석해 주는 서비스가 아닙니다.</li>
            <li><strong>찾아서 원문으로 보내주는 것까지가 범위입니다.</strong></li>
          </ul>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition shadow-sm"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
