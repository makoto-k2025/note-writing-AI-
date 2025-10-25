import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { InputSection } from './components/InputSection';
import { ResultSection } from './components/ResultSection';
import { generateOutline, adjustOutline, finalReview } from './services/geminiService';
import type { ChapterOutline, Difficulty, WrittenChapterContent, SavedChapter } from './types';
import { CopyIcon } from './components/icons/CopyIcon';
import { CheckIcon } from './components/icons/CheckIcon';

const TrashIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

interface SavedChapterCardProps {
  chapter: SavedChapter;
  onDeleteChapter: (chapterId: string) => void;
}

const SavedChapterCard: React.FC<SavedChapterCardProps> = ({ chapter, onDeleteChapter }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(chapter.content).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  }, [chapter.content]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="p-6">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">{chapter.title}</h3>
        <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
          {chapter.content}
        </p>
      </div>
      <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4">
        <div>
          <h3 className="font-semibold text-sm text-blue-600 dark:text-blue-400">
            この章の意図 / フック
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {chapter.intent}
          </p>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 flex justify-end items-center space-x-2">
            <button
              onClick={() => onDeleteChapter(chapter.id)}
              className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label="削除"
            >
              <TrashIcon />
            </button>
            <button
                onClick={handleCopy}
                className={`p-2 rounded-full transition-colors ${
                    isCopied
                    ? 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                disabled={isCopied}
                aria-label={isCopied ? "コピー済み" : "コピー"}
            >
                {isCopied ? <CheckIcon /> : <CopyIcon />}
            </button>
        </div>
      </div>
    </div>
  );
};

interface SavedChaptersSectionProps {
  chapters: SavedChapter[];
  onDeleteChapter: (chapterId: string) => void;
}

const SavedChaptersSection: React.FC<SavedChaptersSectionProps> = ({ chapters, onDeleteChapter }) => {
  if (chapters.length === 0) {
    return null;
  }

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">保存した章</h2>
      <div className="space-y-4">
        {chapters.map((chapter) => (
          <SavedChapterCard key={chapter.id} chapter={chapter} onDeleteChapter={onDeleteChapter} />
        ))}
      </div>
    </div>
  );
};


const App: React.FC = () => {
  const [topic, setTopic] = useState<string>('');
  const [direction, setDirection] = useState<string>('');
  const [numChapters, setNumChapters] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<Difficulty>(3);
  const [isThinkingMode, setIsThinkingMode] = useState<boolean>(true);

  const [isLoadingOutline, setIsLoadingOutline] = useState<boolean>(false);
  const [isReviewing, setIsReviewing] = useState<boolean>(false);
  const [outline, setOutline] = useState<ChapterOutline[]>([]);
  const [writtenContent, setWrittenContent] = useState<Record<string, WrittenChapterContent>>({});
  const [savedChapters, setSavedChapters] = useState<SavedChapter[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copyDocsSuccess, setCopyDocsSuccess] = useState<boolean>(false);

  useEffect(() => {
    try {
      const storedChapters = localStorage.getItem('savedBookChapters');
      if (storedChapters) {
        setSavedChapters(JSON.parse(storedChapters));
      }
    } catch (e) {
      console.error("Failed to parse saved chapters from localStorage", e);
      setSavedChapters([]);
    }
  }, []);

  const handleGenerateOutline = useCallback(async () => {
    if (!topic.trim()) {
      setError("書籍のテーマを入力してください。");
      return;
    }
    setIsLoadingOutline(true);
    setError(null);
    setOutline([]);
    setWrittenContent({});
    try {
      const result = await generateOutline({ topic, direction, numChapters, difficulty, isThinkingMode });
      const outlineWithIds = result.map((o, i) => ({ ...o, id: `${Date.now()}-${i}` }));
      setOutline(outlineWithIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "不明なエラーが発生しました。");
    } finally {
      setIsLoadingOutline(false);
    }
  }, [topic, direction, numChapters, difficulty, isThinkingMode]);
  
  const handleAdjustOutline = useCallback(async (id: string, currentOutline: Omit<ChapterOutline, 'id'>, instruction: string) => {
    setError(null);
    try {
      const adjusted = await adjustOutline({ currentOutline, instruction });
      setOutline(prev => prev.map(o => o.id === id ? { ...o, ...adjusted } : o));
    } catch (err) {
        setError(err instanceof Error ? err.message : "不明なエラーが発生しました。");
        throw err;
    }
  }, []);

  const handleChapterWrite = useCallback((id: string, content: WrittenChapterContent) => {
    setWrittenContent(prev => ({ ...prev, [id]: content }));
  }, []);

  const handleFinalReview = useCallback(async () => {
    if (outline.length === 0 || outline.some(o => !writtenContent[o.id])) return;
    setIsReviewing(true);
    setError(null);
    try {
        const chaptersToReview = outline.map(o => ({
            title: o.title,
            content: writtenContent[o.id].content,
        }));
        const reviewedChapters = await finalReview({ chapters: chaptersToReview });
        
        const newWrittenContent = { ...writtenContent };
        reviewedChapters.forEach(reviewedChapter => {
            const originalChapter = outline.find(o => o.title === reviewedChapter.title);
            if (originalChapter) {
                newWrittenContent[originalChapter.id] = {
                    ...newWrittenContent[originalChapter.id],
                    content: reviewedChapter.content,
                };
            }
        });
        setWrittenContent(newWrittenContent);

    } catch (err) {
        setError(err instanceof Error ? err.message : "不明なエラーが発生しました。");
    } finally {
        setIsReviewing(false);
    }
  }, [outline, writtenContent]);

  const handleSaveChapter = useCallback((chapterToSave: SavedChapter) => {
    if (savedChapters.some(c => c.id === chapterToSave.id)) return;
    const newSavedChapters = [...savedChapters, chapterToSave];
    setSavedChapters(newSavedChapters);
    localStorage.setItem('savedBookChapters', JSON.stringify(newSavedChapters));
  }, [savedChapters]);

  const handleDeleteChapter = useCallback((chapterId: string) => {
    const newSavedChapters = savedChapters.filter(c => c.id !== chapterId);
    setSavedChapters(newSavedChapters);
    localStorage.setItem('savedBookChapters', JSON.stringify(newSavedChapters));
  }, [savedChapters]);

  const handleCopyToGoogleDocs = useCallback(() => {
    if (outline.length === 0) return;
    const content = outline.map((chapterOutline) => {
      const chapterContent = writtenContent[chapterOutline.id];
      const title = chapterOutline.title;
      let chapterText = `## ${title}\n\n`;
      if (chapterContent) {
        chapterText += chapterContent.content;
      } else {
        chapterText += `### 章の概要\n\n${chapterOutline.overview}`;
      }
      return chapterText;
    }).join('\n\n---\n\n');
    
    navigator.clipboard.writeText(content).then(() => {
        setCopyDocsSuccess(true);
    });
  }, [outline, writtenContent]);

  useEffect(() => {
    if (copyDocsSuccess) {
      const timer = setTimeout(() => setCopyDocsSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copyDocsSuccess]);


  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <InputSection
            topic={topic}
            setTopic={setTopic}
            direction={direction}
            setDirection={setDirection}
            numChapters={numChapters}
            setNumChapters={setNumChapters}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            isThinkingMode={isThinkingMode}
            setIsThinkingMode={setIsThinkingMode}
            onGenerate={handleGenerateOutline}
            isLoading={isLoadingOutline}
          />
          <ResultSection
            topic={topic}
            outline={outline}
            writtenContent={writtenContent}
            isLoading={isLoadingOutline}
            isReviewing={isReviewing}
            error={error}
            onChapterWrite={handleChapterWrite}
            onOutlineAdjust={handleAdjustOutline}
            isThinkingMode={isThinkingMode}
            onSaveChapter={handleSaveChapter}
            savedChapters={savedChapters}
            onCopyToGoogleDocs={handleCopyToGoogleDocs}
            copyDocsSuccess={copyDocsSuccess}
            onFinalReview={handleFinalReview}
          />
          <SavedChaptersSection 
            chapters={savedChapters}
            onDeleteChapter={handleDeleteChapter}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
