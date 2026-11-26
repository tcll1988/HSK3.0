import React from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  FileSearch,
  Filter,
  Home,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type { ExamDataset } from '../types';
import type { ExamScoreSummary } from '../utils/grading';
import { formatTime } from '../hooks/useExamAudio';

interface ScoreReportProps {
  dataset: ExamDataset;
  score: ExamScoreSummary;
  elapsedSeconds: number;
  onReviewAll: () => void;
  onReviewWrongOnly: () => void;
  onRetryExam: () => void;
  onGoLobby: () => void;
}

export const ScoreReport: React.FC<ScoreReportProps> = ({
  dataset,
  score,
  elapsedSeconds,
  onReviewAll,
  onReviewWrongOnly,
  onRetryExam,
  onGoLobby,
}) => {
  const { meta } = dataset;
  const wrongObjCount = score.objectiveTotal - score.objectiveCorrect;

  return (
    <div className="paper-grain min-h-screen pb-20">
      <div className="h-1.5 w-full bg-gradient-to-r from-[#C83E2B] via-[#D96B43] to-[#1E3A5F]" />

      <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6">
        <div className="rounded-3xl border border-[#E6DFD1] bg-white p-6 shadow-sm sm:p-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="seal-stamp inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-bold tracking-widest text-[#C83E2B]">
              {meta.badgeJa} · 成績レポート
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FAF8F4] px-3 py-1 text-xs font-semibold text-[#57606A]">
              <Clock className="h-3.5 w-3.5" />
              所要時間：{formatTime(elapsedSeconds)}
            </span>
          </div>

          <div className="mt-6 flex flex-col items-center justify-between gap-6 rounded-2xl border border-[#EFEAE0] bg-[#FCFBF8] p-6 sm:flex-row">
            <div>
              <div className="text-xs font-bold text-[#736B5E]">総合スコア（換算）</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-serif-ja text-5xl font-bold text-[#1F2328]">
                  {score.totalScore}
                </span>
                <span className="text-lg font-semibold text-[#736B5E]">
                  / {score.maxScore} 点
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-[#57606A]">
                <span>合格目安：{score.passScore}点以上</span>
                {score.objectiveTotal > 0 && (
                  <span>
                    · 客観問題 {score.objectiveCorrect}/{score.objectiveTotal}問正解
                  </span>
                )}
              </div>
            </div>

            <div
              className={`flex flex-col items-center rounded-2xl border-2 px-6 py-4 text-center ${
                score.passed
                  ? 'border-[#2E7D5B] bg-[#EEF8F2] text-[#1B4D38]'
                  : 'border-[#C83E2B] bg-[#FFF5F3] text-[#A63122]'
              }`}
            >
              <Award className="h-8 w-8" />
              <div className="mt-1.5 text-lg font-bold">
                {score.passed ? '合格ライン達成！' : 'あと一歩で合格！'}
              </div>
              <div className="mt-0.5 text-xs">
                {score.passed
                  ? '素晴らしい実力です。全問解説でさらに盤石にしましょう。'
                  : `合格目安まであと ${Math.max(1, score.passScore - score.totalScore)} 点です。`}
              </div>
            </div>
          </div>

          {/* Section Breakdown */}
          <div className="mt-6 space-y-3">
            <h2 className="font-serif-ja text-base font-bold text-[#1F2328]">
              セクション別スコア内訳
            </h2>
            {score.sections.map((sec) => {
              const pct = sec.maxScore > 0 ? Math.round((sec.earnedScore / sec.maxScore) * 100) : 0;
              return (
                <div
                  key={sec.section}
                  className="rounded-2xl border border-[#EFEAE0] bg-[#FAF8F4] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-bold text-[#1F2328]">{sec.labelJa}</span>
                    <div className="flex items-center gap-3 text-xs">
                      {sec.objectiveTotal > 0 && (
                        <span className="text-[#57606A]">
                          客観 {sec.objectiveCorrect}/{sec.objectiveTotal}問
                        </span>
                      )}
                      {sec.subjectiveTotal > 0 && (
                        <span className="text-[#1E3A5F]">
                          記述・口語 {sec.subjectiveCompleted}/{sec.subjectiveTotal}問（自己採点反映）
                        </span>
                      )}
                      <span className="font-bold text-[#1F2328]">
                        {sec.earnedScore} / {sec.maxScore}点
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#E6DFD1]">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct >= 60 ? 'bg-[#2E7D5B]' : 'bg-[#C83E2B]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {score.subjectiveTotal > 0 && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#DCE6F2] bg-[#F7FAFE] px-4 py-3 text-xs leading-relaxed text-[#1E3A5F]">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                作文・翻訳・口語などの記述問題は、解説画面の「自己採点チェックリスト」をチェックすると換算スコアに自動反映されます。
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onReviewAll}
              className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1E3A5F] px-5 py-3 text-sm font-bold text-white shadow-xs transition hover:bg-[#162C49]"
            >
              <FileSearch className="h-4 w-4" />
              全問の解答・日本語解説を見る
            </button>
            {wrongObjCount > 0 && (
              <button
                type="button"
                onClick={onReviewWrongOnly}
                className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#C83E2B] px-5 py-3 text-sm font-bold text-white shadow-xs transition hover:bg-[#B13524]"
              >
                <Filter className="h-4 w-4" />
                間違えた{wrongObjCount}問だけ復習する
              </button>
            )}
          </div>

          <div className="mt-3 flex flex-wrap justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={onRetryExam}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#E6DFD1] bg-white px-4 py-2 text-xs font-bold text-[#57606A] hover:bg-[#FAF8F4]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              試験をリセットして再挑戦
            </button>
            <button
              type="button"
              onClick={onGoLobby}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#E6DFD1] bg-white px-4 py-2 text-xs font-bold text-[#1E3A5F] hover:bg-[#EEF4FA]"
            >
              <Home className="h-3.5 w-3.5" />
              {meta.badgeJa} トップへ戻る
            </button>
          </div>
        </div>

        {/* Encouragement note */}
        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-[#736B5E]">
          <CheckCircle2 className="h-4 w-4 text-[#2E7D5B]" />
          成績はブラウザに保存されています。いつでも復習・解説確認が可能です。
        </div>
      </div>
    </div>
  );
};
