import React, { useState } from 'react';
import {
  GraduationCap,
  Headphones,
  BookOpen,
  Mic,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Layers,
  Download,
  Sparkles,
  Award,
} from 'lucide-react';
import type { ExamId, ExamSummaryMeta } from '../types';
import { EXAMS_CATALOG } from '../data/registry';
import type { AllLevelsStorage } from '../hooks/useExamStorage';

interface PortalHomeProps {
  storage: AllLevelsStorage;
  onSelectExam: (id: ExamId) => void;
  onExportBackup: () => void;
}

type FilterTab = 'all' | 'beginner' | 'intermediate' | 'advanced' | 'oral';

export const PortalHome: React.FC<PortalHomeProps> = ({
  storage,
  onSelectExam,
  onExportBackup,
}) => {
  const [filter, setFilter] = useState<FilterTab>('all');

  const filteredExams = EXAMS_CATALOG.filter((e) => {
    if (filter === 'all') return true;
    return e.levelGroup === filter;
  });

  const totalQuestionsAll = EXAMS_CATALOG.reduce((s, e) => s + e.totalQuestions, 0);
  const totalSolvedAll = EXAMS_CATALOG.reduce(
    (s, e) => s + (storage[e.id]?.practiceSolvedIds?.length || 0),
    0
  );
  const completedExamCount = EXAMS_CATALOG.filter((e) => storage[e.id]?.submitted).length;

  const badgeTone = (exam: ExamSummaryMeta) => {
    if (exam.category === 'oral') return 'text-[#8B3A62] border-[#8B3A62] bg-[#FDF5F9]';
    if (exam.levelGroup === 'beginner') return 'text-[#2E7D5B] border-[#2E7D5B] bg-[#F2FAF5]';
    if (exam.levelGroup === 'intermediate') return 'text-[#1E3A5F] border-[#1E3A5F] bg-[#F0F5FA]';
    return 'text-[#C83E2B] border-[#C83E2B] bg-[#FFF5F3]';
  };

  return (
    <div className="paper-grain min-h-screen pb-20">
      <div className="h-1.5 w-full bg-gradient-to-r from-[#C83E2B] via-[#D96B43] to-[#1E3A5F]" />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-20 border-b border-[#E6DFD1] bg-[#FAF8F4]/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <a
              href="../index.html"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6DFD1] bg-white px-3 py-1.5 text-xs font-bold text-[#1E3A5F] shadow-2xs transition hover:border-[#1E3A5F]/40 hover:bg-[#EEF4FA]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              単語・漢字・文法へ戻る
            </a>
            <span className="hidden text-xs font-semibold text-[#736B5E] sm:inline">
              HSK 3.0 公式様巻演習ポータル
            </span>
          </div>

          <button
            type="button"
            onClick={onExportBackup}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#E6DFD1] bg-white px-3 py-1.5 text-xs font-semibold text-[#57606A] transition hover:bg-[#F3EFE8]"
          >
            <Download className="h-3.5 w-3.5" />
            学習記録を保存
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pt-7 sm:px-6 lg:px-8">
        {/* Hero Banner */}
        <section className="relative overflow-hidden rounded-3xl border border-[#E6DFD1] bg-white p-6 shadow-xs sm:p-9">
          <div className="pointer-events-none absolute -top-12 -right-10 h-48 w-48 rounded-full bg-[#C83E2B]/[0.045]" />
          <div className="pointer-events-none absolute right-24 -bottom-12 h-36 w-36 rounded-full bg-[#1E3A5F]/[0.045]" />

          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="seal-stamp inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-bold tracking-widest text-[#C83E2B]">
                  HSK 3.0 新版
                </span>
                <span className="rounded-full border border-[#E6DFD1] bg-[#FAF8F4] px-3 py-0.5 text-xs font-semibold text-[#555E6B]">
                  2026年新大綱対応 · 公式様巻全11セット
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF4FA] px-3 py-0.5 text-xs font-semibold text-[#1E3A5F]">
                  <GraduationCap className="h-3.5 w-3.5" />
                  日本の大学生向け中国語対策
                </span>
              </div>

              <h1 className="font-serif-ja text-2xl font-bold tracking-tight text-[#1F2328] sm:text-4xl">
                HSK 3.0 公式様巻・模擬試験演習サイト
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-[#57606A] sm:text-base">
                1級〜9級の筆記様巻（7セット）と3〜6級の口語様巻（4セット）の
                <strong className="font-semibold text-[#1F2328]">全{totalQuestionsAll}問</strong>
                を公式音声・原題イラスト・リスニング原文スクリプト・丁寧な日本語解説つきで完全収録。
                <strong className="font-semibold text-[#C83E2B]">「練習モード」</strong>と
                <strong className="font-semibold text-[#1E3A5F]">「試験モード」</strong>
                で、大学の中国語授業から検定本番まで万全に備えられます。
              </p>
            </div>

            {/* Overall Progress Card */}
            <div className="flex shrink-0 flex-col justify-center gap-3 rounded-2xl border border-[#E6DFD1] bg-[#FCFBF8] p-5 lg:w-64">
              <div className="flex items-center justify-between text-xs font-bold text-[#736B5E]">
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#C83E2B]" />
                  学習進捗サマリー
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-[#EFEAE0] bg-white px-3 py-2.5 text-center">
                  <div className="text-[11px] text-[#736B5E]">練習クリア</div>
                  <div className="mt-0.5 text-lg font-bold text-[#C83E2B]">
                    {totalSolvedAll}
                    <span className="text-xs font-normal text-[#736B5E]">/{totalQuestionsAll}</span>
                  </div>
                </div>
                <div className="rounded-xl border border-[#EFEAE0] bg-white px-3 py-2.5 text-center">
                  <div className="text-[11px] text-[#736B5E]">模試完了</div>
                  <div className="mt-0.5 text-lg font-bold text-[#1E3A5F]">
                    {completedExamCount}
                    <span className="text-xs font-normal text-[#736B5E]">/11</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] leading-relaxed text-[#6B7280]">
                学習履歴はこのブラウザに自動保存されます。
              </p>
            </div>
          </div>
        </section>

        {/* Filter Tabs */}
        <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['all', 'すべて（11セット）'],
                ['beginner', '初級（1・2級）'],
                ['intermediate', '中級（3・4級）'],
                ['advanced', '上級・高等（5・6・7–9級）'],
                ['oral', '口語（3〜6級）'],
              ] as [FilterTab, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`cursor-pointer rounded-full border px-4 py-1.5 text-xs font-bold transition sm:text-sm ${
                  filter === key
                    ? 'border-[#1E3A5F] bg-[#1E3A5F] text-white shadow-2xs'
                    : 'border-[#E6DFD1] bg-white text-[#57606A] hover:border-[#C83E2B]/50 hover:text-[#1F2328]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Exam Cards Grid */}
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredExams.map((exam) => {
            const st = storage[exam.id];
            const solvedCount = st?.practiceSolvedIds?.length || 0;
            const pct = Math.round((solvedCount / exam.totalQuestions) * 100);
            const hasSubmitted = Boolean(st?.submitted && st?.lastScore !== undefined);
            const inProgressCount = Object.keys(st?.answers || {}).filter(
              (k) => Boolean((st?.answers?.[Number(k)] || '').trim())
            ).length;

            return (
              <article
                key={exam.id}
                onClick={() => onSelectExam(exam.id)}
                className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-[#E6DFD1] bg-white p-5 shadow-2xs transition hover:-translate-y-0.5 hover:border-[#C83E2B]/50 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-bold ${badgeTone(
                        exam
                      )}`}
                    >
                      {exam.badgeJa}
                    </span>
                    <span className="rounded-full bg-[#FAF8F4] px-2.5 py-0.5 text-[11px] font-semibold text-[#736B5E]">
                      {exam.cefrTag}
                    </span>
                  </div>

                  <h2 className="font-serif-ja mt-3 text-lg font-bold text-[#1F2328] transition group-hover:text-[#C83E2B]">
                    {exam.titleJa}
                  </h2>
                  <p lang="zh-CN" className="font-zh mt-0.5 text-xs text-[#736B5E]">
                    {exam.officialTitle}
                  </p>

                  {/* Section pills */}
                  <div className="mt-3.5 flex flex-wrap gap-1.5">
                    {exam.sectionsSummaryJa.map((sec) => (
                      <span
                        key={sec.section}
                        className="inline-flex items-center gap-1 rounded-md border border-[#EFEAE0] bg-[#FAF8F4] px-2 py-0.5 text-[11px] font-medium text-[#4B5563]"
                      >
                        {sec.section === 'listening' && (
                          <Headphones className="h-3 w-3 text-[#C83E2B]" />
                        )}
                        {sec.section === 'reading' && (
                          <BookOpen className="h-3 w-3 text-[#1E3A5F]" />
                        )}
                        {sec.section === 'speaking' && (
                          <Mic className="h-3 w-3 text-[#8B3A62]" />
                        )}
                        {sec.labelJa} {sec.count}問
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 space-y-2.5 border-t border-[#F0ECE3] pt-3.5">
                  <div className="flex items-center justify-between text-xs text-[#6B7280]">
                    <span className="inline-flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5" />
                      全{exam.totalQuestions}問
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      約{exam.examMinutes}分
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Award className="h-3.5 w-3.5 text-[#2E7D5B]" />
                      合格 {exam.passScore}/{exam.totalScore}
                    </span>
                  </div>

                  {/* Progress & Last Score */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#736B5E]">
                        練習クリア：{solvedCount}/{exam.totalQuestions}問
                      </span>
                      {hasSubmitted ? (
                        <span className="inline-flex items-center gap-1 font-bold text-[#2E7D5B]">
                          <CheckCircle2 className="h-3 w-3" />
                          模試 {st?.lastScore}/{st?.lastScoreMax}点
                        </span>
                      ) : inProgressCount > 0 ? (
                        <span className="font-semibold text-[#B57614]">
                          模試途中 {inProgressCount}問済
                        </span>
                      ) : (
                        <span className="font-semibold text-[#C83E2B] group-hover:underline">
                          演習を開く →
                        </span>
                      )}
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EFEAE0]">
                      <div
                        className="h-full rounded-full bg-[#2E7D5B] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-1">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1E3A5F] transition group-hover:translate-x-0.5 group-hover:text-[#C83E2B]">
                      練習・模擬試験をはじめる
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Study Guide Footer Note */}
        <section className="mt-10 rounded-2xl border border-[#E6DFD1] bg-white p-5 sm:p-6">
          <h3 className="font-serif-ja text-base font-bold text-[#1F2328]">
            大学生向け・効果的な HSK 3.0 活用法
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-4 text-xs leading-relaxed text-[#57606A] sm:grid-cols-3">
            <div className="rounded-xl bg-[#FAF8F4] p-3.5">
              <div className="font-bold text-[#C83E2B]">1. 練習モードで1問ずつ完全定着</div>
              <p className="mt-1">
                間違えると即座に正解・リスニング原文・詳しい日本語解説が表示されます。正しい答えを選び直すまで進めないため、曖昧なまま流さず確実に定着できます。
              </p>
            </div>
            <div className="rounded-xl bg-[#FAF8F4] p-3.5">
              <div className="font-bold text-[#1E3A5F]">2. 試験モードで本番ペースを体感</div>
              <p className="mt-1">
                公式の通し音声と自動追従機能、本番と同じ試験時間タイマー、解答シートを搭載。提出後の成績レポートで弱点パートを一目で把握できます。
              </p>
            </div>
            <div className="rounded-xl bg-[#FAF8F4] p-3.5">
              <div className="font-bold text-[#2E7D5B]">3. 記述・翻訳・口語も録音＆自己採点</div>
              <p className="mt-1">
                3級以上の作文・7–9級の英中翻訳・口語様巻は、文字数カウンターやマイク録音機能つき。模範解答とチェックリストで実践力を磨けます。
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
