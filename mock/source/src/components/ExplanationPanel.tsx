import React from 'react';
import {
  Lightbulb,
  BookOpenCheck,
  CheckCircle2,
  MessageSquareText,
  Sparkles,
  CheckSquare,
  Square,
} from 'lucide-react';
import type { ExamQuestion, SharedGroup } from '../types';

interface ExplanationPanelProps {
  question: ExamQuestion;
  group?: SharedGroup;
  showPinyin: boolean;
  checkedRubric?: boolean[];
  onToggleRubric?: (idx: number) => void;
}

export const ExplanationPanel: React.FC<ExplanationPanelProps> = ({
  question,
  group,
  showPinyin,
  checkedRubric,
  onToggleRubric,
}) => {
  const transcript = question.transcript?.length
    ? question.transcript
    : group?.transcript;

  const formatOfficialAnswer = () => {
    if (!question.answer) return null;
    if (question.kind === 'tf_ng') {
      if (question.answer === '√') return '√（本文と一致）';
      if (question.answer === '×') return '×（本文と不一致）';
      if (question.answer === '〇') return '〇（言及なし）';
    }
    const opts = question.options || group?.bankOptions;
    const found = opts?.find((o) => o.label === question.answer);
    if (found?.text) {
      return `${found.label}：${found.text}${found.meaningJa ? `（${found.meaningJa}）` : ''}`;
    }
    if (found?.altJa) {
      return `${found.label}（${found.altJa}）`;
    }
    return question.answer;
  };

  const officialAnswerText = formatOfficialAnswer();

  return (
    <div className="space-y-3.5 rounded-2xl border border-[#DCE8E0] bg-[#F7FBF8] p-4 sm:p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DFECE4] pb-2.5">
        <div className="flex items-center gap-2">
          <BookOpenCheck className="h-4 w-4 text-[#2E7D5B]" />
          <span className="text-sm font-bold text-[#1B4D38]">
            {question.isSubjective ? '模範解答・日本語解説' : '正解と詳しい日本語解説'}
          </span>
        </div>
        {officialAnswerText && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2E7D5B] px-3 py-0.5 text-xs font-bold text-white">
            <CheckCircle2 className="h-3.5 w-3.5" />
            正解：{officialAnswerText}
          </span>
        )}
      </div>

      {/* Listening Transcript if available */}
      {transcript && transcript.length > 0 && (
        <div className="rounded-xl border border-[#E6DFD1] bg-white p-3.5">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#1E3A5F]">
            <MessageSquareText className="h-3.5 w-3.5" />
            リスニング原文（音声スクリプト）
          </div>
          <div className="space-y-2">
            {transcript.map((line, i) => (
              <div key={i} className="text-sm leading-relaxed">
                <div className="flex items-baseline gap-2">
                  {line.speaker && (
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold ${
                        line.speaker === '男'
                          ? 'bg-[#EEF4FA] text-[#1E3A5F]'
                          : line.speaker === '女'
                          ? 'bg-[#FFF2F0] text-[#C83E2B]'
                          : 'bg-[#F3EFE8] text-[#6B4E1B]'
                      }`}
                    >
                      {line.speaker}
                    </span>
                  )}
                  <div className="flex-1">
                    {showPinyin && line.pinyin && (
                      <div className="text-xs text-[#6B7280]">{line.pinyin}</div>
                    )}
                    <div lang="zh-CN" className="font-zh font-medium text-[#1F2328]">
                      {line.text}
                    </div>
                    {line.ja && (
                      <div className="mt-0.5 text-xs text-[#57606A]">{line.ja}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Japanese Translation */}
      <div className="rounded-xl border border-[#E6DFD1] bg-white p-3.5">
        <div className="text-xs font-bold text-[#736B5E]">日本語訳</div>
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-[#1F2328]">
          {question.translationJa}
        </p>
        {group?.passageJa && (
          <details className="mt-2.5 rounded-lg bg-[#FAF8F4] px-3 py-2 text-xs text-[#4B5563]">
            <summary className="cursor-pointer font-bold text-[#1E3A5F]">
              共通長文の全文日本語訳を見る
            </summary>
            <p className="mt-2 whitespace-pre-line leading-relaxed text-[#374151]">
              {group.passageJa}
            </p>
          </details>
        )}
      </div>

      {/* Why is this correct? */}
      <div className="rounded-xl border border-[#DCE8E0] bg-white p-3.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#2E7D5B]">
          <Sparkles className="h-3.5 w-3.5" />
          {question.isSubjective ? '解答の構成アプローチ・ポイント' : 'なぜこれが正解？'}
        </div>
        <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-[#1F2328]">
          {question.explanationJa}
        </p>

        {/* Option meanings if MCQ */}
        {question.options && question.options.some((o) => o.meaningJa) && (
          <div className="mt-3 grid grid-cols-1 gap-1.5 border-t border-[#F0ECE3] pt-2.5 sm:grid-cols-2">
            {question.options.map((opt) => (
              <div
                key={opt.label}
                className={`rounded-lg px-2.5 py-1.5 text-xs ${
                  opt.label === question.answer
                    ? 'bg-[#EEF8F2] font-semibold text-[#1B4D38]'
                    : 'bg-[#FAF8F4] text-[#57606A]'
                }`}
              >
                <span className="mr-1.5 font-bold">{opt.label}.</span>
                {opt.text && (
                  <span lang="zh-CN" className="font-zh mr-1.5 text-[#1F2328]">
                    {opt.text}
                  </span>
                )}
                {opt.meaningJa && <span>— {opt.meaningJa}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Model Answer for subjective tasks */}
      {question.modelAnswerZh && (
        <div className="rounded-xl border border-[#DCE6F2] bg-[#F7FAFE] p-3.5">
          <div className="text-xs font-bold text-[#1E3A5F]">模範解答例（中国語）</div>
          {showPinyin && question.modelAnswerPinyin && (
            <p className="mt-1 text-xs leading-relaxed text-[#57606A]">
              {question.modelAnswerPinyin}
            </p>
          )}
          <p
            lang="zh-CN"
            className="font-zh mt-1.5 whitespace-pre-line text-sm font-medium leading-relaxed text-[#1F2328]"
          >
            {question.modelAnswerZh}
          </p>
          {question.modelAnswerJa && (
            <p className="mt-2 border-t border-[#DCE6F2] pt-2 whitespace-pre-line text-xs leading-relaxed text-[#4B5563]">
              【日本語訳】{question.modelAnswerJa}
            </p>
          )}
        </div>
      )}

      {/* Self-check rubric for writing / translation / speaking */}
      {question.rubricJa && question.rubricJa.length > 0 && (
        <div className="rounded-xl border border-[#E7D8BE] bg-[#FDF9F0] p-3.5">
          <div className="mb-2 text-xs font-bold text-[#8A5A11]">
            自己採点チェックリスト（確認できた項目にチェック）
          </div>
          <div className="space-y-1.5">
            {question.rubricJa.map((item, idx) => {
              const checked = Boolean(checkedRubric?.[idx]);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onToggleRubric?.(idx)}
                  className="flex w-full cursor-pointer items-start gap-2 rounded-lg px-2 py-1 text-left text-xs text-[#4B3611] transition hover:bg-[#F7ECD4]"
                >
                  {checked ? (
                    <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#2E7D5B]" />
                  ) : (
                    <Square className="mt-0.5 h-4 w-4 shrink-0 text-[#B57614]" />
                  )}
                  <span className={checked ? 'font-semibold text-[#1B4D38]' : ''}>
                    {item}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Japanese University Student Study Tip */}
      {question.tipJa && (
        <div className="flex items-start gap-2.5 rounded-xl border border-[#F0DFC1] bg-[#FFFBF2] px-3.5 py-2.5 text-xs leading-relaxed text-[#6B4E1B]">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#C27D1A]" />
          <div>
            <span className="font-bold">日本人学習者向けポイント：</span>
            {question.tipJa}
          </div>
        </div>
      )}
    </div>
  );
};
