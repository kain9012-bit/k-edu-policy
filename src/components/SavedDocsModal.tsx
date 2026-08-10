import React from 'react';
import { PolicyDocument } from '../types';
import { Bookmark, Trash2, ExternalLink, Download, FileText, Share2 } from 'lucide-react';

interface SavedDocsModalProps {
  savedDocs: PolicyDocument[];
  onClose: () => void;
  onRemoveDoc: (id: string) => void;
  onClearAll: () => void;
}

export const SavedDocsModal: React.FC<SavedDocsModalProps> = ({
  savedDocs,
  onClose,
  onRemoveDoc,
  onClearAll,
}) => {
  const handleExportText = () => {
    if (savedDocs.length === 0) return;

    let text = `[교육정책 통합검색 - 보관함 정책계획서 목록]\n생성일시: ${new Date().toLocaleString()}\n총 ${savedDocs.length}건\n\n`;

    savedDocs.forEach((doc, idx) => {
      text += `${idx + 1}. [${doc.short_name}교육청] ${doc.title}\n`;
      text += `   - 담당부서: ${doc.department || '미지정'} | 발행일: ${doc.published_date || '미상'}\n`;
      text += `   - 카테고리: ${doc.policy_category.join(', ')}\n`;
      text += `   - 원문링크: ${doc.post_url}\n\n`;
    });

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `edupolicy_saved_list_${new Date().toISOString().slice(0, 10)}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-amber-400 fill-amber-400/20" />
            <h3 className="font-bold text-base">관심 정책계획서 보관함 ({savedDocs.length}건)</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg font-bold">
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-3">
          {savedDocs.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Bookmark className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">보관함이 비어있습니다.</p>
              <p className="text-xs text-slate-400">
                검색 목록에서 [보관] 버튼을 누르면 나중에 대조할 정책계획서를 저장할 수 있습니다.
              </p>
            </div>
          ) : (
            savedDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-4 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">
                      {doc.short_name}교육청
                    </span>
                    <span className="text-slate-500 font-medium">{doc.department}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{doc.title}</h4>
                  <div className="text-slate-400 text-[11px]">
                    연도: {doc.policy_year}년 | 분야: {doc.policy_category.join(', ')}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={doc.post_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"
                    title="원문 게시글 보기"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => onRemoveDoc(doc.id)}
                    className="p-2 bg-slate-200 hover:bg-red-100 text-slate-600 hover:text-red-600 rounded-lg transition"
                    title="보관함에서 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        {savedDocs.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={onClearAll}
              className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> 전체 비우기
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportText}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> 목록 다운로드 (.txt)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
