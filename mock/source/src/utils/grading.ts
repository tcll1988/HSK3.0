import type { ExamDataset, ExamQuestion, SectionId } from '../types';

export function normalizeShortAnswer(raw: string): string {
  return raw
    .trim()
    .replace(/[\s　.,。，、；;：:！!？?「」『』“”"'（）()《》]/g, '')
    .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/[Ａ-Ｚａ-ｚ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .toLowerCase();
}

export function isObjectiveCorrect(q: ExamQuestion, userAnswer?: string): boolean {
  if (q.isSubjective) return false;
  if (!userAnswer || !userAnswer.trim()) return false;

  if (q.kind === 'short_input') {
    const normUser = normalizeShortAnswer(userAnswer);
    if (!normUser) return false;
    const pool = [
      ...(q.acceptableAnswers || []),
      ...(q.answer ? q.answer.split(/[\/／|｜]/) : []),
    ];
    return pool.some((acc) => normalizeShortAnswer(acc) === normUser);
  }

  return userAnswer.trim() === (q.answer || '').trim();
}

export function countChineseChars(text: string): number {
  return (text || '').replace(/\s+/g, '').length;
}

export interface SectionScoreItem {
  section: SectionId;
  labelJa: string;
  objectiveTotal: number;
  objectiveCorrect: number;
  subjectiveTotal: number;
  subjectiveCompleted: number;
  subjectiveRatio: number; // 0..1 based on checked rubrics or answered
  earnedScore: number;
  maxScore: number;
}

export interface ExamScoreSummary {
  totalScore: number;
  maxScore: number;
  passScore: number;
  passed: boolean;
  objectiveTotal: number;
  objectiveCorrect: number;
  subjectiveTotal: number;
  subjectiveCompleted: number;
  sections: SectionScoreItem[];
}

const SECTION_LABELS: Record<SectionId, string> = {
  listening: 'リスニング（聴力）',
  reading: 'リーディング（読解）',
  writing: '書写・作文（写作）',
  translation: '翻訳・通訳（翻译）',
  speaking: '口語（口语）',
};

export function computeExamScore(
  dataset: ExamDataset,
  answers: Record<number, string>,
  subjectiveRubrics: Record<number, boolean[]>
): ExamScoreSummary {
  const { meta, questions } = dataset;
  const presentSections: SectionId[] = [];
  for (const q of questions) {
    if (!presentSections.includes(q.section)) presentSections.push(q.section);
  }

  const perSectionMax =
    presentSections.length > 0 ? meta.totalScore / presentSections.length : meta.totalScore;

  const sections: SectionScoreItem[] = presentSections.map((sec) => {
    const qs = questions.filter((q) => q.section === sec);
    const objQs = qs.filter((q) => !q.isSubjective);
    const subQs = qs.filter((q) => q.isSubjective);

    const objCorrect = objQs.filter((q) => isObjectiveCorrect(q, answers[q.id])).length;

    let subCompleted = 0;
    let subRatioSum = 0;
    for (const q of subQs) {
      const rub = subjectiveRubrics[q.id];
      const totalRub = q.rubricJa?.length || 0;
      const hasAnswer = Boolean((answers[q.id] || '').trim());
      if (rub && totalRub > 0 && rub.some(Boolean)) {
        const checked = rub.filter(Boolean).length;
        subCompleted += 1;
        subRatioSum += checked / totalRub;
      } else if (hasAnswer) {
        subCompleted += 1;
        subRatioSum += 0.7; // default self-attempt credit until rubric checked
      }
    }

    const totalCount = Math.max(1, qs.length);
    const earnedFraction = (objCorrect + subRatioSum) / totalCount;
    const earnedScore = Math.round(earnedFraction * perSectionMax);

    return {
      section: sec,
      labelJa: SECTION_LABELS[sec],
      objectiveTotal: objQs.length,
      objectiveCorrect: objCorrect,
      subjectiveTotal: subQs.length,
      subjectiveCompleted: subCompleted,
      subjectiveRatio: subQs.length > 0 ? subRatioSum / subQs.length : 0,
      earnedScore,
      maxScore: Math.round(perSectionMax),
    };
  });

  const totalScore = Math.min(
    meta.totalScore,
    sections.reduce((acc, s) => acc + s.earnedScore, 0)
  );
  const objectiveTotal = sections.reduce((acc, s) => acc + s.objectiveTotal, 0);
  const objectiveCorrect = sections.reduce((acc, s) => acc + s.objectiveCorrect, 0);
  const subjectiveTotal = sections.reduce((acc, s) => acc + s.subjectiveTotal, 0);
  const subjectiveCompleted = sections.reduce((acc, s) => acc + s.subjectiveCompleted, 0);

  return {
    totalScore,
    maxScore: meta.totalScore,
    passScore: meta.passScore,
    passed: totalScore >= meta.passScore,
    objectiveTotal,
    objectiveCorrect,
    subjectiveTotal,
    subjectiveCompleted,
    sections,
  };
}
