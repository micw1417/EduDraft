// frontend/src/components/QuizTab.tsx
import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  RotateCcw,
  CheckCircle,
  Clock,
  Trophy,
  Settings,
  Brain,
  BarChart3,
  Loader2,
} from "lucide-react";
import { type StudyItem, apiService } from "../services/api";

interface QuizTabProps {
  studyItems: StudyItem[];
}

interface QuizQuestion {
  id: string;
  question: string;
  options: { [key: string]: string }; // A, B, C, D format from your backend
  answer: string; // The correct option key (e.g., "A")
  difficulty: string;
  topic: string;
}

interface QuizSettings {
  numQuestions: number;
  difficulty: string;
  showExplanations: boolean;
}

type QuizView = "setup" | "quiz" | "results";

export const QuizTab: React.FC<QuizTabProps> = ({ studyItems }) => {
  const [currentView, setCurrentView] = useState<QuizView>("setup");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  const [quizSettings, setQuizSettings] = useState<QuizSettings>({
    numQuestions: 10,
    difficulty: "medium",
    showExplanations: true,
  });

  // Timer effect
  useEffect(() => {
    if (startTime && currentView === "quiz") {
      const interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor(
          (now.getTime() - startTime.getTime()) / 1000
        );
        setTimeSpent(elapsed);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [startTime, currentView]);

  // Generate quiz using your Python backend
  const generateQuiz = async () => {
    if (studyItems.length === 0) {
      setError("No study materials available for quiz generation.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Convert study items to transcript format for your backend
      // Use more meaningful content for better question generation
      const transcript = studyItems.map((item) => {
        // Create meaningful sentences that can generate better questions
        return `${item.question} The answer is ${item.answer}. This relates to ${item.topic} at ${item.difficulty} level.`;
      });

      // Call your Python backend
      const response = await apiService.generateQuiz(
        transcript,
        quizSettings.numQuestions
      );

      // Process and enhance the questions
      const enhancedQuestions = response
        .filter((item) => item.type === "multiple-choice")
        .map((item, index) => {
          // If the backend gives generic options, let's create better ones based on the study materials
          const relatedItems = studyItems.filter(
            (si) => si.topic === item.topic || si.difficulty === item.difficulty
          );

          // Create more meaningful options using study material content
          const options = {
            A: relatedItems[3]?.answer || `Correct answer for ${item.topic}`,
            B:
              relatedItems[0]?.answer || `Alternative related to ${item.topic}`,
            C: relatedItems[1]?.answer || `Different concept in ${item.topic}`,
            D: relatedItems[2]?.answer || `Distractor for ${item.topic}`,
          };

          // Make sure we don't have duplicate options
          const uniqueOptions = { A: options.A };
          let optionKeys = ["B", "C", "D"];
          let keyIndex = 0;

          [options.B, options.C, options.D].forEach((option) => {
            if (
              option !== options.A &&
              !Object.values(uniqueOptions).includes(option)
            ) {
              uniqueOptions[optionKeys[keyIndex]] = option;
              keyIndex++;
            }
          });

          // Fill remaining slots with generic but topic-specific options
          while (keyIndex < 3) {
            const topics = [
              "concept",
              "principle",
              "method",
              "approach",
              "theory",
              "practice",
            ];
            const randomTopic =
              topics[Math.floor(Math.random() * topics.length)];
            const genericOption = `Alternative ${randomTopic} in ${item.topic}`;

            if (!Object.values(uniqueOptions).includes(genericOption)) {
              uniqueOptions[optionKeys[keyIndex]] = genericOption;
              keyIndex++;
            }
          }

          return {
            ...item,
            options: uniqueOptions,
          };
        });

      if (enhancedQuestions.length === 0) {
        setError(
          "No multiple choice questions could be generated from your study materials."
        );
        return;
      }

      setQuizQuestions(enhancedQuestions as QuizQuestion[]);
      setUserAnswers(new Array(enhancedQuestions.length).fill(""));
      setCurrentQuestionIndex(0);
      setCurrentView("quiz");
      setStartTime(new Date());
      setShowAnswer(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate quiz");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle answer selection
  const handleAnswer = (selectedOption: string) => {
    if (showAnswer) return; // Prevent multiple selections

    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = selectedOption;
    setUserAnswers(newAnswers);
    setShowAnswer(true);

    // Auto-advance after 2 seconds
    setTimeout(() => {
      if (currentQuestionIndex < quizQuestions.length - 1) {
        nextQuestion();
      }
    }, 2000);
  };

  // Navigation
  const nextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowAnswer(false);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setShowAnswer(userAnswers[currentQuestionIndex - 1] !== "");
    }
  };

  // Finish quiz and calculate score
  const finishQuiz = () => {
    const correctAnswers = quizQuestions.filter(
      (q, i) => userAnswers[i] === q.answer
    ).length;
    const score = Math.round((correctAnswers / quizQuestions.length) * 100);

    setCurrentView("results");
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const currentQuestion = quizQuestions[currentQuestionIndex];
  const currentAnswer = userAnswers[currentQuestionIndex];
  const isCorrect = currentAnswer === currentQuestion?.answer;
  const answeredQuestions = userAnswers.filter((a) => a !== "").length;
  const score =
    quizQuestions.length > 0
      ? Math.round(
          (quizQuestions.filter((q, i) => userAnswers[i] === q.answer).length /
            quizQuestions.length) *
            100
        )
      : 0;

  // Quiz Setup View
  if (currentView === "setup") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <Brain className="w-16 h-16 mx-auto mb-4 text-indigo-600" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Interactive Quiz
          </h2>
          <p className="text-gray-600">
            Test your knowledge with AI-generated multiple choice questions
          </p>
        </div>

        {studyItems.length === 0 ? (
          <div className="text-center p-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500 mb-4">
              No study materials available for quiz generation.
            </p>
            <p className="text-sm text-gray-400">
              Generate study materials first to create a quiz.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            <h3 className="text-lg font-semibold flex items-center">
              <Settings className="w-5 h-5 mr-2 text-indigo-600" />
              Quiz Settings
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Questions
                </label>
                <input
                  type="number"
                  min="5"
                  max={Math.min(studyItems.length, 20)}
                  value={quizSettings.numQuestions}
                  onChange={(e) =>
                    setQuizSettings({
                      ...quizSettings,
                      numQuestions: parseInt(e.target.value) || 5,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty
                </label>
                <select
                  value={quizSettings.difficulty}
                  onChange={(e) =>
                    setQuizSettings({
                      ...quizSettings,
                      difficulty: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={quizSettings.showExplanations}
                  onChange={(e) =>
                    setQuizSettings({
                      ...quizSettings,
                      showExplanations: e.target.checked,
                    })
                  }
                  className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">
                  Show explanations after answers
                </span>
              </label>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-gray-500">
                {studyItems.length} study materials available
              </div>
              <button
                onClick={generateQuiz}
                disabled={isGenerating}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating Quiz...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Start Quiz
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Quiz View
  if (currentView === "quiz" && currentQuestion) {
    const optionKeys = Object.keys(currentQuestion.options);

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Quiz Header */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-600">
                Question {currentQuestionIndex + 1} of {quizQuestions.length}
              </span>
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="w-4 h-4 mr-1" />
                {formatTime(timeSpent)}
              </div>
            </div>
            <button
              onClick={() => {
                setCurrentView("setup");
                setQuizQuestions([]);
                setUserAnswers([]);
              }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              End Quiz
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${
                  ((currentQuestionIndex + 1) / quizQuestions.length) * 100
                }%`,
              }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  currentQuestion.difficulty === "easy"
                    ? "bg-green-100 text-green-800"
                    : currentQuestion.difficulty === "medium"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {currentQuestion.difficulty}
              </span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {currentQuestion.topic}
              </span>
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              {currentQuestion.question}
            </h3>
          </div>

          {/* Answer Options */}
          <div className="space-y-3 mb-6">
            {optionKeys.map((optionKey) => (
              <button
                key={optionKey}
                onClick={() => handleAnswer(optionKey)}
                disabled={showAnswer}
                className={`w-full text-left px-6 py-4 rounded-lg border-2 transition-all duration-200 ${
                  showAnswer
                    ? optionKey === currentQuestion.answer
                      ? "bg-green-50 border-green-500 text-green-800"
                      : optionKey === currentAnswer &&
                        currentAnswer !== currentQuestion.answer
                      ? "bg-red-50 border-red-500 text-red-800"
                      : "bg-gray-50 border-gray-200 text-gray-600"
                    : "bg-white border-gray-300 text-gray-800 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                }`}
              >
                <div className="flex items-center">
                  <span className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center mr-4 text-sm font-bold">
                    {optionKey}
                  </span>
                  {currentQuestion.options[optionKey]}
                  {showAnswer && optionKey === currentQuestion.answer && (
                    <CheckCircle className="w-5 h-5 ml-auto text-green-600" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Answer Feedback */}
          {showAnswer && quizSettings.showExplanations && (
            <div
              className={`p-4 rounded-lg mb-6 ${
                isCorrect
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <div className="flex items-start">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                    isCorrect
                      ? "bg-green-100 text-green-600"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {isCorrect ? "✓" : "✗"}
                </div>
                <div>
                  <p
                    className={`font-medium mb-2 ${
                      isCorrect ? "text-green-800" : "text-red-800"
                    }`}
                  >
                    {isCorrect
                      ? "Correct!"
                      : `Incorrect. The correct answer is ${currentQuestion.answer}.`}
                  </p>
                  <p
                    className={`text-sm ${
                      isCorrect ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    This question covers {currentQuestion.topic} concepts.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              onClick={prevQuestion}
              disabled={currentQuestionIndex === 0}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </button>

            <div className="text-sm text-gray-500">
              {answeredQuestions} of {quizQuestions.length} answered
            </div>

            {currentQuestionIndex === quizQuestions.length - 1 ? (
              <button
                onClick={finishQuiz}
                disabled={answeredQuestions < quizQuestions.length}
                className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trophy className="w-4 h-4 mr-2" />
                Finish Quiz
              </button>
            ) : (
              <button
                onClick={nextQuestion}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Results View
  if (currentView === "results") {
    const correctAnswers = quizQuestions.filter(
      (q, i) => userAnswers[i] === q.answer
    ).length;
    const percentage = Math.round(
      (correctAnswers / quizQuestions.length) * 100
    );

    const getScoreColor = (score: number) => {
      if (score >= 80) return "text-green-600";
      if (score >= 60) return "text-yellow-600";
      return "text-red-600";
    };

    const getScoreMessage = (score: number) => {
      if (score >= 90) return "Excellent work! 🎉";
      if (score >= 80) return "Great job! 👏";
      if (score >= 70) return "Good effort! 👍";
      if (score >= 60) return "Not bad, keep practicing! 📚";
      return "Keep studying, you'll improve! 💪";
    };

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Results Header */}
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-indigo-100 flex items-center justify-center">
            <Trophy className="w-10 h-10 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Quiz Complete!
          </h2>
          <p className="text-gray-600">{getScoreMessage(percentage)}</p>
        </div>

        {/* Score Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div
              className={`text-6xl font-bold mb-2 ${getScoreColor(percentage)}`}
            >
              {percentage}%
            </div>
            <p className="text-gray-600">
              {correctAnswers} out of {quizQuestions.length} correct
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-gray-500 mb-1">Time Spent</div>
              <div className="font-semibold">{formatTime(timeSpent)}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-gray-500 mb-1">Accuracy</div>
              <div className="font-semibold">{percentage}%</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-4 mb-6">
            <div
              className={`h-4 rounded-full transition-all duration-1000 ${
                percentage >= 80
                  ? "bg-green-500"
                  : percentage >= 60
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                setCurrentView("setup");
                setQuizQuestions([]);
                setUserAnswers([]);
              }}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Take Another Quiz
            </button>

            <button
              onClick={generateQuiz}
              disabled={isGenerating}
              className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <Settings className="w-5 h-5 mr-2" />
              {isGenerating ? "Generating..." : "New Questions"}
            </button>
          </div>
        </div>

        {/* Detailed Results */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-indigo-600" />
            Question Review
          </h3>
          <div className="space-y-3">
            {quizQuestions.map((question, index) => {
              const userAnswer = userAnswers[index];
              const isCorrect = userAnswer === question.answer;

              return (
                <div
                  key={question.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      Question {index + 1}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        isCorrect
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {isCorrect ? "Correct" : "Incorrect"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">
                    {question.question}
                  </p>
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Correct answer:</span>{" "}
                    {question.answer} - {question.options[question.answer]}
                    {userAnswer && !isCorrect && (
                      <>
                        <br />
                        <span className="font-medium text-red-600">
                          Your answer:
                        </span>{" "}
                        {userAnswer} - {question.options[userAnswer]}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return null;
};
