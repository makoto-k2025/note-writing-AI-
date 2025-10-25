export interface Section {
  title: string;
  summary: string;
}

export interface ChapterOutline {
  id: string;
  title: string;
  overview: string;
  purpose: string;
  sections: Section[];
}

export interface WrittenChapterContent {
  content: string;
  intent: string;
}

export interface SavedChapter extends ChapterOutline, WrittenChapterContent {}

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export type ImageTone = 'line-art' | 'watercolor' | 'creative';

export interface GenerateOutlineParams {
  topic: string;
  direction?: string;
  numChapters: number;
  difficulty: Difficulty;
  isThinkingMode: boolean;
}

export interface WriteChapterParams {
  topic: string;
  chapterOutline: ChapterOutline;
  isThinkingMode: boolean;
  chapterNumber: number;
  totalChapters: number;
  allChapterTitles: string[];
}

export interface AdjustOutlineParams {
  instruction: string;
  currentOutline: Omit<ChapterOutline, 'id'>;
}

export interface AdjustChapterParams {
  instruction: string;
}

export interface FinalReviewParams {
  chapters: { title: string, content: string }[];
}
