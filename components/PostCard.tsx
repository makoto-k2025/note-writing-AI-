import React, { useState, useCallback, memo } from 'react';
import type { ChapterOutline, WrittenChapterContent, ImageTone, Section } from '../types';
import { generateImage, writeChapter, adjustChapter, adjustOutline } from '../services/geminiService';
import { CopyIcon } from './icons/CopyIcon';
import { CheckIcon } from './icons/CheckIcon';
import { ImageIcon } from './icons/ImageIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';

// Simple Markdown Renderer
const MarkdownRenderer: React.FC<{ content: string }> = memo(({ content }) => {
    const renderContent = () => {
        if (!content) return null;
        return content.split('\n').map((line, index) => {
            if (line.startsWith('### ')) {
                return <h3 key={index} className="text-lg font-semibold mt-4 mb-2 dark:text-gray-200">{line.substring(4)}</h3>;
            }
            if (line.startsWith('## ')) {
                return <h2 key={index} className="text-xl font-bold mt-6 mb-3 dark:text-gray-100">{line.substring(3)}</h2>;
            }
            if (line.startsWith('> ')) {
                return <blockquote key={index} className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-2">{line.substring(2)}</blockquote>
            }
            if (line.startsWith('* ')) {
                return <li key={index} className="ml-5 list-disc">{line.substring(2)}</li>;
            }
            if (line.startsWith('---')) {
                return <hr key={index} className="my-6 border-gray-300 dark:border-gray-600" />
            }
            if (line.trim() === '') {
                return <br key={index} />;
            }
            // Basic bold support
            const parts = line.split(/(\*\*.*?\*\*)/g);
            return (
              <p key={index} className="my-1">
                {parts.map((part, i) =>
                  part.startsWith('**') && part.endsWith('**') ? (
                    <strong key={i}>{part.slice(2, -2)}</strong>
                  ) : (
                    part
                  )
                )}
              </p>
            );
        });
    };

    return <div className="prose dark:prose-invert max-w-none">{renderContent()}</div>;
});


const BookmarkIcon: React.FC<{ filled?: boolean }> = ({ filled = false }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} fill={filled ? "currentColor" : "none"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
  </svg>
);

const AdjustIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
    </svg>
);

const EditIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
        <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
    </svg>
);

const numberToKanji = (num: number): string => {
    const kanji = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一"];
    return kanji[num] || String(num);
};

const getChapterTitleText = (chapterNumber: number, totalChapters: number, title: string): string => {
    if (totalChapters > 1 && chapterNumber === 1) return `序章：${title}`;
    if (totalChapters > 1 && chapterNumber === totalChapters) return `終章：${title}`;
    if (totalChapters === 1) return title;
    return `第${numberToKanji(chapterNumber - 1)}章：${title}`;
};

interface ChapterCardProps {
  topic: string;
  outline: ChapterOutline;
  writtenContent: WrittenChapterContent | undefined;
  isThinkingMode: boolean;
  onChapterWrite: (id: string, content: WrittenChapterContent) => void;
  onOutlineAdjust: (id: string, currentOutline: Omit<ChapterOutline, 'id'>, instruction: string) => Promise<void>;
  onSaveChapter: (chapter: ChapterOutline & WrittenChapterContent) => void;
  isSaved: boolean;
  chapterNumber: number;
  totalChapters: number;
  allChapterTitles: string[];
}

export const ChapterCard: React.FC<ChapterCardProps> = ({ 
    topic,
    outline,
    writtenContent,
    isThinkingMode,
    onChapterWrite,
    onOutlineAdjust,
    onSaveChapter,
    isSaved,
    chapterNumber,
    totalChapters,
    allChapterTitles
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const [isWriting, setIsWriting] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [showAdjustPanel, setShowAdjustPanel] = useState(false);
  const [adjustmentInstruction, setAdjustmentInstruction] = useState('');
  
  const [isAdjustingOutline, setIsAdjustingOutline] = useState(false);
  const [showAdjustOutlinePanel, setShowAdjustOutlinePanel] = useState(false);
  const [outlineAdjustmentInstruction, setOutlineAdjustmentInstruction] = useState('');

  const [error, setError] = useState<string | null>(null);

  const handleWriteChapter = async () => {
    setIsWriting(true);
    setError(null);
    try {
        const content = await writeChapter({
            topic,
            chapterOutline: outline,
            isThinkingMode,
            chapterNumber,
            totalChapters,
            allChapterTitles
        });
        onChapterWrite(outline.id, content);
    } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラー');
    } finally {
        setIsWriting(false);
    }
  };
  
  const handleAdjustChapter = async () => {
    if (!writtenContent || !adjustmentInstruction.trim()) return;
    setIsAdjusting(true);
    setError(null);
    try {
        const adjustedContent = await adjustChapter(writtenContent, { instruction: adjustmentInstruction });
        onChapterWrite(outline.id, adjustedContent);
        setAdjustmentInstruction('');
        setShowAdjustPanel(false);
    } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラー');
    } finally {
        setIsAdjusting(false);
    }
  };

  const handleAdjustOutline = async () => {
    if (!outlineAdjustmentInstruction.trim()) return;
    setIsAdjustingOutline(true);
    setError(null);
    try {
        const { id, ...currentOutline } = outline;
        await onOutlineAdjust(id, currentOutline, outlineAdjustmentInstruction);
        setOutlineAdjustmentInstruction('');
        setShowAdjustOutlinePanel(false);
    } catch (err) {
        setError(err instanceof Error ? err.message : '不明なエラー');
    } finally {
        setIsAdjustingOutline(false);
    }
  };

  const handleCopy = useCallback(() => {
    if (!writtenContent) return;
    navigator.clipboard.writeText(writtenContent.content).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  }, [writtenContent]);

  const handleGenerateImage = async (tone: ImageTone) => {
    if (!writtenContent) return;
    setShowImageOptions(false);
    setIsGeneratingImage(true);
    setGeneratedImage(null);
    setImageError(null);
    try {
      const imageUrl = await generateImage(writtenContent.content, tone);
      setGeneratedImage(imageUrl);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : '不明なエラー');
    } finally {
      setIsGeneratingImage(false);
    }
  };
  
  const downloadImage = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `generated_image_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const OutlineDisplay = () => (
    <div className="space-y-4">
        <div>
            <h4 className="font-semibold text-sm text-blue-600 dark:text-blue-400">章の概要</h4>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{outline.overview}</p>
        </div>
        <div>
            <h4 className="font-semibold text-sm text-blue-600 dark:text-blue-400">この章の意図</h4>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{outline.purpose}</p>
        </div>
        <div>
            <h4 className="font-semibold text-sm text-blue-600 dark:text-blue-400">節</h4>
            <ul className="mt-1 space-y-2">
                {outline.sections.map((section, idx) => (
                    <li key={idx} className="text-sm p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{section.title}</p>
                        <p className="text-gray-600 dark:text-gray-400">{section.summary}</p>
                    </li>
                ))}
            </ul>
        </div>
        {showAdjustOutlinePanel && (
            <div className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">構成案を修正</h4>
                <textarea
                    value={outlineAdjustmentInstruction}
                    onChange={(e) => setOutlineAdjustmentInstruction(e.target.value)}
                    placeholder="例：もっと初心者に向けた内容にしてください。"
                    className="w-full mt-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 transition text-sm"
                    rows={3}
                />
                <div className="flex justify-end mt-2">
                    <button onClick={handleAdjustOutline} disabled={isAdjustingOutline} className="flex items-center justify-center min-w-[140px] px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-blue-400">
                        {isAdjustingOutline ? <SpinnerIcon /> : 'この内容で修正'}
                    </button>
                </div>
            </div>
        )}
        <div className="mt-4 flex justify-end items-center gap-2">
            <button 
                onClick={() => setShowAdjustOutlinePanel(!showAdjustOutlinePanel)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition"
            >
                <EditIcon /> 修正を依頼
            </button>
            <button 
                onClick={handleWriteChapter}
                disabled={isWriting}
                className="flex items-center justify-center min-w-[140px] px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:bg-green-400"
            >
               {isWriting ? <SpinnerIcon/> : 'この章を執筆する'} 
            </button>
        </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden transition-all">
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">
            {getChapterTitleText(chapterNumber, totalChapters, outline.title)}
        </h3>

        {error && <div className="my-4 text-center p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md">{error}</div>}

        {!writtenContent ? (
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-md">
                <OutlineDisplay />
            </div>
        ) : (
            <div>
                 {isGeneratingImage && (
                    <div className="flex justify-center items-center h-48 bg-gray-100 dark:bg-gray-700 rounded-md mb-4">
                        <SpinnerIcon /> <span className="ml-2">画像を生成中...</span>
                    </div>
                )}
                {imageError && (
                    <div className="text-center p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md mb-4">{imageError}</div>
                )}
                {generatedImage && (
                    <div className="mb-4 group relative">
                        <img src={generatedImage} alt="Generated cover" className="w-full rounded-md" />
                        <button onClick={downloadImage} className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity opacity-0 group-hover:opacity-100" aria-label="画像をダウンロード">
                            <DownloadIcon />
                        </button>
                    </div>
                )}
                
                <MarkdownRenderer content={writtenContent.content} />

                <div className="mt-6 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-md">
                    <h4 className="font-semibold text-sm text-blue-600 dark:text-blue-400">この章の意図 / フック</h4>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{writtenContent.intent}</p>
                </div>

                {showAdjustPanel && (
                    <div className="bg-gray-100 dark:bg-gray-900/50 p-4 mt-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h4 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">この章を修正</h4>
                      <textarea
                        value={adjustmentInstruction}
                        onChange={(e) => setAdjustmentInstruction(e.target.value)}
                        placeholder="例：もっと具体例を増やしてください。"
                        className="w-full mt-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700"
                        rows={3}
                      />
                      <div className="flex justify-end mt-2">
                          <button onClick={handleAdjustChapter} disabled={isAdjusting} className="flex items-center justify-center min-w-[140px] px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-blue-400">
                              {isAdjusting ? <SpinnerIcon /> : 'この内容で修正する'}
                          </button>
                      </div>
                    </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 flex justify-end items-center space-x-2">
                    {showImageOptions && (
                        <div className="flex gap-2" onMouseLeave={() => setShowImageOptions(false)}>
                            <button onClick={() => handleGenerateImage('line-art')} className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500">ラインアート</button>
                            <button onClick={() => handleGenerateImage('watercolor')} className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500">淡い水彩画</button>
                            <button onClick={() => handleGenerateImage('creative')} className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500">AIおまかせ</button>
                        </div>
                    )}
                    <button onClick={() => setShowImageOptions(!showImageOptions)} className="p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-200 dark:hover:bg-gray-600" aria-label="画像を生成" disabled={isGeneratingImage || isAdjusting}>
                        <ImageIcon />
                    </button>
                    <button onClick={() => setShowAdjustPanel(!showAdjustPanel)} className={`p-2 rounded-full ${showAdjustPanel ? 'bg-blue-100 text-blue-600 dark:bg-blue-900' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`} aria-label="章を修正" disabled={isAdjusting}>
                        <AdjustIcon />
                    </button>
                    <button onClick={() => onSaveChapter({ ...outline, ...writtenContent })} className={`p-2 rounded-full ${isSaved ? 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900 cursor-default' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`} disabled={isSaved || isAdjusting} aria-label={isSaved ? "保存済み" : "保存"}>
                        <BookmarkIcon filled={isSaved} />
                    </button>
                    <button onClick={handleCopy} className={`p-2 rounded-full ${isCopied ? 'text-green-600 bg-green-100 dark:bg-green-900' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`} disabled={isCopied || isAdjusting} aria-label={isCopied ? "コピー済み" : "コピー"}>
                        {isCopied ? <CheckIcon /> : <CopyIcon />}
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
