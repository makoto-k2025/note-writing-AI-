import React from 'react';
import type { ChapterOutline, WrittenChapterContent, SavedChapter } from '../types';
import { ChapterCard } from './PostCard';
import { SpinnerIcon } from './icons/SpinnerIcon';

const GoogleDocsIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="#4285F4">
        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
    </svg>
);

interface ResultSectionProps {
  topic: string;
  outline: ChapterOutline[];
  writtenContent: Record<string, WrittenChapterContent>;
  isLoading: boolean;
  isReviewing: boolean;
  error: string | null;
  onChapterWrite: (id: string, content: WrittenChapterContent) => void;
  onOutlineAdjust: (id: string, currentOutline: Omit<ChapterOutline, 'id'>, instruction: string) => Promise<void>;
  isThinkingMode: boolean;
  onSaveChapter: (chapter: SavedChapter) => void;
  savedChapters: SavedChapter[];
  onCopyToGoogleDocs: () => void;
  copyDocsSuccess: boolean;
  onFinalReview: () => void;
}

export const ResultSection: React.FC<ResultSectionProps> = ({
  topic,
  outline,
  writtenContent,
  isLoading,
  isReviewing,
  error,
  onChapterWrite,
  onOutlineAdjust,
  isThinkingMode,
  onSaveChapter,
  savedChapters,
  onCopyToGoogleDocs,
  copyDocsSuccess,
  onFinalReview,
}) => {
  const allChaptersWritten = outline.length > 0 && outline.every(o => !!writtenContent[o.id]);

  return (
    <div className="mt-8">
      {isLoading && (
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <div role="status" className="flex justify-center items-center">
            <svg aria-hidden="true" className="w-10 h-10 mr-2 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0492C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
            </svg>
            <span className="text-lg font-semibold ml-4">目次案を生成中... しばらくお待ちください。</span>
          </div>
        </div>
      )}
       {isReviewing && (
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <div role="status" className="flex justify-center items-center">
             <SpinnerIcon />
            <span className="text-lg font-semibold ml-4 text-gray-800 dark:text-white">全体を推敲中... 原稿の品質を高めています。</span>
          </div>
        </div>
      )}
      {error && (
        <div className="text-center p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded-lg">
          {error}
        </div>
      )}
      {outline.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
             <button
                onClick={onFinalReview}
                disabled={!allChaptersWritten || isReviewing}
                className="flex items-center justify-center px-4 py-2 bg-purple-600 text-white font-bold rounded-lg shadow-md hover:bg-purple-700 disabled:bg-purple-300 dark:disabled:bg-purple-800 disabled:cursor-not-allowed transition-all"
             >
                {isReviewing ? <SpinnerIcon /> : '全体推敲'}
             </button>
             <button
              onClick={onCopyToGoogleDocs}
              className="relative flex items-center px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-semibold rounded-lg shadow-md hover:bg-blue-200 dark:hover:bg-blue-800 transition"
            >
              <GoogleDocsIcon />
              <span className="ml-1">Googleドキュメント用にコピー</span>
              {copyDocsSuccess && (
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded">
                  コピーしました！
                </span>
              )}
            </button>
          </div>
          {outline.map((chapterOutline, index) => {
            const isSaved = savedChapters.some(savedChapter => savedChapter.id === chapterOutline.id);
            const content = writtenContent[chapterOutline.id];
            return (
              <ChapterCard
                key={chapterOutline.id}
                topic={topic}
                outline={chapterOutline}
                writtenContent={content}
                onChapterWrite={onChapterWrite}
                onOutlineAdjust={onOutlineAdjust}
                isThinkingMode={isThinkingMode}
                onSaveChapter={onSaveChapter}
                isSaved={isSaved}
                chapterNumber={index + 1}
                totalChapters={outline.length}
                allChapterTitles={outline.map(o => o.title)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
