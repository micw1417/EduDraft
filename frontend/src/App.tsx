// frontend/src/App.tsx
import React, { useState, useEffect } from "react";
import {
  Brain,
  FileText,
  Settings,
  GraduationCap,
  AlertCircle,
  CheckCircle,
  Wifi,
  WifiOff,
  Moon,
  Sun,
  Mic,
} from "lucide-react";

import { useStudyGuide } from "./hooks/useStudyGuide";
import { FileUpload } from "./components/FileUpload";
import { StudyItemCard } from "./components/StudyItemCard";
import { SettingsPanel } from "./components/SettingsPanel";
import { ExportButtons } from "./components/ExportButtons";
import { formatDate } from "./utils/helpers";
import { FlashcardReader } from "./components/FlashCardViewer";
import { QuizTab } from "./components/QuizTab";

type TabType =
  | "input"
  | "record"
  | "settings"
  | "results"
  | "flashcards"
  | "quiz"
  | "essay"; // New essay tab

function App() {
  const {
    // State
    studyItems,
    essays,
    isGenerating,
    isUploading,
    error,
    lastGenerated,
    inputContent,
    settings,
    isApiAvailable,

    // Validation
    contentValidation,
    canGenerate,

    // Actions
    generateStudyMaterials,
    generateEssay, // New action for essay generation
    uploadFile,
    exportStudyMaterials,
    updateStudyItem,
    deleteStudyItem,
    setInputContent,
    setSettings,
    clearError,
    reset,
    loadLastSession,
  } = useStudyGuide();

  const [activeTab, setActiveTab] = useState<TabType>("input");
  const [showLastSessionDialog, setShowLastSessionDialog] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("theme") === "dark" ||
        (window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches)
      );
    }
    return false;
  });

  useEffect(() => {
    const hasLastSession = localStorage.getItem("studyguide-last-session");
    if (hasLastSession && studyItems.length === 0) {
      setShowLastSessionDialog(true);
    }
  }, [studyItems.length]);

  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const handleGenerate = async () => {
    const success = await generateStudyMaterials();
    if (success) setActiveTab("results");
  };

  const handleGenerateEssay = async () => {
    const success = await generateEssay();
    if (success) setActiveTab("essay");
  };

  const handleLoadLastSession = () => {
    loadLastSession();
    setShowLastSessionDialog(false);
    setActiveTab("results");
  };

  const tabs = [
    { id: "input" as TabType, label: "Input Content", icon: FileText },
    { id: "record" as TabType, label: "Record", icon: Mic },
    { id: "results" as TabType, label: "Study Materials", icon: GraduationCap, badge: studyItems.length },
    { id: "flashcards" as TabType, label: "Flashcards", icon: Brain },
    { id: "quiz" as TabType, label: "Quiz", icon: Brain },
    { id: "essay" as TabType, label: "Essay", icon: FileText }, // Essay tab
    { id: "settings" as TabType, label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen gradient-primary transition-colors duration-300 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-600 rounded-lg">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">EduDraft</h1>
                <p className="text-sm text-gray-600">For Better Learning</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setDarkMode((d) => !d)}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
                title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-purple-700" />}
              </button>

              <div className="flex items-center space-x-2">
                {isApiAvailable === null ? (
                  <div className="animate-pulse flex items-center">
                    <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-500">Checking...</span>
                  </div>
                ) : isApiAvailable ? (
                  <div className="flex items-center text-green-600">
                    <Wifi className="w-4 h-4 mr-1" />
                    <span className="text-sm">Online</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <WifiOff className="w-4 h-4 mr-1" />
                    <span className="text-sm">Offline</span>
                  </div>
                )}
              </div>

              {(studyItems.length > 0 || inputContent) && (
                <button onClick={reset} className="text-sm text-gray-500 hover:text-gray-700 underline">
                  Start Over
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Last Session Dialog */}
      {showLastSessionDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Resume Last Session?</h3>
            <p className="text-gray-600 mb-4">
              We found a previous session with study materials. Would you like to continue where you left off?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowLastSessionDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Start Fresh
              </button>
              <button
                onClick={handleLoadLastSession}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Resume Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="ml-2 bg-indigo-100 text-indigo-600 text-xs font-medium px-2 py-0.5 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Error/Success Messages */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-sm text-red-800">{error}</p>
              <button onClick={clearError} className="text-sm text-red-600 hover:text-red-500 underline mt-1">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {lastGenerated && !error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-start">
            <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-sm text-green-800">
              Successfully generated {studyItems.length} study materials on {formatDate(lastGenerated)}
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Input Tab */}
        {activeTab === "input" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-indigo-600" />
                  Input Study Content
                </h2>
                <FileUpload onFileUpload={uploadFile} isUploading={isUploading} disabled={!isApiAvailable} />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Study Material Content</label>
                  <textarea
                    value={inputContent}
                    onChange={(e) => setInputContent(e.target.value)}
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-vertical dark:bg-black dark:text-white dark:border-gray-700 dark:placeholder-gray-400"
                    placeholder="Paste your lecture notes, textbook content, or any study material here. The AI will analyze this content and generate questions, flashcards, essays, and study materials based on your settings..."
                    disabled={isUploading}
                  />
                </div>

                <div className="flex justify-between items-center space-x-4">
                  <div className="text-sm space-y-1">
                    <div className={`${contentValidation.isValid ? "text-gray-500" : "text-red-500"}`}>
                      {inputContent.length} characters
                      {!contentValidation.isValid && contentValidation.errors.length > 0 && (
                        <span className="block">{contentValidation.errors[0]}</span>
                      )}
                    </div>
                    <div className="text-gray-400">Recommended: 500-5000 characters for best results</div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={handleGenerate}
                      disabled={!canGenerate || !isApiAvailable}
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white transition-colors ${
                        canGenerate && isApiAvailable ? "bg-indigo-600 hover:bg-indigo-700" : "bg-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {isGenerating ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      ) : (
                        <>
                          <Brain className="w-5 h-5 mr-2" />
                          Generate Study Materials
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleGenerateEssay}
                      disabled={!canGenerate || !isApiAvailable}
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white transition-colors ${
                        canGenerate && isApiAvailable ? "bg-green-600 hover:bg-green-700" : "bg-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {isGenerating ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      ) : (
                        <>
                          <FileText className="w-5 h-5 mr-2" />
                          Generate Essay
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Record Tab */}
        {activeTab === "record" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold flex items-center mb-4">
                <Mic className="w-5 h-5 mr-2 text-indigo-600" />
                Record Audio
              </h2>
              <p className="text-gray-600 mb-4">Use your microphone to record study notes or lecture content.</p>
              <button onClick={() => console.log("TODO: implement recording")} className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700">
                <Mic className="w-5 h-5 mr-2" />
                Start Recording
              </button>
            </div>
          </div>
        )}

        {/* Flashcards Tab */}
        {activeTab === "flashcards" && <FlashcardReader studyItems={studyItems} />}

        {/* Essay Tab */}
        {activeTab === "essay" && (
          <div className="space-y-6">
            {essays.length > 0 ? (
              essays.map((essay, idx) => (
                <div key={idx} className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-lg font-semibold mb-2">Essay {idx + 1}</h2>
                  <p className="text-gray-800 whitespace-pre-line">{essay}</p>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No Essays Yet</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">Generate an essay based on your input content to get started.</p>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && <SettingsPanel settings={settings} onSettingsChange={setSettings} />}

        {/* Results Tab */}
        {activeTab === "results" && (
          <div className="space-y-6">
            {studyItems.length > 0 ? (
              <>
                <ExportButtons studyItems={studyItems} onExport={exportStudyMaterials} disabled={isGenerating} />
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold flex items-center">
                      <GraduationCap className="w-5 h-5 mr-2 text-indigo-600" />
                      Generated Study Materials ({studyItems.length})
                    </h2>
                    <div className="text-sm text-gray-500">{lastGenerated && `Generated ${formatDate(lastGenerated)}`}</div>
                  </div>

                  <div className="space-y-4">
                    {studyItems.map((item, index) => (
                      <StudyItemCard key={item.id} studyItem={item} index={index} onUpdate={updateStudyItem} onDelete={deleteStudyItem} />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No Study Materials Yet</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">Add your study content and generate materials to get started. The AI will create questions, answers, and study guides based on your input.</p>
                <button onClick={() => setActiveTab("input")} className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                  <FileText className="w-5 h-5 mr-2" />
                  Get Started
                </button>
              </div>
            )}
          </div>
        )}

        {/* Quiz Tab */}
        {activeTab === "quiz" && <QuizTab studyItems={studyItems} />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-500">
            <p>EduDraft- Empowering teachers and students with AI-generated study materials</p>
            <p className="mt-1">Built with React, TypeScript, and OpenRouter AI</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
