import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, AlertCircle, X } from 'lucide-react';
import type {
  AppView,
  ExamDataset,
  ExamId,
  ExamQuestion,
  QuestionOrder,
  StudyMode,
} from './types';
import { EXAMS_CATALOG, loadExamDataset } from './data/registry';
import { useExamAudio } from './hooks/useExamAudio';
import { useExamStorage } from './hooks/useExamStorage';
import { PortalHome } from './components/PortalHome';
import { LevelLobby, type PracticeScopeChoice } from './components/LevelLobby';
import { PracticeSession } from './components/PracticeSession';
import { ExamWorkspace } from './components/ExamWorkspace';
import { ScoreReport } from './components/ScoreReport';
import { computeExamScore } from './utils/grading';

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const VALID_IDS = new Set<ExamId>(EXAMS_CATALOG.map((e) => e.id));

function readInitialExamFromHash(): ExamId | null {
  const raw = window.location.hash.replace(/^#\/?/, '').trim() as ExamId;
  return VALID_IDS.has(raw) ? raw : null;
}

export default function App() {
  const storage = useExamStorage();

  const [selectedExamId, setSelectedExamId] = useState<ExamId | null>(() =>
    readInitialExamFromHash()
  );
  const [dataset, setDataset] = useState<ExamDataset | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [view, setView] = useState<AppView>(() =>
    readInitialExamFromHash() ? 'lobby' : 'portal'
  );
  const [mode, setMode] = useState<StudyMode>('practice');

  // Practice state
  const [practiceOrder, setPracticeOrder] = useState<QuestionOrder>('sequential');
  const [practiceScope, setPracticeScope] = useState<PracticeScopeChoice>('all');
  const [practiceQuestions, setPracticeQuestions] = useState<ExamQuestion[]>([]);
  const [practiceSessionKey, setPracticeSessionKey] = useState(1);

  // Exam state
  const [activePartId, setActivePartId] = useState<string>('L1');
  const [randomExamQuestions, setRandomExamQuestions] = useState<ExamQuestion[]>([]);
  const [onlyWrong, setOnlyWrong] = useState(false);
  const [autoFollowAudio, setAutoFollowAudio] = useState(true);
  const [showPinyin, setShowPinyin] = useState(true);

  // Image zoom lightbox
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null);

  const lastAutoQRef = useRef<number | undefined>(undefined);

  // Load dataset whenever selectedExamId changes
  useEffect(() => {
    if (!selectedExamId) {
      setDataset(null);
      setLoadError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    loadExamDataset(selectedExamId)
      .then((data) => {
        if (cancelled) return;
        setDataset(data);
        setShowPinyin(data.meta.defaultShowPinyin);
        setActivePartId(data.parts[0]?.id || 'L1');
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(String(err?.message || '問題データの読み込みに失敗しました。'));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedExamId]);

  // Sync URL hash (outbound) & listen for browser hashchange (inbound)
  useEffect(() => {
    if (selectedExamId) {
      if (window.location.hash !== `#${selectedExamId}`) {
        window.history.replaceState(null, '', `#${selectedExamId}`);
      }
    } else if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, [selectedExamId]);

  useEffect(() => {
    const onHashChange = () => {
      const nextId = readInitialExamFromHash();
      if (nextId && nextId !== selectedExamId) {
        setSelectedExamId(nextId);
        setView('lobby');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (!nextId && selectedExamId) {
        setSelectedExamId(null);
        setView('portal');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [selectedExamId]);

  // Close image modal on Escape
  useEffect(() => {
    if (!zoomedImage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomedImage(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomedImage]);

  const audio = useExamAudio(
    dataset?.meta.audioUrl,
    dataset?.meta.audioDurationSeconds || 0,
    dataset?.meta.secondaryAudioUrl,
    dataset?.meta.secondaryAudioDurationSeconds || 0
  );

  const levelState = useMemo(
    () => (selectedExamId ? storage.getLevel(selectedExamId) : null),
    [selectedExamId, storage]
  );

  // Exam timer tick
  useEffect(() => {
    if (
      !selectedExamId ||
      !levelState ||
      view !== 'workspace' ||
      mode !== 'exam' ||
      levelState.submitted
    ) {
      return;
    }
    const id = window.setInterval(() => {
      storage.updateLevel(selectedExamId, (prev) => ({
        ...prev,
        elapsedSeconds: prev.elapsedSeconds + 1,
      }));
    }, 1000);
    return () => window.clearInterval(id);
  }, [selectedExamId, levelState?.submitted, view, mode, storage.updateLevel]);

  // Stop audio when leaving workspace
  useEffect(() => {
    if (view !== 'workspace') {
      audio.stop();
    }
  }, [view, audio.stop]);

  // Current audio timeline entry for sequential exam mode
  const currentTimelineItem = useMemo(() => {
    if (!dataset || audio.activeClipKey !== 'full') return null;
    const t = audio.currentTime;
    return (
      dataset.timeline.find((item) => {
        const itemTrack = item.track || 'primary';
        return itemTrack === audio.activeTrack && t >= item.start && t <= item.end;
      }) || null
    );
  }, [dataset, audio.activeClipKey, audio.currentTime, audio.activeTrack]);

  // Auto-follow active audio part & question
  useEffect(() => {
    if (
      view !== 'workspace' ||
      mode !== 'exam' ||
      !levelState ||
      levelState.examOrder !== 'sequential' ||
      !autoFollowAudio ||
      audio.activeClipKey !== 'full' ||
      !audio.isPlaying ||
      !currentTimelineItem
    ) {
      return;
    }
    if (
      currentTimelineItem.partId &&
      currentTimelineItem.partId !== 'INTRO' &&
      currentTimelineItem.partId !== 'END' &&
      currentTimelineItem.partId !== activePartId
    ) {
      setActivePartId(currentTimelineItem.partId);
    }
    const qId = currentTimelineItem.questionIds?.[0];
    if (qId && qId !== lastAutoQRef.current) {
      lastAutoQRef.current = qId;
      window.setTimeout(() => {
        const el = document.getElementById(`question-${qId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 120);
    }
  }, [
    view,
    mode,
    levelState?.examOrder,
    autoFollowAudio,
    audio.activeClipKey,
    audio.isPlaying,
    currentTimelineItem,
    activePartId,
  ]);

  const examScore = useMemo(() => {
    if (!dataset || !levelState) return null;
    return computeExamScore(dataset, levelState.answers, levelState.subjectiveRubrics);
  }, [dataset, levelState]);

  const buildPracticeList = (
    ds: ExamDataset,
    order: QuestionOrder,
    scope: PracticeScopeChoice
  ): ExamQuestion[] => {
    let list: ExamQuestion[];
    if (scope === 'all') {
      list = [...ds.questions];
    } else if (scope.startsWith('part:')) {
      const pid = scope.slice(5);
      list = ds.questions.filter((q) => q.partId === pid);
    } else {
      list = ds.questions.filter((q) => q.section === scope);
    }
    return order === 'random' ? shuffleArray(list) : list;
  };

  const scopeLabel = (ds: ExamDataset, scope: PracticeScopeChoice): string => {
    if (scope === 'all') return `全${ds.questions.length}問`;
    if (scope.startsWith('part:')) {
      const p = ds.parts.find((x) => x.id === scope.slice(5));
      return p ? `${p.shortLabelJa}（第${p.questionRange[0]}〜${p.questionRange[1]}問）` : scope;
    }
    const sec = ds.meta.sectionsSummaryJa.find((s) => s.section === scope);
    return sec ? sec.labelJa : scope;
  };

  const handleSelectExam = (id: ExamId) => {
    audio.stop();
    setSelectedExamId(id);
    setView('lobby');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartPractice = (order: QuestionOrder, scope: PracticeScopeChoice) => {
    if (!dataset) return;
    audio.stop();
    const list = buildPracticeList(dataset, order, scope);
    setPracticeOrder(order);
    setPracticeScope(scope);
    setPracticeQuestions(list);
    setPracticeSessionKey((k) => k + 1);
    setMode('practice');
    setView('workspace');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartExam = (order: QuestionOrder) => {
    if (!dataset || !selectedExamId) return;
    audio.stop();
    storage.updateLevel(selectedExamId, (prev) => ({
      ...prev,
      examOrder: order,
    }));
    if (order === 'random') {
      setRandomExamQuestions(shuffleArray(dataset.questions));
    }
    setActivePartId(dataset.parts[0]?.id || 'L1');
    setOnlyWrong(false);
    setMode('exam');
    setView('workspace');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitExam = () => {
    if (!dataset || !selectedExamId || !levelState) return;
    const score = computeExamScore(dataset, levelState.answers, levelState.subjectiveRubrics);
    storage.updateLevel(selectedExamId, (prev) => ({
      ...prev,
      submitted: true,
      lastScore: score.totalScore,
      lastScoreMax: score.maxScore,
    }));
    setView('report');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleRubric = (qId: number, idx: number, total: number) => {
    if (!selectedExamId || !dataset) return;
    storage.updateLevel(selectedExamId, (prev) => {
      const arr = prev.subjectiveRubrics[qId]
        ? [...prev.subjectiveRubrics[qId]]
        : Array(total).fill(false);
      while (arr.length < total) arr.push(false);
      arr[idx] = !arr[idx];
      const nextRubrics = { ...prev.subjectiveRubrics, [qId]: arr };
      const updated = { ...prev, subjectiveRubrics: nextRubrics };
      if (updated.submitted) {
        const sc = computeExamScore(dataset, updated.answers, nextRubrics);
        updated.lastScore = sc.totalScore;
        updated.lastScoreMax = sc.maxScore;
      }
      return updated;
    });
  };

  return (
    <>
      {view === 'portal' || !selectedExamId ? (
        <PortalHome
          storage={storage.store}
          onSelectExam={handleSelectExam}
          onExportBackup={storage.exportBackup}
        />
      ) : loading ? (
        <div className="paper-grain flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
          <Loader2 className="h-9 w-9 animate-spin text-[#C83E2B]" />
          <p className="text-sm font-bold text-[#1E3A5F]">公式様巻データを読み込んでいます…</p>
        </div>
      ) : loadError || !dataset || !levelState ? (
        <div className="paper-grain flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <AlertCircle className="h-10 w-10 text-[#C83E2B]" />
          <p className="text-sm font-semibold text-[#1F2328]">
            {loadError || 'データが見つかりませんでした。'}
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedExamId(null);
              setView('portal');
            }}
            className="cursor-pointer rounded-xl bg-[#1E3A5F] px-5 py-2.5 text-xs font-bold text-white"
          >
            級一覧へ戻る
          </button>
        </div>
      ) : view === 'lobby' ? (
        <LevelLobby
          dataset={dataset}
          levelState={levelState}
          onBackToPortal={() => {
            audio.stop();
            setSelectedExamId(null);
            setView('portal');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onStartPractice={handleStartPractice}
          onStartExam={handleStartExam}
          onViewReport={() => {
            setView('report');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onResetExam={() => storage.resetLevelExam(selectedExamId)}
        />
      ) : view === 'report' && examScore ? (
        <ScoreReport
          dataset={dataset}
          score={examScore}
          elapsedSeconds={levelState.elapsedSeconds}
          onReviewAll={() => {
            setOnlyWrong(false);
            setMode('exam');
            setView('workspace');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onReviewWrongOnly={() => {
            setOnlyWrong(true);
            setMode('exam');
            setView('workspace');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onRetryExam={() => {
            storage.resetLevelExam(selectedExamId);
            handleStartExam(levelState.examOrder);
          }}
          onGoLobby={() => {
            setView('lobby');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      ) : mode === 'practice' ? (
        <PracticeSession
          key={`${selectedExamId}-${practiceSessionKey}`}
          dataset={dataset}
          questions={practiceQuestions}
          order={practiceOrder}
          scopeLabelJa={scopeLabel(dataset, practiceScope)}
          showPinyin={showPinyin}
          onTogglePinyin={() => setShowPinyin((v) => !v)}
          savedAnswers={levelState.answers}
          savedRubrics={levelState.subjectiveRubrics}
          activeClipKey={audio.activeClipKey}
          isPlaying={audio.isPlaying}
          clipProgress={audio.clipProgress}
          playbackRate={audio.playbackRate}
          audioError={audio.audioError}
          onToggleClip={audio.toggleClip}
          onChangeRate={audio.changeRate}
          onStopAudio={audio.stop}
          onSaveAnswer={(qId, val) =>
            storage.updateLevel(selectedExamId, (prev) => ({
              ...prev,
              answers: { ...prev.answers, [qId]: val },
            }))
          }
          onToggleRubric={handleToggleRubric}
          onMarkSolved={(qId) =>
            storage.updateLevel(selectedExamId, (prev) => ({
              ...prev,
              practiceSolvedIds: prev.practiceSolvedIds.includes(qId)
                ? prev.practiceSolvedIds
                : [...prev.practiceSolvedIds, qId],
            }))
          }
          onZoomImage={(src, alt) => setZoomedImage({ src, alt })}
          onReviewMistakes={(missed) => {
            audio.stop();
            setPracticeQuestions(missed);
            setPracticeSessionKey((k) => k + 1);
          }}
          onRestart={() => handleStartPractice(practiceOrder, practiceScope)}
          onGoExam={() => handleStartExam('sequential')}
          onGoLobby={() => {
            audio.stop();
            setView('lobby');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      ) : (
        <ExamWorkspace
          dataset={dataset}
          examOrder={levelState.examOrder}
          randomQuestions={
            randomExamQuestions.length > 0 ? randomExamQuestions : dataset.questions
          }
          activePartId={activePartId}
          onChangePart={setActivePartId}
          answers={levelState.answers}
          subjectiveRubrics={levelState.subjectiveRubrics}
          flagged={levelState.flagged}
          submitted={levelState.submitted}
          elapsedSeconds={levelState.elapsedSeconds}
          showPinyin={showPinyin}
          onlyWrong={onlyWrong}
          autoFollowAudio={autoFollowAudio}
          onTogglePinyin={() => setShowPinyin((v) => !v)}
          onToggleOnlyWrong={() => setOnlyWrong((v) => !v)}
          onToggleAutoFollow={() => setAutoFollowAudio((v) => !v)}
          onSelectAnswer={(qId, val) =>
            storage.updateLevel(selectedExamId, (prev) => ({
              ...prev,
              answers: { ...prev.answers, [qId]: val },
            }))
          }
          onToggleRubric={handleToggleRubric}
          onToggleFlag={(qId) =>
            storage.updateLevel(selectedExamId, (prev) => ({
              ...prev,
              flagged: { ...prev.flagged, [qId]: !prev.flagged[qId] },
            }))
          }
          onSubmitExam={handleSubmitExam}
          onOpenReport={() => {
            setView('report');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onGoLobby={() => {
            audio.stop();
            setView('lobby');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onZoomImage={(src, alt) => setZoomedImage({ src, alt })}
          audio={audio}
          currentTimelineItem={currentTimelineItem}
        />
      )}

      {/* Global Click-to-Zoom Image Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          onClick={() => setZoomedImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl bg-white p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomedImage(null)}
              className="absolute top-3 right-3 z-10 cursor-pointer rounded-full bg-black/70 p-2 text-white hover:bg-black"
              aria-label="閉じる"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={zoomedImage.src}
              alt={zoomedImage.alt}
              className="max-h-[82vh] max-w-full rounded-xl object-contain"
            />
            {zoomedImage.alt && (
              <p className="mt-2 text-center text-xs font-semibold text-[#57606A]">
                {zoomedImage.alt}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
