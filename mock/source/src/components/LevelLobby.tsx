import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Clock,
  FileCheck2,
  FileText,
  GraduationCap,
  Headphones,
  Info,
  ListOrdered,
  Mic,
  PenTool,
  RotateCcw,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Languages,
} from 'lucide-react';
import type { ExamDataset, QuestionOrder, SectionId } from '../types';
import type { PersistedLevelState } from '../hooks/useExamStorage';
import { formatTime } from '../hooks/useExamAudio';
import { resolveAssetUrl } from '../data/registry';

export type PracticeScopeChoice = 'all' | SectionId | `part:${string}`;

interface LevelLobbyProps {
  dataset: ExamDataset;
  levelState: PersistedLevelState;
  onBackToPortal: () => void;
  onStartPractice: (order: QuestionOrder, scope: PracticeScopeChoice) => void;
  onStartExam: (order: QuestionOrder) => void;
  onViewReport: () => void;
  onResetExam: () => void;
}

export const LevelLobby: React.FC<LevelLobbyProps> = ({
  dataset,
  levelState,
  onBackToPortal,
  onStartPractice,
  onStartExam,
  onViewReport,
  onResetExam,
}) => {
  const { meta, parts } = dataset;
  const [practiceOrder, setPracticeOrder] = useState<QuestionOrder>('sequential');
  const [practiceScope, setPracticeScope] = useState<PracticeScopeChoice>('all');
  const [examOrder, setExamOrder] = useState<QuestionOrder>('sequential');

  const answeredCount = Object.keys(levelState.answers).filter((k) =>
    Boolean((levelState.answers[Number(k)] || '').trim())
  ).length;
  const solvedCount = levelState.practiceSolvedIds.length;

  const sectionIcon = (sec: SectionId) => {
    switch (sec) {
      case 'listening':
        return <Headphones className="h-3.5 w-3.5 text-[#C83E2B]" />;
      case 'reading':
        return <BookOpen className="h-3.5 w-3.5 text-[#1E3A5F]" />;
      case 'writing':
        return <PenTool className="h-3.5 w-3.5 text-[#2E7D5B]" />;
      case 'translation':
        return <Languages className="h-3.5 w-3.5 text-[#9A6324]" />;
      case 'speaking':
        return <Mic className="h-3.5 w-3.5 text-[#8B3A62]" />;
    }
  };

  return (
    <div className="paper-grain min-h-screen pb-20">
      <div className="h-1.5 w-full bg-gradient-to-r from-[#C83E2B] via-[#D96B43] to-[#1E3A5F]" />

      {/* Top Sticky Bar */}
      <header className="sticky top-0 z-20 border-b border-[#E6DFD1] bg-[#FAF8F4]/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onBackToPortal}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#E6DFD1] bg-white px-3 py-1.5 text-xs font-bold text-[#1E3A5F] shadow-2xs transition hover:bg-[#EEF4FA]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            級一覧（1–9級・口語）へ戻る
          </button>

          <div className="flex items-center gap-2">
            <a
              href={resolveAssetUrl(meta.pdfQuestionUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-[#E6DFD1] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#4B5563] hover:bg-[#F3EFE8]"
            >
              <FileText className="h-3.5 w-3.5 text-[#C83E2B]" />
              原題PDF
            </a>
            {meta.pdfAnswerUrl && (
              <a
                href={resolveAssetUrl(meta.pdfAnswerUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-[#E6DFD1] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#4B5563] hover:bg-[#F3EFE8]"
              >
                <FileCheck2 className="h-3.5 w-3.5 text-[#2E7D5B]" />
                解答PDF
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 pt-7 sm:px-6 lg:px-8">
        {/* Hero Cover Card */}
        <section className="relative overflow-hidden rounded-3xl border border-[#E6DFD1] bg-white p-6 shadow-xs sm:p-8">
          <div className="pointer-events-none absolute -top-8 -right-8 h-40 w-40 rounded-full bg-[#C83E2B]/[0.04]" />

          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="seal-stamp inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-bold tracking-widest text-[#C83E2B]">
                  {meta.badgeJa}
                </span>
                <span className="rounded-full border border-[#E6DFD1] bg-[#FAF8F4] px-3 py-0.5 text-xs font-semibold text-[#555E6B]">
                  {meta.cefrTag}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF4FA] px-3 py-0.5 text-xs font-semibold text-[#1E3A5F]">
                  <GraduationCap className="h-3.5 w-3.5" />
                  HSK 3.0 公式様巻
                </span>
              </div>

              <h1 className="font-serif-ja text-2xl font-bold tracking-tight text-[#1F2328] sm:text-3xl">
                {meta.titleJa}
              </h1>
              <p lang="zh-CN" className="font-zh mt-1 text-sm text-[#736B5E]">
                {meta.officialTitle}
              </p>

              {/* Section stats */}
              <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {meta.sectionsSummaryJa.slice(0, 3).map((sec) => (
                  <div
                    key={sec.section}
                    className="rounded-xl border border-[#EFEAE0] bg-[#FAF8F4] px-3 py-2.5"
                  >
                    <div className="flex items-center gap-1.5 text-xs text-[#736B5E]">
                      {sectionIcon(sec.section)}
                      {sec.labelJa}
                    </div>
                    <div className="mt-1 text-xs font-bold leading-snug text-[#1F2328] sm:text-sm">
                      {sec.count}問 · {sec.minutesJa}
                    </div>
                  </div>
                ))}
                <div className="rounded-xl border border-[#EFEAE0] bg-[#FAF8F4] px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-[#736B5E]">
                    <Award className="h-3.5 w-3.5 text-[#2E7D5B]" />
                    合格目安
                  </div>
                  <div className="mt-1 whitespace-nowrap text-sm font-bold text-[#1F2328]">
                    {meta.passScore} / {meta.totalScore}点
                  </div>
                </div>
              </div>
            </div>

            {/* Paper Badge */}
            <div className="flex shrink-0 flex-col items-center justify-center rounded-2xl border border-dashed border-[#D8CEBC] bg-[#FCFBF8] px-6 py-5 text-center lg:w-52">
              <div className="font-serif-ja text-2xl font-bold tracking-wider text-[#C83E2B]">
                {meta.badgeJa}
              </div>
              <div className="mt-1 text-[11px] font-semibold tracking-widest text-[#847B6D]">
                全 {meta.totalQuestions} 問 · 約 {meta.examMinutes} 分
              </div>
              <div className="my-2.5 h-px w-20 bg-[#E6DFD1]" />
              {meta.audioDurationSeconds && (
                <div className="inline-flex items-center gap-1 text-xs font-semibold text-[#1E3A5F]">
                  <Clock className="h-3.5 w-3.5" />
                  公式音声 {formatTime(meta.audioDurationSeconds)}
                </div>
              )}
              <div className="mt-1 text-[11px] text-[#6B7280]">
                練習クリア：{solvedCount} / {meta.totalQuestions} 問
              </div>
            </div>
          </div>

          {meta.officialNoteJa && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#DCE6F2] bg-[#F5F9FE] px-3.5 py-2.5 text-xs leading-relaxed text-[#1E3A5F]">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{meta.officialNoteJa}</span>
            </div>
          )}

          {/* Saved Exam Progress Banner */}
          {(answeredCount > 0 || levelState.submitted) && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E7D8BE] bg-[#FDF9F0] px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-[#6B4E1B]">
                <FileCheck2 className="h-4 w-4 shrink-0 text-[#B57614]" />
                {levelState.submitted && levelState.lastScore !== undefined ? (
                  <span>
                    前回の試験モード結果：
                    <strong className="font-bold text-[#1F2328]">
                      {levelState.lastScore} / {meta.totalScore} 点
                    </strong>
                    （
                    {levelState.lastScore >= meta.passScore
                      ? '合格ライン達成！'
                      : `合格ライン ${meta.passScore}点まであと少し`}
                    ）
                  </span>
                ) : (
                  <span>
                    試験モードの途中データがあります（解答済み{' '}
                    <strong className="font-bold text-[#1F2328]">
                      {answeredCount} / {meta.totalQuestions} 問
                    </strong>
                    ）。
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {levelState.submitted && (
                  <button
                    type="button"
                    onClick={onViewReport}
                    className="cursor-pointer rounded-lg bg-[#1E3A5F] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#162C49]"
                  >
                    成績レポートを見る
                  </button>
                )}
                <button
                  type="button"
                  onClick={onResetExam}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#DECFA9] bg-white px-3 py-1.5 text-xs font-semibold text-[#6B4E1B] transition hover:bg-[#FAF2E1]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  模試履歴をリセット
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Two Main Interactive Mode Cards */}
        <section className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Practice Mode Card */}
          <div className="flex flex-col justify-between rounded-3xl border-2 border-[#F0D5CE] bg-white p-6 shadow-xs">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF2F0] px-3 py-1 text-xs font-bold text-[#C83E2B]">
                  <Sparkles className="h-3.5 w-3.5" />
                  おすすめ・定着重視
                </span>
                <span className="text-xs font-semibold text-[#736B5E]">1問ずつ解説</span>
              </div>

              <h2 className="font-serif-ja mt-3 text-xl font-bold text-[#1F2328]">
                練習モード（正解必須ステップ方式）
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-[#57606A] sm:text-sm">
                1問ごとに音声再生・解答確認ができます。間違えると即座に
                <strong className="text-[#C83E2B]">正解と「なぜこれが正解？」の日本語解説</strong>
                が表示され、正しく選び直してから次へ進みます。
              </p>

              {/* Scope Selector */}
              <div className="mt-4 space-y-3">
                <div>
                  <div className="mb-1.5 text-xs font-bold text-[#4B5563]">出題範囲</div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPracticeScope('all')}
                      className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                        practiceScope === 'all'
                          ? 'border-[#C83E2B] bg-[#C83E2B] text-white'
                          : 'border-[#E6DFD1] bg-[#FAF8F4] text-[#57606A] hover:bg-[#F3EFE8]'
                      }`}
                    >
                      全{meta.totalQuestions}問
                    </button>
                    {meta.sectionsSummaryJa.length > 1 &&
                      meta.sectionsSummaryJa.map((sec) => (
                        <button
                          key={sec.section}
                          type="button"
                          onClick={() => setPracticeScope(sec.section)}
                          className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                            practiceScope === sec.section
                              ? 'border-[#C83E2B] bg-[#C83E2B] text-white'
                              : 'border-[#E6DFD1] bg-[#FAF8F4] text-[#57606A] hover:bg-[#F3EFE8]'
                          }`}
                        >
                          {sec.labelJa} ({sec.count})
                        </button>
                      ))}
                  </div>
                </div>

                {/* Order Selector */}
                <div>
                  <div className="mb-1.5 text-xs font-bold text-[#4B5563]">出題順</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPracticeOrder('sequential')}
                      className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                        practiceOrder === 'sequential'
                          ? 'border-[#C83E2B] bg-[#FFF5F3] text-[#C83E2B]'
                          : 'border-[#E6DFD1] bg-white text-[#57606A] hover:bg-[#FAF8F4]'
                      }`}
                    >
                      <ListOrdered className="h-4 w-4" />
                      原題どおり（出題順）
                    </button>
                    <button
                      type="button"
                      onClick={() => setPracticeOrder('random')}
                      className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                        practiceOrder === 'random'
                          ? 'border-[#C83E2B] bg-[#FFF5F3] text-[#C83E2B]'
                          : 'border-[#E6DFD1] bg-white text-[#57606A] hover:bg-[#FAF8F4]'
                      }`}
                    >
                      <Shuffle className="h-4 w-4" />
                      ランダム順
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onStartPractice(practiceOrder, practiceScope)}
              className="mt-5 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#C83E2B] px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#B13524]"
            >
              練習モードを開始する
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Exam Mode Card */}
          <div className="flex flex-col justify-between rounded-3xl border-2 border-[#D2DFEE] bg-white p-6 shadow-xs">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF4FA] px-3 py-1 text-xs font-bold text-[#1E3A5F]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  本番シミュレーション
                </span>
                <span className="text-xs font-semibold text-[#736B5E]">
                  約{meta.examMinutes}分・自動採点
                </span>
              </div>

              <h2 className="font-serif-ja mt-3 text-xl font-bold text-[#1F2328]">
                試験モード（模擬試験・成績レポート）
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-[#57606A] sm:text-sm">
                タイマー・解答シート・公式通し音声（自動追従つき）で本番さながらに解答します。提出後に
                <strong className="text-[#1E3A5F]">成績レポートと全問の詳しい日本語解説</strong>
                を確認できます。
              </p>

              <div className="mt-4">
                <div className="mb-1.5 text-xs font-bold text-[#4B5563]">出題順</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExamOrder('sequential')}
                    className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                      examOrder === 'sequential'
                        ? 'border-[#1E3A5F] bg-[#EEF4FA] text-[#1E3A5F]'
                        : 'border-[#E6DFD1] bg-white text-[#57606A] hover:bg-[#FAF8F4]'
                    }`}
                  >
                    <ListOrdered className="h-4 w-4" />
                    本番どおり（通し音声）
                  </button>
                  <button
                    type="button"
                    onClick={() => setExamOrder('random')}
                    className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                      examOrder === 'random'
                        ? 'border-[#1E3A5F] bg-[#EEF4FA] text-[#1E3A5F]'
                        : 'border-[#E6DFD1] bg-white text-[#57606A] hover:bg-[#FAF8F4]'
                    }`}
                  >
                    <Shuffle className="h-4 w-4" />
                    ランダム順
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onStartExam(examOrder)}
              className="mt-5 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#1E3A5F] px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#162C49]"
            >
              {answeredCount > 0 && !levelState.submitted
                ? '試験モードの続きから再開する'
                : '試験モードを開始する'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        {/* Part-by-Part Structure & Direct Practice Jump */}
        <section className="mt-8 rounded-3xl border border-[#E6DFD1] bg-white p-6 shadow-2xs">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-serif-ja text-lg font-bold text-[#1F2328]">
                試験構成とパート別ピンポイント練習
              </h3>
              <p className="mt-0.5 text-xs text-[#6B7280]">
                苦手なパートだけを選んで1問ずつ練習することもできます。
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {parts.map((part) => (
              <div
                key={part.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[#EFEAE0] bg-[#FAF8F4] px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[11px] font-bold text-[#1E3A5F] shadow-2xs">
                      {sectionIcon(part.section)}
                      {part.shortLabelJa}
                    </span>
                    <span className="text-xs font-bold text-[#1F2328]">
                      第{part.questionRange[0]}〜{part.questionRange[1]}問
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[#57606A]">{part.subtitleJa}</div>
                </div>

                <button
                  type="button"
                  onClick={() => onStartPractice('sequential', `part:${part.id}`)}
                  className="shrink-0 cursor-pointer rounded-xl border border-[#E6DFD1] bg-white px-3 py-1.5 text-xs font-bold text-[#C83E2B] transition hover:border-[#C83E2B] hover:bg-[#FFF5F3]"
                >
                  この部を練習
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
