import type { ExamDataset, ExamId, ExamSummaryMeta } from '../types';

export function resolveAssetUrl(rawPath?: string): string {
  if (!rawPath) return '';
  if (/^https?:\/\//i.test(rawPath)) return rawPath;
  // In local Vite dev server, map ../HSK3.0_新版样卷/... to /HSK3.0_新版样卷/...
  const normalized =
    import.meta.env.DEV && rawPath.startsWith('../HSK3.0_新版样卷/')
      ? rawPath.replace(/^\.\./, '')
      : rawPath;
  return encodeURI(normalized);
}

export const EXAMS_CATALOG: ExamSummaryMeta[] = [
  {
    id: 'hsk1',
    category: 'written',
    badgeJa: 'HSK 1級',
    titleJa: 'HSK 3.0（1級）公式様巻演習',
    officialTitle: '中文水平考试 HSK（一级）样卷',
    cefrTag: 'CEFR A1 · 入門',
    levelGroup: 'beginner',
    totalQuestions: 40,
    examMinutes: 35,
    totalScore: 200,
    passScore: 120,
    defaultShowPinyin: true,
    sectionsSummaryJa: [
      { section: 'listening', labelJa: 'リスニング', count: 20, minutesJa: '約12分' },
      { section: 'reading', labelJa: 'リーディング', count: 20, minutesJa: '20分' },
    ],
    audioUrl: '../HSK3.0_新版样卷/一级/样卷_录音.mp3',
    audioDurationSeconds: 794.5,
    pdfQuestionUrl: '../HSK3.0_新版样卷/一级/样卷_题目.pdf',
    pdfAnswerUrl: '../HSK3.0_新版样卷/一级/样卷_答案.pdf',
  },
  {
    id: 'hsk2',
    category: 'written',
    badgeJa: 'HSK 2級',
    titleJa: 'HSK 3.0（2級）公式様巻演習',
    officialTitle: '中文水平考试 HSK（二级）样卷',
    cefrTag: 'CEFR A2 · 初級',
    levelGroup: 'beginner',
    totalQuestions: 60,
    examMinutes: 55,
    totalScore: 300,
    passScore: 180,
    defaultShowPinyin: true,
    sectionsSummaryJa: [
      { section: 'listening', labelJa: 'リスニング', count: 25, minutesJa: '約17分' },
      { section: 'reading', labelJa: 'リーディング', count: 25, minutesJa: '25分' },
      { section: 'writing', labelJa: '書写（漢字）', count: 10, minutesJa: '10分' },
    ],
    audioUrl: '../HSK3.0_新版样卷/二级/样卷_录音.mp3',
    audioDurationSeconds: 1068.6,
    pdfQuestionUrl: '../HSK3.0_新版样卷/二级/样卷_题目.pdf',
    pdfAnswerUrl: '../HSK3.0_新版样卷/二级/样卷_答案.pdf',
    officialNoteJa:
      '※公式解答PDFでは書写部分の設問番号が54〜63と3番ずれていますが、問題冊子（第51〜60問）に合わせて正しく対応づけています。',
  },
  {
    id: 'hsk3',
    category: 'written',
    badgeJa: 'HSK 3級',
    titleJa: 'HSK 3.0（3級）公式様巻演習',
    officialTitle: '中文水平考试 HSK（三级）样卷',
    cefrTag: 'CEFR B1 · 初中級',
    levelGroup: 'intermediate',
    totalQuestions: 70,
    examMinutes: 78,
    totalScore: 300,
    passScore: 180,
    defaultShowPinyin: false,
    sectionsSummaryJa: [
      { section: 'listening', labelJa: 'リスニング', count: 30, minutesJa: '約23分' },
      { section: 'reading', labelJa: 'リーディング', count: 30, minutesJa: '30分' },
      { section: 'writing', labelJa: '書写・造句', count: 10, minutesJa: '20分' },
    ],
    audioUrl: '../HSK3.0_新版样卷/三级/样卷_录音.mp3',
    audioDurationSeconds: 1447.7,
    pdfQuestionUrl: '../HSK3.0_新版样卷/三级/样卷_题目.pdf',
    pdfAnswerUrl: '../HSK3.0_新版样卷/三级/样卷_答案.pdf',
  },
  {
    id: 'hsk4',
    category: 'written',
    badgeJa: 'HSK 4級',
    titleJa: 'HSK 3.0（4級）公式様巻演習',
    officialTitle: '中文水平考试 HSK（四级）样卷',
    cefrTag: 'CEFR B2 · 中級',
    levelGroup: 'intermediate',
    totalQuestions: 70,
    examMinutes: 80,
    totalScore: 300,
    passScore: 180,
    defaultShowPinyin: false,
    sectionsSummaryJa: [
      { section: 'listening', labelJa: 'リスニング', count: 32, minutesJa: '約20分' },
      { section: 'reading', labelJa: 'リーディング', count: 32, minutesJa: '30分' },
      { section: 'writing', labelJa: '作文', count: 6, minutesJa: '25分' },
    ],
    audioUrl: '../HSK3.0_新版样卷/四级/样卷_录音.mp3',
    audioDurationSeconds: 1269.0,
    pdfQuestionUrl: '../HSK3.0_新版样卷/四级/样卷_题目.pdf',
    pdfAnswerUrl: '../HSK3.0_新版样卷/四级/样卷_答案.pdf',
  },
  {
    id: 'hsk5',
    category: 'written',
    badgeJa: 'HSK 5級',
    titleJa: 'HSK 3.0（5級）公式様巻演習',
    officialTitle: '中文水平考试 HSK（五级）样卷',
    cefrTag: 'CEFR C1 · 中上級',
    levelGroup: 'advanced',
    totalQuestions: 72,
    examMinutes: 105,
    totalScore: 300,
    passScore: 180,
    defaultShowPinyin: false,
    sectionsSummaryJa: [
      { section: 'listening', labelJa: 'リスニング', count: 35, minutesJa: '約25分' },
      { section: 'reading', labelJa: 'リーディング', count: 35, minutesJa: '35分' },
      { section: 'writing', labelJa: '作文', count: 2, minutesJa: '40分' },
    ],
    audioUrl: '../HSK3.0_新版样卷/五级/样卷_录音.mp3',
    audioDurationSeconds: 1591.9,
    pdfQuestionUrl: '../HSK3.0_新版样卷/五级/样卷_题目.pdf',
    pdfAnswerUrl: '../HSK3.0_新版样卷/五级/样卷_答案.pdf',
  },
  {
    id: 'hsk6',
    category: 'written',
    badgeJa: 'HSK 6級',
    titleJa: 'HSK 3.0（6級）公式様巻演習',
    officialTitle: '中文水平考试 HSK（六级）样卷',
    cefrTag: 'CEFR C1+ · 上級',
    levelGroup: 'advanced',
    totalQuestions: 82,
    examMinutes: 120,
    totalScore: 300,
    passScore: 180,
    defaultShowPinyin: false,
    sectionsSummaryJa: [
      { section: 'listening', labelJa: 'リスニング', count: 40, minutesJa: '約30分' },
      { section: 'reading', labelJa: 'リーディング', count: 40, minutesJa: '40分' },
      { section: 'writing', labelJa: '作文', count: 2, minutesJa: '45分' },
    ],
    audioUrl: '../HSK3.0_新版样卷/六级/样卷_录音.mp3',
    audioDurationSeconds: 1895.5,
    pdfQuestionUrl: '../HSK3.0_新版样卷/六级/样卷_题目.pdf',
    pdfAnswerUrl: '../HSK3.0_新版样卷/六级/样卷_答案.pdf',
  },
  {
    id: 'hsk79',
    category: 'written',
    badgeJa: 'HSK 7–9級',
    titleJa: 'HSK 3.0（7–9級）公式様巻演習',
    officialTitle: '中文水平考试 HSK（七—九级）样卷',
    cefrTag: 'CEFR C2 · 高等',
    levelGroup: 'advanced',
    totalQuestions: 91,
    examMinutes: 200,
    totalScore: 500,
    passScore: 300,
    defaultShowPinyin: false,
    sectionsSummaryJa: [
      { section: 'listening', labelJa: 'リスニング', count: 40, minutesJa: '約33分' },
      { section: 'reading', labelJa: 'リーディング', count: 40, minutesJa: '50分' },
      { section: 'writing', labelJa: '作文', count: 2, minutesJa: '55分' },
      { section: 'translation', labelJa: '翻訳・通訳', count: 4, minutesJa: '約42分' },
      { section: 'speaking', labelJa: '口語', count: 5, minutesJa: '約20分' },
    ],
    audioUrl: '../HSK3.0_新版样卷/七-九级/样卷_听力录音.mp3',
    audioDurationSeconds: 1897.5,
    secondaryAudioUrl: '../HSK3.0_新版样卷/七-九级/样卷_口试录音.mp3',
    secondaryAudioDurationSeconds: 1642.5,
    pdfQuestionUrl: '../HSK3.0_新版样卷/七-九级/样卷_题目.pdf',
    pdfAnswerUrl: '../HSK3.0_新版样卷/七-九级/样卷_答案.pdf',
  },
  {
    id: 'oral3',
    category: 'oral',
    badgeJa: 'HSK 3級 口語',
    titleJa: 'HSK 3.0（3級口語）公式様巻演習',
    officialTitle: '中文水平考试 HSK（三级）口语样卷',
    cefrTag: 'CEFR B1 · 初中級口語',
    levelGroup: 'oral',
    totalQuestions: 15,
    examMinutes: 15,
    totalScore: 100,
    passScore: 60,
    defaultShowPinyin: false,
    sectionsSummaryJa: [
      { section: 'speaking', labelJa: '復唱・描写・応答', count: 15, minutesJa: '約15分' },
    ],
    audioUrl: '../HSK3.0_新版样卷/口语/三级_口语样卷_录音.mp3',
    audioDurationSeconds: 980.2,
    pdfQuestionUrl: '../HSK3.0_新版样卷/口语/三级_口语样卷.pdf',
  },
  {
    id: 'oral4',
    category: 'oral',
    badgeJa: 'HSK 4級 口語',
    titleJa: 'HSK 3.0（4級口語）公式様巻演習',
    officialTitle: '中文水平考试 HSK（四级）口语样卷',
    cefrTag: 'CEFR B2 · 中級口語',
    levelGroup: 'oral',
    totalQuestions: 5,
    examMinutes: 20,
    totalScore: 100,
    passScore: 60,
    defaultShowPinyin: false,
    sectionsSummaryJa: [
      { section: 'speaking', labelJa: '要約復述・連環画・応答', count: 5, minutesJa: '約20分' },
    ],
    audioUrl: '../HSK3.0_新版样卷/口语/四级_口语样卷_录音.mp3',
    audioDurationSeconds: 1282.4,
    pdfQuestionUrl: '../HSK3.0_新版样卷/口语/四级_口语样卷.pdf',
  },
  {
    id: 'oral5',
    category: 'oral',
    badgeJa: 'HSK 5級 口語',
    titleJa: 'HSK 3.0（5級口語）公式様巻演習',
    officialTitle: '中文水平考试 HSK（五级）口语样卷',
    cefrTag: 'CEFR C1 · 中上級口語',
    levelGroup: 'oral',
    totalQuestions: 5,
    examMinutes: 23,
    totalScore: 100,
    passScore: 60,
    defaultShowPinyin: false,
    sectionsSummaryJa: [
      { section: 'speaking', labelJa: '長文復述・物語描写・意見', count: 5, minutesJa: '約23分' },
    ],
    audioUrl: '../HSK3.0_新版样卷/口语/五级_口语样卷_录音.mp3',
    audioDurationSeconds: 1469.3,
    pdfQuestionUrl: '../HSK3.0_新版样卷/口语/五级_口语样卷.pdf',
  },
  {
    id: 'oral6',
    category: 'oral',
    badgeJa: 'HSK 6級 口語',
    titleJa: 'HSK 3.0（6級口語）公式様巻演習',
    officialTitle: '中文水平考试 HSK（六级）口语样卷',
    cefrTag: 'CEFR C1+ · 上級口語',
    levelGroup: 'oral',
    totalQuestions: 5,
    examMinutes: 23,
    totalScore: 100,
    passScore: 60,
    defaultShowPinyin: false,
    sectionsSummaryJa: [
      { section: 'speaking', labelJa: '長文復述・4コマ描写・論述', count: 5, minutesJa: '約23分' },
    ],
    audioUrl: '../HSK3.0_新版样卷/口语/六级_口语样卷_录音.mp3',
    audioDurationSeconds: 1455.3,
    pdfQuestionUrl: '../HSK3.0_新版样卷/口语/六级_口语样卷.pdf',
  },
];

const datasetCache = new Map<ExamId, ExamDataset>();

export async function loadExamDataset(id: ExamId): Promise<ExamDataset> {
  const cached = datasetCache.get(id);
  if (cached) return cached;

  let mod: { default: unknown };
  switch (id) {
    case 'hsk1':
      mod = await import('./hsk1.json');
      break;
    case 'hsk2':
      mod = await import('./hsk2.json');
      break;
    case 'hsk3':
      mod = await import('./hsk3.json');
      break;
    case 'hsk4':
      mod = await import('./hsk4.json');
      break;
    case 'hsk5':
      mod = await import('./hsk5.json');
      break;
    case 'hsk6':
      mod = await import('./hsk6.json');
      break;
    case 'hsk79':
      mod = await import('./hsk79.json');
      break;
    case 'oral3':
      mod = await import('./oral3.json');
      break;
    case 'oral4':
      mod = await import('./oral4.json');
      break;
    case 'oral5':
      mod = await import('./oral5.json');
      break;
    case 'oral6':
      mod = await import('./oral6.json');
      break;
  }

  const data = mod.default as ExamDataset;
  datasetCache.set(id, data);
  return data;
}
