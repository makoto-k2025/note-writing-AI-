
import React from 'react';
import type { Difficulty } from '../types';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { Slider } from './ui/Slider';

interface InputSectionProps {
  topic: string;
  setTopic: (value: string) => void;
  direction: string;
  setDirection: (value: string) => void;
  numChapters: number;
  setNumChapters: (value: number) => void;
  difficulty: Difficulty;
  setDifficulty: (value: Difficulty) => void;
  isThinkingMode: boolean;
  setIsThinkingMode: (value: boolean) => void;
  onGenerate: () => void;
  isLoading: boolean;
}

export const InputSection: React.FC<InputSectionProps> = ({
  topic,
  setTopic,
  direction,
  setDirection,
  numChapters,
  setNumChapters,
  difficulty,
  setDifficulty,
  isThinkingMode,
  setIsThinkingMode,
  onGenerate,
  isLoading,
}) => {
  const difficultyLabels: { [key in Difficulty]: string } = {
    1: '初心者',
    2: '中級者',
    3: 'ビジネス',
    4: '上級者',
    5: '専門家',
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg space-y-6">
      <div>
        <label htmlFor="topic" className="block text-lg font-semibold mb-2 text-gray-700 dark:text-gray-200">
          1. 書籍のテーマやコンセプト
        </label>
        <textarea
          id="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="例：AI時代のリーダーシップ、持続可能なビジネスモデル..."
          className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        />
      </div>

      <div>
        <label htmlFor="direction" className="block text-lg font-semibold mb-2 text-gray-700 dark:text-gray-200">
          2. 執筆の方向性やターゲット読者 (任意)
        </label>
        <textarea
          id="direction"
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
          placeholder="例：20代の若手ビジネスパーソン向けに、実践的な事例を多く含める。"
          className="w-full h-24 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-lg font-semibold mb-2 text-gray-700 dark:text-gray-200">
            3. 章の数を設定
          </label>
          <Slider
            label={`${numChapters}章`}
            value={numChapters}
            min={3}
            max={12}
            step={1}
            onChange={setNumChapters}
          />
        </div>
        <div>
          <label className="block text-lg font-semibold mb-2 text-gray-700 dark:text-gray-200">
            4. 専門性のレベルを設定
          </label>
          <Slider
            label={difficultyLabels[difficulty]}
            value={difficulty}
            min={1}
            max={5}
            step={1}
            onChange={(val) => setDifficulty(val as Difficulty)}
          />
        </div>
      </div>
      
      <div className="flex items-center justify-between">
         <div className="flex items-center">
            <input
              id="thinking-mode"
              type="checkbox"
              checked={isThinkingMode}
              onChange={(e) => setIsThinkingMode(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="thinking-mode" className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">
              思考モードを有効にする（複雑なテーマ向け）
            </label>
          </div>
        <button
          onClick={onGenerate}
          disabled={isLoading}
          className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
        >
          {isLoading ? <SpinnerIcon /> : '目次案を作成'}
        </button>
      </div>

    </div>
  );
};
