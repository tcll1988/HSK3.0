import { useCallback, useEffect, useState } from 'react';
import type { ExamId, QuestionOrder } from '../types';

export interface PersistedLevelState {
  answers: Record<number, string>;
  subjectiveRubrics: Record<number, boolean[]>; // checked rubric items per subjective question
  flagged: Record<number, boolean>;
  submitted: boolean;
  elapsedSeconds: number;
  examOrder: QuestionOrder;
  practiceSolvedIds: number[];
  lastScore?: number;
  lastScoreMax?: number;
  updatedAt?: string;
}

export type AllLevelsStorage = Partial<Record<ExamId, PersistedLevelState>>;

const STORAGE_KEY = 'hsk3_mock_exams_ja_v1';

export function emptyLevelState(): PersistedLevelState {
  return {
    answers: {},
    subjectiveRubrics: {},
    flagged: {},
    submitted: false,
    elapsedSeconds: 0,
    examOrder: 'sequential',
    practiceSolvedIds: [],
  };
}

function loadAll(): AllLevelsStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function useExamStorage() {
  const [store, setStore] = useState<AllLevelsStorage>(() => loadAll());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      // Ignore storage quota or private mode errors
    }
  }, [store]);

  const getLevel = useCallback(
    (id: ExamId): PersistedLevelState => {
      const existing = store[id];
      if (!existing) return emptyLevelState();
      return {
        ...emptyLevelState(),
        ...existing,
        answers: existing.answers || {},
        subjectiveRubrics: existing.subjectiveRubrics || {},
        flagged: existing.flagged || {},
        practiceSolvedIds: Array.isArray(existing.practiceSolvedIds)
          ? existing.practiceSolvedIds
          : [],
      };
    },
    [store]
  );

  const updateLevel = useCallback(
    (id: ExamId, updater: (prev: PersistedLevelState) => PersistedLevelState) => {
      setStore((prev) => {
        const cur = prev[id] ? { ...emptyLevelState(), ...prev[id] } : emptyLevelState();
        const next = updater(cur);
        return {
          ...prev,
          [id]: {
            ...next,
            updatedAt: new Date().toISOString(),
          },
        };
      });
    },
    []
  );

  const resetLevelExam = useCallback((id: ExamId) => {
    setStore((prev) => {
      const cur = prev[id] ? { ...emptyLevelState(), ...prev[id] } : emptyLevelState();
      return {
        ...prev,
        [id]: {
          ...emptyLevelState(),
          practiceSolvedIds: cur.practiceSolvedIds,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  }, []);

  const exportBackup = useCallback(() => {
    const blob = new Blob(
      [JSON.stringify({ format: 'hsk3-mock-backup', version: 1, data: store }, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hsk3-mock-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [store]);

  return {
    store,
    getLevel,
    updateLevel,
    resetLevelExam,
    exportBackup,
  };
}
