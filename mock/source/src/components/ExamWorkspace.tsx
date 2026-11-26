import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Home,
  LayoutGrid,
  Send,
  Type,
  X,
} from 'lucide-react';
import type { AudioSegment, ExamDataset, ExamQuestion, QuestionOrder, TimelineEntry } from '../types';
import { formatTime } from '../hooks/useExamAudio';
import { FullAudioBar } from './AudioControls';
import { QuestionCard, SharedGroupBanner } from './QuestionCard';
import { AnswerSheet } from './AnswerSheet';
import { isObjectiveCorrect } from '../utils/grading';

interface ExamWorkspaceProps {
  dataset: ExamDataset;
  examOrder: QuestionOrder;
  randomQuestions: ExamQuestion[];
  activePartId: string;
  onChangePart: (partId: string) => void;
  answers: Record<number, string>;
  subjectiveRubrics: Record<number, boolean[]>;
  flagged: Record<number, boolean>;
  submitted: boolean;
  elapsedSeconds: number;
  showPinyin: boolean;
  onlyWrong: boolean;
  autoFollowAudio: boolean;
  onTogglePinyin: () => void;
  onToggleOnlyWrong: () => void;
  onToggleAutoFollow: () => void;
  onSelectAnswer: (qId: number, val: string) => void;
  onToggleRubric: (qId: number, idx: number, total: number) => void;
  onToggleFlag: (qId: number) => void;
  onSubmitExam: () => void;
  onOpenReport: () => void;
  onGoLobby: () => void;
  onZoomImage: (src: string, alt: string) => void;
  audio: {
    activeTrack: 'primary' | 'secondary';
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    playbackRate: number;
    activeClipKey: string | null;
    clipProgress: number;
    audioError: string | null;
    toggleClip: (key: string, seg: AudioSegment) => void;
    toggleFullPlay: () => void;
    seekFull: (time: number) => void;
    switchTrack: (track: 'primary' | 'secondary') => void;
    changeRate: (rate: number) => void;
    stop: () => void;
  };
  currentTimelineItem: TimelineEntry | null;
}

export const ExamWorkspace: React.FC<ExamWorkspaceProps> = ({
  dataset,
  examOrder,
  randomQuestions,
  activePartId,
  onChangePart,
  answers,
  subjectiveRubrics,
  flagged,
  submitted,
  elapsedSeconds,
  showPinyin,
  onlyWrong,
  autoFollowAudio,
  onTogglePinyin,
  onToggleOnlyWrong,
  onToggleAutoFollow,
  onSelectAnswer,
  onToggleRubric,
  onToggleFlag,
  onSubmitExam,
  onOpenReport,
  onGoLobby,
  onZoomImage,
  audio,
  currentTimelineItem,
}) => {
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const partIndex = Math.max(
    0,
    dataset.parts.findIndex((p) => p.id === activePartId)
  );
  const currentPart = dataset.parts[partIndex] || dataset.parts[0];

  const visibleQuestions = useMemo(() => {
    const base =
      examOrder === 'random'
        ? randomQuestions
        : dataset.questions.filter((q) => q.partId === currentPart?.id);
    if (!submitted || !onlyWrong) return base;
    return base.filter((q) => !q.isSubjective && !isObjectiveCorrect(q, answers[q.id]));
  }, [examOrder, randomQuestions, dataset.questions, currentPart, submitted, onlyWrong, answers]);

  // Group sequential questions by groupId so shared passages/image banks appear once above their group
  const groupedBlocks = useMemo(() => {
    if (examOrder === 'random') {
      return visibleQuestions.map((q) => ({ groupId: undefined as string | undefined, items: [q] }));
    }
    const blocks: { groupId?: string; items: ExamQuestion[] }[] = [];
    for (const q of visibleQuestions) {
      const last = blocks[blocks.length - 1];
      if (q.groupId && last && last.groupId === q.groupId) {
        last.items.push(q);
      } else {
        blocks.push({ groupId: q.groupId, items: [q] });
      }
    }
    return blocks;
  }, [examOrder, visibleQuestions]);

  const answeredCount = dataset.questions.filter((q) =>
    Boolean((answers[q.id] || '').trim())
  ).length;
  const unansweredCount = dataset.questions.length - answeredCount;
  const flaggedCount = Object.values(flagged).filter(Boolean).length;

  const handleJumpToQuestion = (qId: number, partId: string) => {
    setMobileSheetOpen(false);
    if (examOrder === 'sequential' && partId !== activePartId) {
      onChangePart(partId);
    }
    window.setTimeout(() => {
      const el = document.getElementById(`question-${qId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };

  return (
    <div className="paper-grain min-h-screen pb-16">
      <div className="h-1 w-full bg-gradient-to-r from-[#C83E2B] to-[#1E3A5F]" />

      {/* Top Sticky Workspace Header */}
      <header className="sticky top-0 z-30 border-b border-[#E6DFD1] bg-[#FAF8F4]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                audio.stop();
                onGoLobby();
              }}
              className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[#E6DFD1] bg-white px-3 py-1.5 text-xs font-bold text-[#1E3A5F] hover:bg-[#EEF4FA]"
            >
              <Home className="h-3.5 w-3.5" />
              メニュー
            </button>
            <span className="rounded-lg bg-[#1E3A5F] px-2.5 py-1 text-xs font-bold text-white">
              {dataset.meta.badgeJa} · {submitted ? '解答解説' : '模擬試験'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-xl border border-[#E6DFD1] bg-white px-2.5 py-1.5 font-mono text-xs font-bold text-[#1F2328]">
              <Clock className="h-3.5 w-3.5 text-[#C83E2B]" />
              {formatTime(elapsedSeconds)}
              <span className="font-sans text-[11px] font-normal text-[#736B5E]">
                / {dataset.meta.examMinutes}分
              </span>
            </span>

            <button
              type="button"
              onClick={onTogglePinyin}
              className={`inline-flex cursor-pointer items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition ${
                showPinyin
                  ? 'border-[#1E3A5F] bg-[#1E3A5F] text-white'
                  : 'border-[#E6DFD1] bg-white text-[#57606A]'
              }`}
            >
              <Type className="h-3.5 w-3.5" />
              ピンイン
            </button>

            {submitted && (
              <button
                type="button"
                onClick={onToggleOnlyWrong}
                className={`inline-flex cursor-pointer items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition ${
                  onlyWrong
                    ? 'border-[#C83E2B] bg-[#C83E2B] text-white'
                    : 'border-[#E6DFD1] bg-white text-[#57606A]'
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                間違いのみ
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileSheetOpen(true)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[#E6DFD1] bg-white px-2.5 py-1.5 text-xs font-bold text-[#1E3A5F] lg:hidden"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              シート ({answeredCount}/{dataset.questions.length})
            </button>

            {!submitted ? (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#C83E2B] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#B13524]"
              >
                <Send className="h-3.5 w-3.5" />
                採点・提出
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenReport}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#2E7D5B] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#236548]"
              >
                <Award className="h-3.5 w-3.5" />
                成績レポート
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
        {/* Full Exam Audio Bar (for sequential mode when exam has audio) */}
        {examOrder === 'sequential' && dataset.meta.audioUrl && (
          <div className="mb-4">
            <FullAudioBar
              hasSecondaryTrack={Boolean(dataset.meta.secondaryAudioUrl)}
              activeTrack={audio.activeTrack}
              isPlaying={audio.isPlaying}
              activeClipKey={audio.activeClipKey}
              currentTime={audio.currentTime}
              duration={audio.duration}
              playbackRate={audio.playbackRate}
              autoFollow={autoFollowAudio}
              currentTimelineItem={currentTimelineItem}
              audioError={audio.audioError}
              onTogglePlay={audio.toggleFullPlay}
              onSeek={audio.seekFull}
              onChangeRate={audio.changeRate}
              onToggleAutoFollow={onToggleAutoFollow}
              onSwitchTrack={audio.switchTrack}
            />
          </div>
        )}

        {/* Part Navigation Tabs (sequential mode) */}
        {examOrder === 'sequential' && (
          <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
            {dataset.parts.map((part) => {
              const isActive = part.id === currentPart?.id;
              return (
                <button
                  key={part.id}
                  type="button"
                  onClick={() => {
                    onChangePart(part.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`shrink-0 cursor-pointer rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                    isActive
                      ? 'border-[#1E3A5F] bg-[#1E3A5F] text-white shadow-2xs'
                      : 'border-[#E6DFD1] bg-white text-[#57606A] hover:border-[#C83E2B]/50 hover:text-[#1F2328]'
                  }`}
                >
                  {part.shortLabelJa}
                  <span className="ml-1 opacity-75">
                    ({part.questionRange[0]}–{part.questionRange[1]})
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Main 2-Column Layout: Questions + Sticky Desktop Answer Sheet */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_270px]">
          <div className="space-y-4">
            {examOrder === 'sequential' && currentPart && (
              <div className="rounded-2xl border border-[#E6DFD1] bg-white p-4 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-[#C83E2B]">
                      {currentPart.sectionTitleJa}
                    </div>
                    <h2 className="font-serif-ja text-lg font-bold text-[#1F2328]">
                      {currentPart.titleJa}：{currentPart.subtitleJa}
                    </h2>
                  </div>
                  {currentPart.audioIntro && (
                    <button
                      type="button"
                      onClick={() =>
                        audio.seekFull(currentPart.audioIntro!.start)
                      }
                      className="cursor-pointer rounded-xl border border-[#F0CFC9] bg-[#FFF5F3] px-3 py-1.5 text-xs font-bold text-[#C83E2B] hover:bg-[#FFE9E4]"
                    >
                      このパートの音声から再生
                    </button>
                  )}
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-[#57606A]">
                  {currentPart.instructionJa}
                </p>
                {currentPart.exampleJa && (
                  <p className="mt-1.5 rounded-lg bg-[#FAF8F4] px-3 py-1.5 text-xs text-[#6B7280]">
                    {currentPart.exampleJa}
                  </p>
                )}
              </div>
            )}

            {visibleQuestions.length === 0 ? (
              <div className="rounded-2xl border border-[#E6DFD1] bg-white p-10 text-center text-sm text-[#57606A]">
                {onlyWrong
                  ? 'このパートには間違えた客観問題がありません！素晴らしいです。'
                  : '表示する問題がありません。'}
              </div>
            ) : (
              groupedBlocks.map((block, bIdx) => {
                const groupObj = block.groupId ? dataset.groups[block.groupId] : undefined;
                return (
                  <div key={`${block.groupId || 'solo'}-${bIdx}`} className="space-y-4">
                    {examOrder === 'sequential' && groupObj && (
                      <SharedGroupBanner
                        group={groupObj}
                        showPinyin={showPinyin}
                        audio={{
                          activeClipKey: audio.activeClipKey,
                          isPlaying: audio.isPlaying,
                          clipProgress: audio.clipProgress,
                          playbackRate: audio.playbackRate,
                          audioError: audio.audioError,
                          onToggleClip: audio.toggleClip,
                          onChangeRate: audio.changeRate,
                        }}
                        onZoomImage={onZoomImage}
                      />
                    )}
                    {block.items.map((q) => {
                      const qGroup = q.groupId ? dataset.groups[q.groupId] : undefined;
                      const isActiveAud = Boolean(
                        currentTimelineItem?.questionIds?.includes(q.id) && audio.isPlaying
                      );
                      return (
                        <QuestionCard
                          key={q.id}
                          question={q}
                          group={qGroup}
                          showGroupInside={examOrder === 'random'}
                          mode="exam"
                          showPinyin={showPinyin}
                          userAnswer={answers[q.id] || ''}
                          submitted={submitted}
                          flagged={Boolean(flagged[q.id])}
                          isActiveAudio={isActiveAud}
                          checkedRubric={subjectiveRubrics[q.id]}
                          audio={{
                            activeClipKey: audio.activeClipKey,
                            isPlaying: audio.isPlaying,
                            clipProgress: audio.clipProgress,
                            playbackRate: audio.playbackRate,
                            audioError: audio.audioError,
                            onToggleClip: audio.toggleClip,
                            onChangeRate: audio.changeRate,
                          }}
                          onSelectAnswer={(val) => onSelectAnswer(q.id, val)}
                          onToggleRubric={(rIdx) =>
                            onToggleRubric(q.id, rIdx, q.rubricJa?.length || 0)
                          }
                          onToggleFlag={() => onToggleFlag(q.id)}
                          onZoomImage={onZoomImage}
                        />
                      );
                    })}
                  </div>
                );
              })
            )}

            {/* Part Prev / Next Bar */}
            {examOrder === 'sequential' && (
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  disabled={partIndex <= 0}
                  onClick={() => {
                    onChangePart(dataset.parts[partIndex - 1].id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#E6DFD1] bg-white px-4 py-2.5 text-xs font-bold text-[#4B5563] hover:bg-[#FAF8F4] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  前のパート
                </button>

                {partIndex < dataset.parts.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      onChangePart(dataset.parts[partIndex + 1].id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#1E3A5F] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#162C49]"
                  >
                    次のパート（{dataset.parts[partIndex + 1].shortLabelJa}）
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : !submitted ? (
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(true)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#C83E2B] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#B13524]"
                  >
                    <Send className="h-4 w-4" />
                    答案を提出して採点する
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenReport}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#2E7D5B] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#236548]"
                  >
                    <Award className="h-4 w-4" />
                    成績レポートを見る
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sticky Desktop Answer Sheet */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-[#E6DFD1] bg-white p-4 shadow-2xs">
              <AnswerSheet
                dataset={dataset}
                answers={answers}
                flagged={flagged}
                submitted={submitted}
                activePartId={activePartId}
                onJumpToQuestion={handleJumpToQuestion}
              />
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile Answer Sheet Drawer */}
      {mobileSheetOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/45 lg:hidden"
          onClick={() => setMobileSheetOpen(false)}
        >
          <div
            className="h-full w-80 max-w-[85vw] overflow-y-auto bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-[#1F2328]">解答シート</span>
              <button
                type="button"
                onClick={() => setMobileSheetOpen(false)}
                className="cursor-pointer rounded-lg p-1 text-[#57606A] hover:bg-[#F3EFE8]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <AnswerSheet
              dataset={dataset}
              answers={answers}
              flagged={flagged}
              submitted={submitted}
              activePartId={activePartId}
              onJumpToQuestion={handleJumpToQuestion}
            />
          </div>
        </div>
      )}

      {/* Confirm Submit Modal */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-[#E6DFD1] bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 text-[#C83E2B]">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="font-serif-ja text-lg font-bold text-[#1F2328]">
                答案を提出して採点しますか？
              </h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[#57606A]">
              現在 <strong className="text-[#1F2328]">{answeredCount} / {dataset.questions.length} 問</strong> 解答済みです。
              {unansweredCount > 0 && (
                <span className="text-[#C83E2B]"> 未解答が {unansweredCount} 問あります。</span>
              )}
              {flaggedCount > 0 && (
                <span> 見直しマークが {flaggedCount} 問ついています。</span>
              )}
            </p>
            <p className="mt-2 text-xs text-[#6B7280]">
              提出すると成績レポートと全問の詳しい日本語解説・リスニング原文が表示されます。
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="cursor-pointer rounded-xl border border-[#E6DFD1] bg-white px-4 py-2 text-xs font-bold text-[#57606A] hover:bg-[#FAF8F4]"
              >
                解答に戻る
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  audio.stop();
                  onSubmitExam();
                }}
                className="cursor-pointer rounded-xl bg-[#C83E2B] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#B13524]"
              >
                提出して採点する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
