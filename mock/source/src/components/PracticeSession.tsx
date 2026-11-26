import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Home,
  Lock,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trophy,
  Type,
} from 'lucide-react';
import type { AudioSegment, ExamDataset, ExamQuestion, QuestionOrder } from '../types';
import { QuestionCard } from './QuestionCard';
import { isObjectiveCorrect } from '../utils/grading';

interface PracticeSessionProps {
  dataset: ExamDataset;
  questions: ExamQuestion[];
  order: QuestionOrder;
  scopeLabelJa: string;
  showPinyin: boolean;
  onTogglePinyin: () => void;
  savedAnswers: Record<number, string>;
  savedRubrics: Record<number, boolean[]>;
  activeClipKey: string | null;
  isPlaying: boolean;
  clipProgress: number;
  playbackRate: number;
  audioError?: string | null;
  onToggleClip: (key: string, seg: AudioSegment) => void;
  onChangeRate: (rate: number) => void;
  onStopAudio: () => void;
  onSaveAnswer: (qId: number, val: string) => void;
  onToggleRubric: (qId: number, idx: number, total: number) => void;
  onMarkSolved: (qId: number) => void;
  onZoomImage: (src: string, alt: string) => void;
  onReviewMistakes: (missed: ExamQuestion[]) => void;
  onRestart: () => void;
  onGoExam: () => void;
  onGoLobby: () => void;
}

interface AttemptRecord {
  solved: boolean;
  wrongChoices: string[];
  firstTryCorrect: boolean | null;
  chosenValue: string;
}

export const PracticeSession: React.FC<PracticeSessionProps> = ({
  dataset,
  questions,
  order,
  scopeLabelJa,
  showPinyin,
  onTogglePinyin,
  savedAnswers,
  savedRubrics,
  activeClipKey,
  isPlaying,
  clipProgress,
  playbackRate,
  audioError,
  onToggleClip,
  onChangeRate,
  onStopAudio,
  onSaveAnswer,
  onToggleRubric,
  onMarkSolved,
  onZoomImage,
  onReviewMistakes,
  onRestart,
  onGoExam,
  onGoLobby,
}) => {
  const [index, setIndex] = useState(0);
  const [records, setRecords] = useState<Record<number, AttemptRecord>>({});
  const [finished, setFinished] = useState(false);

  const currentQ = questions[index];
  const partMeta = useMemo(
    () => dataset.parts.find((p) => p.id === currentQ?.partId),
    [dataset.parts, currentQ]
  );
  const group = currentQ?.groupId ? dataset.groups[currentQ.groupId] : undefined;

  const currentRec: AttemptRecord = currentQ
    ? records[currentQ.id] || {
        solved: false,
        wrongChoices: [],
        firstTryCorrect: null,
        chosenValue: savedAnswers[currentQ.id] || '',
      }
    : { solved: false, wrongChoices: [], firstTryCorrect: null, chosenValue: '' };

  const solvedCount = useMemo(
    () => questions.filter((q) => records[q.id]?.solved).length,
    [questions, records]
  );
  const firstTryCount = useMemo(
    () => questions.filter((q) => records[q.id]?.firstTryCorrect === true).length,
    [questions, records]
  );
  const missedQuestions = useMemo(
    () => questions.filter((q) => records[q.id]?.firstTryCorrect === false),
    [questions, records]
  );

  const handleObjectiveChoice = (choice: string) => {
    if (!currentQ || currentRec.solved) return;
    if (currentQ.isSubjective) {
      onSaveAnswer(currentQ.id, choice);
      setRecords((prev) => ({
        ...prev,
        [currentQ.id]: {
          ...(prev[currentQ.id] || {
            solved: false,
            wrongChoices: [],
            firstTryCorrect: null,
            chosenValue: '',
          }),
          chosenValue: choice,
        },
      }));
      return;
    }

    const ok = isObjectiveCorrect(currentQ, choice);
    setRecords((prev) => {
      const existing = prev[currentQ.id] || {
        solved: false,
        wrongChoices: [],
        firstTryCorrect: null,
        chosenValue: '',
      };
      if (ok) {
        onMarkSolved(currentQ.id);
        return {
          ...prev,
          [currentQ.id]: {
            solved: true,
            wrongChoices: existing.wrongChoices,
            firstTryCorrect: existing.firstTryCorrect === null ? true : existing.firstTryCorrect,
            chosenValue: choice,
          },
        };
      }
      const nextWrong = existing.wrongChoices.includes(choice)
        ? existing.wrongChoices
        : [...existing.wrongChoices, choice];
      return {
        ...prev,
        [currentQ.id]: {
          solved: false,
          wrongChoices: nextWrong,
          firstTryCorrect: false,
          chosenValue: choice,
        },
      };
    });
  };

  const handleCheckSubjective = () => {
    if (!currentQ) return;
    onMarkSolved(currentQ.id);
    setRecords((prev) => {
      const existing = prev[currentQ.id] || {
        solved: false,
        wrongChoices: [],
        firstTryCorrect: true,
        chosenValue: savedAnswers[currentQ.id] || '',
      };
      return {
        ...prev,
        [currentQ.id]: {
          ...existing,
          solved: true,
          firstTryCorrect: true,
        },
      };
    });
  };

  const handleNext = () => {
    if (!currentRec.solved) return;
    onStopAudio();
    if (index < questions.length - 1) {
      setIndex((i) => i + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setFinished(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (index === 0) return;
    onStopAudio();
    setIndex((i) => i - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (finished) {
    const pct = questions.length > 0 ? Math.round((firstTryCount / questions.length) * 100) : 0;
    return (
      <div className="paper-grain min-h-screen px-4 py-10">
        <div className="mx-auto max-w-2xl rounded-3xl border border-[#E6DFD1] bg-white p-7 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFF2F0] text-[#C83E2B]">
            <Trophy className="h-9 w-9" />
          </div>
          <h1 className="font-serif-ja mt-4 text-2xl font-bold text-[#1F2328] sm:text-3xl">
            練習セッション完了！
          </h1>
          <p className="mt-2 text-sm text-[#57606A]">
            {dataset.meta.badgeJa} · {scopeLabelJa}（{order === 'random' ? 'ランダム順' : '原題順'}）の全
            {questions.length}問をやり遂げました。
          </p>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-[#EFEAE0] bg-[#FAF8F4] p-3.5">
              <div className="text-xs text-[#736B5E]">完了問題数</div>
              <div className="mt-1 text-xl font-bold text-[#1F2328]">{questions.length}問</div>
            </div>
            <div className="rounded-2xl border border-[#DCE8E0] bg-[#F4FBF7] p-3.5">
              <div className="text-xs text-[#2E7D5B]">一発正解</div>
              <div className="mt-1 text-xl font-bold text-[#2E7D5B]">
                {firstTryCount}問 ({pct}%)
              </div>
            </div>
            <div className="rounded-2xl border border-[#F3C6BE] bg-[#FFF5F3] p-3.5">
              <div className="text-xs text-[#C83E2B]">要復習</div>
              <div className="mt-1 text-xl font-bold text-[#C83E2B]">
                {missedQuestions.length}問
              </div>
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            {missedQuestions.length > 0 && (
              <button
                type="button"
                onClick={() => onReviewMistakes(missedQuestions)}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#C83E2B] px-5 py-3 text-sm font-bold text-white shadow-xs hover:bg-[#B13524]"
              >
                <RotateCcw className="h-4 w-4" />
                間違えた{missedQuestions.length}問だけ復習する
              </button>
            )}
            <button
              type="button"
              onClick={onGoExam}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1E3A5F] px-5 py-3 text-sm font-bold text-white shadow-xs hover:bg-[#162C49]"
            >
              <ShieldCheck className="h-4 w-4" />
              試験モードに挑戦
            </button>
            <button
              type="button"
              onClick={onRestart}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#E6DFD1] bg-white px-4 py-3 text-sm font-bold text-[#4B5563] hover:bg-[#FAF8F4]"
            >
              もう1周練習する
            </button>
            <button
              type="button"
              onClick={onGoLobby}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#E6DFD1] bg-white px-4 py-3 text-sm font-bold text-[#4B5563] hover:bg-[#FAF8F4]"
            >
              <Home className="h-4 w-4" />
              メニューへ
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQ) return null;

  const pctProgress = Math.round(((index + (currentRec.solved ? 1 : 0)) / questions.length) * 100);

  return (
    <div className="paper-grain min-h-screen pb-24">
      <div className="h-1 w-full bg-gradient-to-r from-[#C83E2B] to-[#1E3A5F]" />

      {/* Top Sticky Header */}
      <header className="sticky top-0 z-20 border-b border-[#E6DFD1] bg-[#FAF8F4]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onStopAudio();
                onGoLobby();
              }}
              className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[#E6DFD1] bg-white px-3 py-1.5 text-xs font-bold text-[#1E3A5F] hover:bg-[#EEF4FA]"
            >
              <Home className="h-3.5 w-3.5" />
              終了
            </button>
            <span className="rounded-lg bg-[#FFF2F0] px-2.5 py-1 text-xs font-bold text-[#C83E2B]">
              {dataset.meta.badgeJa} · 練習
            </span>
            <span className="hidden text-xs font-semibold text-[#6B7280] sm:inline">
              {scopeLabelJa}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-lg border border-[#E6DFD1] bg-white px-2.5 py-1 text-xs font-bold text-[#1F2328]">
              <Sparkles className="h-3.5 w-3.5 text-[#2E7D5B]" />
              {index + 1} / {questions.length}
            </span>

            <button
              type="button"
              onClick={onTogglePinyin}
              className={`inline-flex cursor-pointer items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition ${
                showPinyin
                  ? 'border-[#1E3A5F] bg-[#1E3A5F] text-white'
                  : 'border-[#E6DFD1] bg-white text-[#57606A] hover:bg-[#F3EFE8]'
              }`}
            >
              <Type className="h-3.5 w-3.5" />
              ピンイン {showPinyin ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
        <div className="h-1 w-full bg-[#EFEAE0]">
          <div
            className="h-full bg-[#C83E2B] transition-all duration-300"
            style={{ width: `${pctProgress}%` }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pt-5 sm:px-6">
        {/* Part Instruction Strip */}
        {partMeta && (
          <div className="mb-4 rounded-2xl border border-[#E6DFD1] bg-white px-4 py-3 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-[#1E3A5F]">
                {partMeta.sectionTitleJa} · {partMeta.titleJa}（{partMeta.subtitleJa}）
              </div>
              <span className="text-[11px] font-semibold text-[#736B5E]">
                クリア済 {solvedCount}/{questions.length}問
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[#57606A]">
              {partMeta.instructionJa}
            </p>
          </div>
        )}

        {/* Question Card */}
        <QuestionCard
          question={currentQ}
          group={group}
          showGroupInside
          mode="practice"
          showPinyin={showPinyin}
          userAnswer={currentQ.isSubjective ? savedAnswers[currentQ.id] || '' : currentRec.chosenValue}
          wrongChoices={currentRec.wrongChoices}
          isSolved={currentRec.solved}
          checkedRubric={savedRubrics[currentQ.id]}
          audio={{
            activeClipKey,
            isPlaying,
            clipProgress,
            playbackRate,
            audioError,
            onToggleClip,
            onChangeRate,
          }}
          onSelectAnswer={handleObjectiveChoice}
          onSubmitShortInput={handleObjectiveChoice}
          onCheckSubjective={handleCheckSubjective}
          onToggleRubric={(rIdx) =>
            onToggleRubric(currentQ.id, rIdx, currentQ.rubricJa?.length || 0)
          }
          onZoomImage={onZoomImage}
        />

        {/* Quick Question Step Dots (compact scroll strip) */}
        <div className="mt-5 flex items-center gap-1.5 overflow-x-auto pb-1">
          {questions.map((q, i) => {
            const rec = records[q.id];
            const isCur = i === index;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => {
                  onStopAudio();
                  setIndex(i);
                }}
                className={`h-7 min-w-7 shrink-0 cursor-pointer rounded-lg border px-1.5 text-[11px] font-bold transition ${
                  isCur
                    ? 'border-[#C83E2B] bg-[#C83E2B] text-white'
                    : rec?.solved && rec.firstTryCorrect
                    ? 'border-[#B6DFC8] bg-[#EEF8F2] text-[#1B4D38]'
                    : rec?.solved
                    ? 'border-[#E7D8BE] bg-[#FDF9F0] text-[#8A5A11]'
                    : 'border-[#E6DFD1] bg-white text-[#6B7280] hover:bg-[#FAF8F4]'
                }`}
              >
                {q.id}
              </button>
            );
          })}
        </div>
      </main>

      {/* Fixed Bottom Navigation Footer */}
      <footer className="fixed right-0 bottom-0 left-0 z-20 border-t border-[#E6DFD1] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            disabled={index === 0}
            onClick={handlePrev}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#E6DFD1] bg-white px-4 py-2.5 text-xs font-bold text-[#4B5563] transition hover:bg-[#FAF8F4] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            前の問題
          </button>

          <div className="text-center text-xs text-[#6B7280]">
            {currentRec.solved ? (
              <span className="inline-flex items-center gap-1 font-bold text-[#2E7D5B]">
                <CheckCircle2 className="h-4 w-4" />
                クリア！次へ進めます
              </span>
            ) : (
              <span>
                {currentQ.isSubjective
                  ? '解答または録音後、解説を確認すると次へ進めます'
                  : '正解を選ぶと次の問題へ進めます'}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={!currentRec.solved}
            onClick={handleNext}
            className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold transition sm:text-sm ${
              currentRec.solved
                ? 'cursor-pointer bg-[#C83E2B] text-white shadow-xs hover:bg-[#B13524]'
                : 'cursor-not-allowed bg-[#E6DFD1] text-[#8C8478]'
            }`}
          >
            {!currentRec.solved && <Lock className="h-3.5 w-3.5" />}
            {index === questions.length - 1 ? '結果を見る' : '次の問題へ'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </div>
  );
};
