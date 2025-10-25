
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-md">
      <div className="container mx-auto px-4 py-4">
        <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-white">
          AI書籍執筆アシスタント
        </h1>
      </div>
    </header>
  );
};
