import React, { useEffect, useState } from "react";
import type { StudyItem } from "../types";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface FlashcardReaderProps {
  studyItems: StudyItem[];
}

export const FlashcardReader: React.FC<FlashcardReaderProps> = ({
  studyItems,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  if (studyItems.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        No study materials available. Generate study materials first.
      </div>
    );
  }

  const currentCard = studyItems[currentIndex];

  const prevCard = () => {
    setShowAnswer(false);
    setCurrentIndex((i) => (i === 0 ? studyItems.length - 1 : i - 1));
  };

  const nextCard = () => {
    setShowAnswer(false);
    setCurrentIndex((i) => (i === studyItems.length - 1 ? 0 : i + 1));
  };

  const flipCard = () => {
    setShowAnswer((prev) => !prev);
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 w-full max-w-lg text-center cursor-pointer select-none transition-transform transform hover:scale-105"
        onClick={flipCard}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") flipCard();
          print(e.key);
        }}
      >
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
          {currentCard.question || `Card ${currentIndex + 1}`}
        </h3>
        {showAnswer && (
          <p className="text-gray-700 dark:text-gray-300">
            {currentCard.answer}
          </p>
        )}
        {!showAnswer && (
          <p className="text-gray-400 dark:text-gray-500 italic">
            Click to show answer
          </p>
        )}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center space-x-4">
        <button
          onClick={prevCard}
          className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {currentIndex + 1} / {studyItems.length}
        </span>
        <button
          onClick={nextCard}
          className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
