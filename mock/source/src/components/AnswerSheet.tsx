import React from 'react';
import { Flag, CheckCircle2, XCircle } from 'lucide-react';
import type { ExamDataset } from '../types';
import { isObjectiveCorrect } from '../utils/grading';

interface AnswerSheetProps {
  dataset: ExamDataset;
  answers: Record<number, string>;
  flagged: Record<number, boolean>;
  submitted: boolean;
  activePartId: string;
  onJumpToQuestion: (qId: number, partId: string) => void;
}

export const AnswerSheet: React.FC<AnswerSheetProps> = ({
  dataset,
  answers,
  flagged,
  submitted,
  activePartId,
  onJumpToQuestion,
}) => {
  const answeredTotal = dataset.questions.filter((q) =>
    Boolean((answers[q.id] || '').trim())
  ).length;
  const flaggedTotal = Object.values(flagged).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-[#EFEAE0] pb-2.5 text-xs">
        <span className="font-bold text-[#1F2328]">
          解答シート（{answeredTotal}/{dataset.questions.length}）
        </span>
        {flaggedTotal > 0 && (
          <span className="inline-flex items-center gap-1 font-semibold text-[#9A6324]">
            <Flag className="h-3 w-3 fill-current" />
            見直し {flaggedTotal}
          </span>
        )}
      </div>

      <div className="space-y-3.5">
        {dataset.parts.map((part) => {
          const partQs = dataset.questions.filter((q) => q.partId === part.id);
          return (
            <div key={part.id}>
              <div
                className={`mb-1.5 flex items-center justify-between text-[11px] font-bold ${
                  activePartId === part.id ? 'text-[#C83E2B]' : 'text-[#736B5E]'
                }`}
              >
                <span>{part.shortLabelJa}</span>
                <span>
                  {part.questionRange[0]}–{part.questionRange[1]}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {partQs.map((q) => {
                  const ans = (answers[q.id] || '').trim();
                  const hasAns = Boolean(ans);
                  const isFlag = Boolean(flagged[q.id]);
                  const ok = submitted && !q.isSubjective && isObjectiveCorrect(q, ans);
                  const ng = submitted && !q.isSubjective && !ok;

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => onJumpToQuestion(q.id, part.id)}
                      className={`relative flex h-8 cursor-pointer items-center justify-center rounded-lg border text-xs font-bold transition ${
                        ok
                          ? 'border-[#2E7D5B] bg-[#EEF8F2] text-[#1B4D38]'
                          : ng
                          ? 'border-[#D94A38] bg-[#FFF2F0] text-[#B92E1C]'
                          : hasAns
                          ? 'border-[#1E3A5F] bg-[#1E3A5F] text-white'
                          : 'border-[#E6DFD1] bg-[#FAF8F4] text-[#57606A] hover:border-[#C83E2B]'
                      }`}
                      title={`第${q.id}問`}
                    >
                      {q.id}
                      {isFlag && !submitted && (
                        <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#E69B2E] ring-2 ring-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 border-t border-[#EFEAE0] pt-3 text-[11px] text-[#6B7280]">
        {!submitted ? (
          <>
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-[#1E3A5F]" />
              解答済
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded border border-[#E6DFD1] bg-[#FAF8F4]" />
              未解答
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#E69B2E]" />
              見直し
            </span>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1 text-[#2E7D5B]">
              <CheckCircle2 className="h-3 w-3" />
              正解
            </span>
            <span className="inline-flex items-center gap-1 text-[#C83E2B]">
              <XCircle className="h-3 w-3" />
              不正解
            </span>
          </>
        )}
      </div>
    </div>
  );
};
