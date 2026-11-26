export type ExamId =
  | 'hsk1'
  | 'hsk2'
  | 'hsk3'
  | 'hsk4'
  | 'hsk5'
  | 'hsk6'
  | 'hsk79'
  | 'oral3'
  | 'oral4'
  | 'oral5'
  | 'oral6';

export type ExamCategory = 'written' | 'oral';
export type SectionId = 'listening' | 'reading' | 'writing' | 'translation' | 'speaking';
export type StudyMode = 'practice' | 'exam';
export type QuestionOrder = 'sequential' | 'random';
export type AppView = 'portal' | 'lobby' | 'workspace' | 'report';

export type QuestionKind =
  | 'image_choice'    // Pick A/B/C image per question (HSK1 L1, HSK2 L1)
  | 'image_bank'      // Pick A-F / A-E from shared part image bank (HSK1 L3/R1, HSK2 L2/R1, HSK3 L1)
  | 'mcq'             // Standard A/B/C(/D) text MCQ (listening or reading, optional passage)
  | 'tf_ng'           // √ / × / 〇 (HSK7-9 L1)
  | 'match_bank'      // Shared text/word/sentence/paragraph/radical bank A-F/G
  | 'short_input'     // Short Chinese text/character input (auto-graded via acceptableAnswers)
  | 'writing_task'    // Sentence making / essay / chart description (self-graded + model answer)
  | 'translation_task'// Written translation or oral interpretation (EN->ZH, self-graded + model)
  | 'speaking_task';  // Oral repeat / retell / picture talk / Q&A / presentation (mic recorder + model)

export interface AudioSegment {
  start: number;
  end: number;
  track?: 'primary' | 'secondary'; // secondary used for HSK 7-9 oral recording
}

export interface TimelineEntry {
  start: number;
  end: number;
  partId: string;
  questionIds?: number[];
  labelJa: string;
  track?: 'primary' | 'secondary';
}

export interface TranscriptLine {
  speaker?: string; // e.g. '男', '女', '问', '主持人', '甲', '乙'
  text: string;
  pinyin?: string;
  ja?: string;
}

export interface ChoiceOption {
  label: string;       // 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | '√' | '×' | '〇'
  text?: string;       // Chinese text
  pinyin?: string;
  meaningJa?: string;  // Shown after answer / in explanation
  image?: string;      // Relative to mock/ root, e.g. './images/hsk1/L1_q1_A.jpg'
  altJa?: string;
}

export interface SharedGroup {
  id: string;                 // e.g. 'hsk5-r3-56-58' or 'hsk1-l3-bank'
  titleJa?: string;           // e.g. '第56〜58問 共通長文' or '共通イラスト群（A〜F）'
  instructionJa?: string;
  passageZh?: string;         // Shared reading passage or prompt context
  passagePinyin?: string;
  passageJa?: string;         // Full Japanese translation of passage (shown after answering)
  passageImage?: string;      // Optional photo/diagram accompanying passage
  passageImageAlt?: string;
  tableRows?: string[][];     // Structured table (e.g. HSK 7-9 Q87 schedule)
  bankOptions?: ChoiceOption[]; // Shared image bank, word bank, sentence bank, paragraph bank, radical bank
  usedExampleLabel?: string;  // e.g. 'C' (marked as used in example)
  fixedAnchorNoteJa?: string; // e.g. '※ 段落 E の位置は固定（4番目）'
  audio?: AudioSegment;       // Shared listening passage audio clip
  transcript?: TranscriptLine[]; // Shared listening passage transcript
}

export interface PartMeta {
  id: string;                 // e.g. 'L1', 'R2', 'W1', 'T1', 'S1'
  section: SectionId;
  sectionTitleJa: string;
  titleJa: string;            // e.g. '第1部'
  shortLabelJa: string;       // e.g. '聴力1'
  subtitleJa: string;
  questionRange: [number, number];
  instructionJa: string;
  exampleJa?: string;         // Brief official example note
  audioIntro?: AudioSegment;
}

export interface ExamQuestion {
  id: number;                 // Official question number (1..N)
  section: SectionId;
  partId: string;
  kind: QuestionKind;
  groupId?: string;           // References SharedGroup.id

  // Prompt content
  promptZh?: string;          // Question stem / sentence / blank sentence / essay prompt
  promptPinyin?: string;
  promptSubZh?: string;       // e.g. '★ 说话人想知道什么？' or dialogue line 2
  promptSubPinyin?: string;
  promptEn?: string;          // English source text for HSK 7-9 Translation Q83-86
  keywordZh?: string;         // Given word for picture sentence making (HSK 3/4)
  keywordPinyin?: string;
  image?: string;             // Question-specific image (e.g. HSK2 W1 Tianzige, HSK3/4 writing photo, Oral3)
  images?: string[];          // Multi-panel sequence images (Oral 4/5/6 Q3)
  imageAltJa?: string;
  minChars?: number;          // Minimum Chinese char count for writing tasks
  prepSeconds?: number;       // Preparation time for speaking/interpretation
  speakSeconds?: number;      // Answer time for speaking/interpretation

  // Choices & Grading
  options?: ChoiceOption[];   // Per-question choices (if not solely using group bankOptions)
  answer?: string;            // Official answer for objective questions ('A', '√', '的', etc.)
  acceptableAnswers?: string[]; // Acceptable strings for short_input auto-grading
  isSubjective?: boolean;     // True for writing_task, translation_task, speaking_task

  // Audio & Transcript
  audio?: AudioSegment;
  transcript?: TranscriptLine[];

  // Japanese Pedagogical Content (University Student Grade)
  translationJa: string;
  explanationJa: string;      // 「なぜこれが正解？」/ 解答アプローチ
  tipJa?: string;             // 日本人学習者向けポイント（語彙・文法・ひっかけ注意）
  modelAnswerZh?: string;     // Sample/reference Chinese answer for writing/translation/speaking
  modelAnswerPinyin?: string;
  modelAnswerJa?: string;     // Japanese translation of model answer
  rubricJa?: string[];        // Self-check points for writing/translation/speaking
}

export interface ExamSummaryMeta {
  id: ExamId;
  category: ExamCategory;
  badgeJa: string;            // e.g. 'HSK 1級' or 'HSK 3級 口語'
  titleJa: string;
  officialTitle: string;
  cefrTag: string;            // e.g. 'CEFR A1 · 初級'
  levelGroup: 'beginner' | 'intermediate' | 'advanced' | 'oral';
  totalQuestions: number;
  examMinutes: number;
  totalScore: number;
  passScore: number;
  defaultShowPinyin: boolean;
  sectionsSummaryJa: { section: SectionId; labelJa: string; count: number; minutesJa: string }[];
  audioUrl?: string;          // Relative URL to MP3 in ../HSK3.0_新版样卷/...
  audioDurationSeconds?: number;
  secondaryAudioUrl?: string; // HSK 7-9 oral MP3
  secondaryAudioDurationSeconds?: number;
  pdfQuestionUrl: string;     // Relative URL to official question PDF
  pdfAnswerUrl?: string;      // Relative URL to official answer PDF
  officialNoteJa?: string;    // e.g. note about HSK 2 answer sheet typo fix
}

export interface ExamDataset {
  meta: ExamSummaryMeta;
  parts: PartMeta[];
  groups: Record<string, SharedGroup>;
  questions: ExamQuestion[];
  timeline: TimelineEntry[];
}
