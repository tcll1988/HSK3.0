import React from 'react';
import {
  Check,
  X,
  ZoomIn,
  Flag,
  CheckCircle2,
  XCircle,
  BookOpen,
  PenTool,
  Languages,
  Send,
} from 'lucide-react';
import type { AudioSegment, ChoiceOption, ExamQuestion, SharedGroup } from '../types';
import { resolveAssetUrl } from '../data/registry';
import { ClipPlayButton } from './AudioControls';
import { VoiceRecorder } from './VoiceRecorder';
import { ExplanationPanel } from './ExplanationPanel';
import { countChineseChars, isObjectiveCorrect } from '../utils/grading';

interface AudioCallbacks {
  activeClipKey: string | null;
  isPlaying: boolean;
  clipProgress: number;
  playbackRate: number;
  audioError?: string | null;
  onToggleClip: (key: string, seg: AudioSegment) => void;
  onChangeRate: (rate: number) => void;
}

interface SharedGroupBannerProps {
  group: SharedGroup;
  showPinyin: boolean;
  audio?: AudioCallbacks;
  onZoomImage: (src: string, alt: string) => void;
}

export const SharedGroupBanner: React.FC<SharedGroupBannerProps> = ({
  group,
  showPinyin,
  audio,
  onZoomImage,
}) => {
  const hasPassage = Boolean(group.passageZh || group.passageImage || group.tableRows);
  const hasBank = Boolean(group.bankOptions && group.bankOptions.length > 0);
  const hasAudio = Boolean(group.audio && audio);

  if (!hasPassage && !hasBank && !hasAudio) return null;

  return (
    <div className="space-y-3 rounded-2xl border border-[#E6DFD1] bg-[#FCFBF8] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[#1E3A5F]">
          <BookOpen className="h-4 w-4 text-[#C83E2B]" />
          <span>{group.titleJa || '共通資料・選択肢'}</span>
        </div>
        {group.fixedAnchorNoteJa && (
          <span className="rounded-full bg-[#FFF5E6] px-2.5 py-0.5 text-[11px] font-bold text-[#8A5A11]">
            {group.fixedAnchorNoteJa}
          </span>
        )}
      </div>

      {group.instructionJa && (
        <p className="text-xs leading-relaxed text-[#57606A]">{group.instructionJa}</p>
      )}

      {group.audio && audio && (
        <ClipPlayButton
          clipKey={`grp-${group.id}`}
          segment={group.audio}
          label="共通リスニング音声を再生"
          activeClipKey={audio.activeClipKey}
          isPlaying={audio.isPlaying}
          clipProgress={audio.clipProgress}
          playbackRate={audio.playbackRate}
          audioError={audio.audioError}
          onToggleClip={audio.onToggleClip}
          onChangeRate={audio.onChangeRate}
          compact
        />
      )}

      {group.passageImage && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() =>
              onZoomImage(
                resolveAssetUrl(group.passageImage),
                group.passageImageAlt || group.titleJa || '問題画像'
              )
            }
            className="group relative cursor-zoom-in overflow-hidden rounded-xl border border-[#E6DFD1] bg-white p-2 shadow-2xs transition hover:border-[#C83E2B]/50"
          >
            <img
              src={resolveAssetUrl(group.passageImage)}
              alt={group.passageImageAlt || '問題図版'}
              className="max-h-72 w-auto rounded-lg object-contain"
              loading="lazy"
            />
            <span className="absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-semibold text-white opacity-85 transition group-hover:opacity-100">
              <ZoomIn className="h-3 w-3" />
              拡大
            </span>
          </button>
        </div>
      )}

      {group.passageZh && (
        <div className="rounded-xl border border-[#EAE4D7] bg-white p-4">
          {showPinyin && group.passagePinyin && (
            <p className="mb-2 whitespace-pre-line text-xs leading-relaxed text-[#6B7280]">
              {group.passagePinyin}
            </p>
          )}
          <div
            lang="zh-CN"
            className="font-zh whitespace-pre-line text-[15px] leading-8 text-[#1F2328] sm:text-base"
          >
            {group.passageZh}
          </div>
        </div>
      )}

      {group.tableRows && group.tableRows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[#E6DFD1] bg-white">
          <table className="w-full border-collapse text-left text-xs sm:text-sm">
            <tbody>
              {group.tableRows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className={
                    rIdx === 0
                      ? 'bg-[#EEF4FA] font-bold text-[#1E3A5F]'
                      : rIdx % 2 === 0
                      ? 'bg-[#FAF8F4]'
                      : 'bg-white'
                  }
                >
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      lang="zh-CN"
                      className="font-zh border border-[#E6DFD1] px-3 py-2 align-top leading-relaxed"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasBank && group.bankOptions && (
        <div>
          {group.bankOptions.some((o) => o.image) ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {group.bankOptions.map((opt) => {
                const isExample = group.usedExampleLabel === opt.label;
                return (
                  <div
                    key={opt.label}
                    className={`relative overflow-hidden rounded-xl border bg-white p-2 ${
                      isExample
                        ? 'border-dashed border-[#D1C7B7] opacity-65'
                        : 'border-[#E6DFD1]'
                    }`}
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#1E3A5F] text-xs font-bold text-white">
                        {opt.label}
                      </span>
                      {isExample && (
                        <span className="rounded bg-[#EFEAE0] px-1.5 py-0.5 text-[10px] font-bold text-[#736B5E]">
                          例題済
                        </span>
                      )}
                    </div>
                    {opt.image && (
                      <button
                        type="button"
                        onClick={() =>
                          onZoomImage(
                            resolveAssetUrl(opt.image),
                            opt.altJa || `選択肢 ${opt.label}`
                          )
                        }
                        className="group relative flex h-28 w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-lg bg-[#FAF8F4]"
                      >
                        <img
                          src={resolveAssetUrl(opt.image)}
                          alt={opt.altJa || `選択肢 ${opt.label}`}
                          className="max-h-28 w-auto object-contain"
                          loading="lazy"
                        />
                        <span className="absolute right-1.5 bottom-1.5 rounded bg-black/55 p-1 text-white opacity-0 transition group-hover:opacity-100">
                          <ZoomIn className="h-3 w-3" />
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {group.bankOptions.map((opt) => {
                const isExample = group.usedExampleLabel === opt.label;
                return (
                  <div
                    key={opt.label}
                    className={`flex items-start gap-2.5 rounded-xl border px-3 py-2 ${
                      isExample
                        ? 'border-dashed border-[#D8CEBC] bg-[#F5F2EB] opacity-70'
                        : 'border-[#E6DFD1] bg-white'
                    }`}
                  >
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#1E3A5F] text-xs font-bold text-white">
                      {opt.label}
                    </span>
                    <div className="min-w-0 flex-1">
                      {showPinyin && opt.pinyin && (
                        <div className="text-[11px] text-[#6B7280]">{opt.pinyin}</div>
                      )}
                      <div
                        lang="zh-CN"
                        className="font-zh text-sm leading-relaxed text-[#1F2328]"
                      >
                        {opt.text}
                      </div>
                      {isExample && (
                        <span className="mt-0.5 inline-block text-[10px] font-bold text-[#8A7E6D]">
                          ※ 例題で使用済み
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface QuestionCardProps {
  question: ExamQuestion;
  group?: SharedGroup;
  showGroupInside?: boolean;
  mode: 'practice' | 'exam';
  showPinyin: boolean;
  userAnswer: string;
  wrongChoices?: string[];
  isSolved?: boolean;
  submitted?: boolean;
  flagged?: boolean;
  isActiveAudio?: boolean;
  checkedRubric?: boolean[];
  audio?: AudioCallbacks;
  onSelectAnswer: (val: string) => void;
  onSubmitShortInput?: (val: string) => void;
  onCheckSubjective?: () => void;
  onToggleRubric?: (idx: number) => void;
  onToggleFlag?: () => void;
  onZoomImage: (src: string, alt: string) => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  group,
  showGroupInside = false,
  mode,
  showPinyin,
  userAnswer,
  wrongChoices = [],
  isSolved = false,
  submitted = false,
  flagged = false,
  isActiveAudio = false,
  checkedRubric,
  audio,
  onSelectAnswer,
  onSubmitShortInput,
  onCheckSubjective,
  onToggleRubric,
  onToggleFlag,
  onZoomImage,
}) => {
  const [draftInput, setDraftInput] = React.useState(userAnswer || '');
  React.useEffect(() => {
    setDraftInput(userAnswer || '');
  }, [question.id, userAnswer]);

  const showExplanation =
    (mode === 'practice' && (isSolved || wrongChoices.length > 0)) ||
    (mode === 'exam' && submitted);

  const objectiveRight = submitted && !question.isSubjective && isObjectiveCorrect(question, userAnswer);
  const objectiveWrong = submitted && !question.isSubjective && !objectiveRight;

  // Determine choice buttons for objective choice questions
  const resolveChoiceList = (): ChoiceOption[] => {
    if (question.kind === 'tf_ng') {
      return [
        { label: '√', text: '一致する（符合原文）' },
        { label: '×', text: '一致しない（不符合原文）' },
        { label: '〇', text: '言及なし（原文未提及）' },
      ];
    }
    if (question.options && question.options.length > 0) return question.options;
    if (group?.bankOptions && group.bankOptions.length > 0) return group.bankOptions;
    return [];
  };

  const choices = resolveChoiceList();
  const isImageChoice = question.kind === 'image_choice';
  const isBankPicker = question.kind === 'image_bank' || question.kind === 'match_bank';
  const charCount = countChineseChars(userAnswer);

  return (
    <article
      id={`question-${question.id}`}
      className={`rounded-2xl border bg-white p-4 shadow-2xs transition sm:p-6 ${
        isActiveAudio
          ? 'border-[#C83E2B] ring-2 ring-[#C83E2B]/15'
          : objectiveWrong
          ? 'border-[#E7A8A0]'
          : objectiveRight || (mode === 'practice' && isSolved)
          ? 'border-[#A7D7BE]'
          : 'border-[#E6DFD1]'
      }`}
    >
      {/* Top Row: Question Number + Status + Flag */}
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2.5 text-sm font-bold ${
              isActiveAudio
                ? 'bg-[#C83E2B] text-white'
                : 'bg-[#1E3A5F] text-white'
            }`}
          >
            第 {question.id} 問
          </span>
          {question.keywordZh && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#F0CFC9] bg-[#FFF5F3] px-3 py-0.5 text-xs font-bold text-[#C83E2B]">
              指定語：
              <span lang="zh-CN" className="font-zh text-sm">
                {question.keywordZh}
              </span>
              {showPinyin && question.keywordPinyin && (
                <span className="font-normal text-[#8E3A2F]">
                  ({question.keywordPinyin})
                </span>
              )}
            </span>
          )}
          {question.minChars && (
            <span className="rounded-full bg-[#EEF4FA] px-2.5 py-0.5 text-xs font-semibold text-[#1E3A5F]">
              目安：{question.minChars}字以上
            </span>
          )}
          {submitted && !question.isSubjective && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                objectiveRight
                  ? 'bg-[#EAF7F0] text-[#1E6B47]'
                  : 'bg-[#FFF1EF] text-[#B92E1C]'
              }`}
            >
              {objectiveRight ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  正解
                </>
              ) : (
                <>
                  <XCircle className="h-3.5 w-3.5" />
                  不正解（正解：{question.answer}）
                </>
              )}
            </span>
          )}
        </div>

        {mode === 'exam' && onToggleFlag && (
          <button
            type="button"
            onClick={onToggleFlag}
            className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
              flagged
                ? 'border-[#E6B86A] bg-[#FFF7E6] text-[#9A6324]'
                : 'border-[#E6DFD1] bg-[#FAF8F4] text-[#6B7280] hover:bg-[#F0EAE0]'
            }`}
          >
            <Flag className={`h-3.5 w-3.5 ${flagged ? 'fill-current' : ''}`} />
            {flagged ? '見直し中' : 'あとで見直す'}
          </button>
        )}
      </div>

      {/* Optional SharedGroup inside (for Practice Mode or Random Exam Mode) */}
      {showGroupInside && group && (
        <div className="mb-4">
          <SharedGroupBanner
            group={group}
            showPinyin={showPinyin}
            audio={audio}
            onZoomImage={onZoomImage}
          />
        </div>
      )}

      {/* Per-Question Audio Clip */}
      {question.audio && audio && (
        <div className="mb-4">
          <ClipPlayButton
            clipKey={`q-${question.id}`}
            segment={question.audio}
            label={`第${question.id}問の音声を再生`}
            activeClipKey={audio.activeClipKey}
            isPlaying={audio.isPlaying}
            clipProgress={audio.clipProgress}
            playbackRate={audio.playbackRate}
            audioError={audio.audioError}
            onToggleClip={audio.onToggleClip}
            onChangeRate={audio.onChangeRate}
          />
        </div>
      )}

      {/* Question-Specific Single Image or Multi-panel Sequence */}
      {question.image && (
        <div className="mb-4 flex justify-center">
          <button
            type="button"
            onClick={() =>
              onZoomImage(
                resolveAssetUrl(question.image),
                question.imageAltJa || `第${question.id}問の画像`
              )
            }
            className="group relative cursor-zoom-in overflow-hidden rounded-xl border border-[#E6DFD1] bg-[#FAF8F4] p-2 transition hover:border-[#C83E2B]/50"
          >
            <img
              src={resolveAssetUrl(question.image)}
              alt={question.imageAltJa || `第${question.id}問の画像`}
              className="max-h-72 w-auto rounded-lg object-contain"
              loading="lazy"
            />
            <span className="absolute right-2.5 bottom-2.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
              <ZoomIn className="h-3 w-3" />
              拡大
            </span>
          </button>
        </div>
      )}

      {question.images && question.images.length > 0 && (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {question.images.map((imgPath, i) => (
            <button
              key={i}
              type="button"
              onClick={() =>
                onZoomImage(resolveAssetUrl(imgPath), `第${question.id}問 コマ ${i + 1}`)
              }
              className="group relative flex flex-col items-center overflow-hidden rounded-xl border border-[#E6DFD1] bg-[#FAF8F4] p-2.5 transition hover:border-[#C83E2B]/50"
            >
              <span className="mb-1.5 self-start rounded-full bg-[#1E3A5F] px-2 py-0.5 text-[11px] font-bold text-white">
                イラスト {i + 1}
              </span>
              <img
                src={resolveAssetUrl(imgPath)}
                alt={`イラスト ${i + 1}`}
                className="max-h-48 w-auto rounded-lg object-contain"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      {/* Question Text Prompt (Chinese / English) */}
      {(question.promptZh || question.promptSubZh) && (
        <div className="mb-4 space-y-2 rounded-xl border border-[#EFEAE0] bg-[#FAF8F4] p-3.5 sm:p-4">
          {question.promptZh && (
            <div>
              {showPinyin && question.promptPinyin && (
                <p className="mb-0.5 whitespace-pre-line text-xs leading-relaxed text-[#6B7280]">
                  {question.promptPinyin}
                </p>
              )}
              <p
                lang="zh-CN"
                className="font-zh whitespace-pre-line text-base font-medium leading-relaxed text-[#1F2328] sm:text-lg"
              >
                {question.promptZh}
              </p>
            </div>
          )}
          {question.promptSubZh && (
            <div className="border-t border-[#E6DFD1] pt-2">
              {showPinyin && question.promptSubPinyin && (
                <p className="mb-0.5 text-xs text-[#6B7280]">{question.promptSubPinyin}</p>
              )}
              <p
                lang="zh-CN"
                className="font-zh whitespace-pre-line text-sm font-bold text-[#1E3A5F] sm:text-base"
              >
                {question.promptSubZh}
              </p>
            </div>
          )}
        </div>
      )}

      {question.promptEn && (
        <div className="mb-4 rounded-xl border border-[#DCE6F2] bg-[#F7FAFE] p-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-[#1E3A5F]">
            <Languages className="h-4 w-4 text-[#C83E2B]" />
            原文（English → 中国語へ翻訳・通訳）
          </div>
          <p
            lang="en"
            className="whitespace-pre-line text-sm leading-relaxed text-[#1F2328] sm:text-[15px]"
          >
            {question.promptEn}
          </p>
        </div>
      )}

      {/* INTERACTIVE ANSWER AREA */}
      {/* 1. Image Choice (A/B/C images per question) */}
      {isImageChoice && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {choices.map((opt) => {
            const selected = userAnswer === opt.label;
            const isWrongTry = wrongChoices.includes(opt.label);
            const isRightReveal =
              (submitted || (mode === 'practice' && isSolved)) &&
              opt.label === question.answer;
            const isWrongReveal = submitted && selected && opt.label !== question.answer;

            return (
              <div
                key={opt.label}
                className={`flex flex-col overflow-hidden rounded-2xl border-2 transition ${
                  isRightReveal
                    ? 'border-[#2E7D5B] bg-[#EEF8F2]'
                    : isWrongTry || isWrongReveal
                    ? 'border-[#D94A38] bg-[#FFF2F0]'
                    : selected
                    ? 'border-[#1E3A5F] bg-[#EEF4FA]'
                    : 'border-[#E6DFD1] bg-white hover:border-[#C83E2B]/50'
                }`}
              >
                <button
                  type="button"
                  disabled={submitted || (mode === 'practice' && isSolved)}
                  onClick={() => onSelectAnswer(opt.label)}
                  className="flex flex-1 cursor-pointer flex-col items-center p-3 text-center disabled:cursor-default"
                >
                  <div className="mb-2 flex w-full items-center justify-between">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                        isRightReveal
                          ? 'bg-[#2E7D5B] text-white'
                          : isWrongTry || isWrongReveal
                          ? 'bg-[#D94A38] text-white'
                          : selected
                          ? 'bg-[#1E3A5F] text-white'
                          : 'bg-[#F3EFE8] text-[#1F2328]'
                      }`}
                    >
                      {opt.label}
                    </span>
                    {isRightReveal && <Check className="h-4 w-4 text-[#2E7D5B]" />}
                    {(isWrongTry || isWrongReveal) && (
                      <X className="h-4 w-4 text-[#D94A38]" />
                    )}
                  </div>
                  {opt.image && (
                    <img
                      src={resolveAssetUrl(opt.image)}
                      alt={opt.altJa || `選択肢 ${opt.label}`}
                      className="h-32 w-full rounded-lg bg-white object-contain p-1"
                      loading="lazy"
                    />
                  )}
                </button>
                {opt.image && (
                  <button
                    type="button"
                    onClick={() =>
                      onZoomImage(
                        resolveAssetUrl(opt.image),
                        opt.altJa || `第${question.id}問 ${opt.label}`
                      )
                    }
                    className="flex items-center justify-center gap-1 border-t border-[#EFEAE0] bg-[#FAF8F4] py-1 text-[11px] font-medium text-[#6B7280] hover:bg-[#EFEAE0]"
                  >
                    <ZoomIn className="h-3 w-3" />
                    画像を拡大
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Bank Picker (compact A-F / A-G pill buttons) */}
      {isBankPicker && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-[#6B7280]">
            上の選択肢から当てはまる記号を選んでください：
          </div>
          <div className="flex flex-wrap gap-2">
            {choices.map((opt) => {
              const isExample = group?.usedExampleLabel === opt.label;
              const selected = userAnswer === opt.label;
              const isWrongTry = wrongChoices.includes(opt.label);
              const isRightReveal =
                (submitted || (mode === 'practice' && isSolved)) &&
                opt.label === question.answer;
              const isWrongReveal = submitted && selected && opt.label !== question.answer;

              return (
                <button
                  key={opt.label}
                  type="button"
                  disabled={submitted || (mode === 'practice' && isSolved)}
                  onClick={() => onSelectAnswer(opt.label)}
                  className={`inline-flex min-w-14 cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition disabled:cursor-default ${
                    isRightReveal
                      ? 'border-[#2E7D5B] bg-[#2E7D5B] text-white'
                      : isWrongTry || isWrongReveal
                      ? 'border-[#D94A38] bg-[#FFF2F0] text-[#B92E1C]'
                      : selected
                      ? 'border-[#1E3A5F] bg-[#1E3A5F] text-white'
                      : isExample
                      ? 'border-dashed border-[#D8CEBC] bg-[#F5F2EB] text-[#8A7E6D]'
                      : 'border-[#E6DFD1] bg-white text-[#1F2328] hover:border-[#C83E2B]'
                  }`}
                >
                  <span>{opt.label}</span>
                  {opt.text && opt.text.length <= 4 && (
                    <span lang="zh-CN" className="font-zh text-sm font-normal">
                      {opt.text}
                    </span>
                  )}
                  {isRightReveal && <Check className="h-4 w-4" />}
                  {(isWrongTry || isWrongReveal) && <X className="h-4 w-4" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Standard MCQ or TF_NG */}
      {(question.kind === 'mcq' || question.kind === 'tf_ng') && (
        <div
          className={`grid gap-2.5 ${
            question.kind === 'tf_ng'
              ? 'grid-cols-1 sm:grid-cols-3'
              : choices.every((c) => (c.text?.length || 0) <= 10)
              ? 'grid-cols-1 sm:grid-cols-2'
              : 'grid-cols-1'
          }`}
        >
          {choices.map((opt) => {
            const selected = userAnswer === opt.label;
            const isWrongTry = wrongChoices.includes(opt.label);
            const isRightReveal =
              (submitted || (mode === 'practice' && isSolved)) &&
              opt.label === question.answer;
            const isWrongReveal = submitted && selected && opt.label !== question.answer;

            return (
              <button
                key={opt.label}
                type="button"
                disabled={submitted || (mode === 'practice' && isSolved)}
                onClick={() => onSelectAnswer(opt.label)}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-3.5 py-3 text-left transition disabled:cursor-default ${
                  isRightReveal
                    ? 'border-[#2E7D5B] bg-[#EEF8F2]'
                    : isWrongTry || isWrongReveal
                    ? 'border-[#D94A38] bg-[#FFF2F0]'
                    : selected
                    ? 'border-[#1E3A5F] bg-[#EEF4FA]'
                    : 'border-[#E6DFD1] bg-white hover:border-[#C83E2B]/55 hover:bg-[#FFFBF9]'
                }`}
              >
                <span
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                    isRightReveal
                      ? 'bg-[#2E7D5B] text-white'
                      : isWrongTry || isWrongReveal
                      ? 'bg-[#D94A38] text-white'
                      : selected
                      ? 'bg-[#1E3A5F] text-white'
                      : 'bg-[#F3EFE8] text-[#1F2328]'
                  }`}
                >
                  {opt.label}
                </span>
                <div className="min-w-0 flex-1">
                  {showPinyin && opt.pinyin && (
                    <div className="text-[11px] text-[#6B7280]">{opt.pinyin}</div>
                  )}
                  <div
                    lang={question.kind === 'tf_ng' ? 'ja' : 'zh-CN'}
                    className={`${
                      question.kind === 'tf_ng' ? 'text-sm font-semibold' : 'font-zh text-sm sm:text-[15px]'
                    } leading-relaxed text-[#1F2328]`}
                  >
                    {opt.text}
                  </div>
                </div>
                {isRightReveal && <Check className="h-4 w-4 shrink-0 text-[#2E7D5B]" />}
                {(isWrongTry || isWrongReveal) && (
                  <X className="h-4 w-4 shrink-0 text-[#D94A38]" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 4. Short Input (Auto-graded Chinese character / short answer) */}
      {question.kind === 'short_input' && (
        <div className="space-y-2.5">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              lang="zh-CN"
              disabled={submitted || (mode === 'practice' && isSolved)}
              value={draftInput}
              onChange={(e) => {
                setDraftInput(e.target.value);
                if (mode === 'exam') onSelectAnswer(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && mode === 'practice' && onSubmitShortInput) {
                  e.preventDefault();
                  onSubmitShortInput(draftInput);
                }
              }}
              placeholder="中国語（簡体字）で入力してください"
              className="font-zh flex-1 rounded-xl border-2 border-[#E6DFD1] bg-white px-4 py-2.5 text-base text-[#1F2328] outline-none transition focus:border-[#1E3A5F] disabled:bg-[#F5F2EB]"
            />
            {mode === 'practice' && !isSolved && onSubmitShortInput && (
              <button
                type="button"
                onClick={() => onSubmitShortInput(draftInput)}
                className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#C83E2B] px-5 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#B13524]"
              >
                <Send className="h-4 w-4" />
                解答を確認
              </button>
            )}
          </div>
          {mode === 'practice' && wrongChoices.length > 0 && !isSolved && (
            <p className="text-xs font-semibold text-[#C83E2B]">
              不正解です。下の解説で正解の漢字・表記を確認して、もう一度正しく入力すると次へ進めます。
            </p>
          )}
        </div>
      )}

      {/* 5. Writing Task & Written Translation Task */}
      {(question.kind === 'writing_task' ||
        (question.kind === 'translation_task' && !question.speakSeconds)) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 font-bold text-[#1E3A5F]">
              <PenTool className="h-3.5 w-3.5 text-[#C83E2B]" />
              中国語入力エリア
            </span>
            <span
              className={`font-mono font-bold ${
                question.minChars && charCount >= question.minChars
                  ? 'text-[#2E7D5B]'
                  : 'text-[#6B7280]'
              }`}
            >
              現在 {charCount} 字
              {question.minChars ? ` ／ 目標 ${question.minChars} 字以上` : ''}
            </span>
          </div>
          <textarea
            rows={question.minChars && question.minChars >= 150 ? 8 : 4}
            lang="zh-CN"
            value={userAnswer}
            onChange={(e) => onSelectAnswer(e.target.value)}
            placeholder={
              question.keywordZh
                ? `「${question.keywordZh}」を使って自然な中国語の文を1つ書いてみましょう`
                : 'ここに中国語で解答を入力してください（自動保存されます）'
            }
            className="font-zh w-full rounded-xl border-2 border-[#E6DFD1] bg-white px-4 py-3 text-base leading-relaxed text-[#1F2328] outline-none transition focus:border-[#1E3A5F]"
          />
          {mode === 'practice' && !isSolved && onCheckSubjective && (
            <button
              type="button"
              onClick={onCheckSubjective}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#2E7D5B] px-5 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#236548]"
            >
              <CheckCircle2 className="h-4 w-4" />
              模範解答と解説を見て自己採点する
            </button>
          )}
        </div>
      )}

      {/* 6. Speaking Task & Oral Interpretation Task */}
      {(question.kind === 'speaking_task' ||
        (question.kind === 'translation_task' && Boolean(question.speakSeconds))) && (
        <div className="space-y-3">
          <VoiceRecorder
            prepSeconds={question.prepSeconds}
            speakSeconds={question.speakSeconds}
            memoValue={userAnswer}
            onMemoChange={onSelectAnswer}
          />
          {mode === 'practice' && !isSolved && onCheckSubjective && (
            <button
              type="button"
              onClick={onCheckSubjective}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#2E7D5B] px-5 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#236548]"
            >
              <CheckCircle2 className="h-4 w-4" />
              模範スクリプトと解説を見て自己採点する
            </button>
          )}
        </div>
      )}

      {/* Wrong Attempt Reminder in Practice Mode */}
      {mode === 'practice' && !question.isSubjective && wrongChoices.length > 0 && !isSolved && (
        <div className="mt-4 rounded-xl border border-[#F3C6BE] bg-[#FFF2F0] px-4 py-2.5 text-xs font-semibold text-[#A63122]">
          惜しい！下の解説を確認し、正しい選択肢を選び直すと次の問題へ進めます。
        </div>
      )}

      {/* Explanation Panel */}
      {showExplanation && (
        <div className="mt-4">
          <ExplanationPanel
            question={question}
            group={group}
            showPinyin={showPinyin}
            checkedRubric={checkedRubric}
            onToggleRubric={onToggleRubric}
          />
        </div>
      )}
    </article>
  );
};
