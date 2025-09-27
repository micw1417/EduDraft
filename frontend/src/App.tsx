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
  PenTool,
  BookOpen,
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
  | "essay";

interface EssayData {
  summary: string;
  essay_prompt: string;
  grading: string;
  topic: string;
  created_at: string;
}

function App() {
  const {
    // State
    studyItems,
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

  // Essay-specific state (managed locally in App component)
  const [essays, setEssays] = useState<EssayData[]>([]);
  const [isGeneratingEssay, setIsGeneratingEssay] = useState(false);

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

  // FIXED: Essay generation function
  const handleGenerateEssay = async () => {
    if (!inputContent.trim()) {
      clearError();
      // Set a temporary error for essay generation
      return;
    }

    setIsGeneratingEssay(true);
    clearError();

    try {
      // Import the API service
      const { apiService } = await import('./services/api');
      
      const result = await apiService.generateEssay(
        inputContent,
        settings.subject || 'General Studies',
        '', // Empty student answer for prompt generation
        undefined // Will use default API key
      );

      const essayData: EssayData = {
        summary: result.summary,
        essay_prompt: result.essay_prompt,
        grading: result.grading,
        topic: settings.subject || 'General Studies',
        created_at: new Date().toISOString()
      };

      setEssays(prev => [...prev, essayData]);
      setActiveTab("essay");
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate essay';
      // You'll need to add a way to show errors - for now, console.error
      console.error('Essay generation error:', errorMessage);
      alert(`Essay generation failed: ${errorMessage}`);
    } finally {
      setIsGeneratingEssay(false);
    }
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
    { id: "essay" as TabType, label: "Essays", icon: PenTool, badge: essays.length },
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

              {(studyItems.length > 0 || inputContent || essays.length > 0) && (
                <button 
                  onClick={() => {
                    reset();
                    setEssays([]);
                  }} 
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
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
                      disabled={!canGenerate || !isApiAvailable || isGenerating}
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white transition-colors ${
                        canGenerate && isApiAvailable && !isGenerating ? "bg-indigo-600 hover:bg-indigo-700" : "bg-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {isGenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <Brain className="w-5 h-5 mr-2" />
                          Generate Study Materials
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleGenerateEssay}
                      disabled={!canGenerate || !isApiAvailable || isGeneratingEssay}
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white transition-colors ${
                        canGenerate && isApiAvailable && !isGeneratingEssay ? "bg-green-600 hover:bg-green-700" : "bg-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {isGeneratingEssay ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <PenTool className="w-5 h-5 mr-2" />
                          Generate Essay
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                Tips for Better Results
              </h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>• Include key concepts, definitions, and important facts</li>
                <li>• Provide context and explanations, not just bullet points</li>
                <li>• Add examples and applications when relevant</li>
                <li>• Include any specific learning objectives or focus areas</li>
                <li>• The more detailed your content, the better the generated materials</li>
              </ul>
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
              <button 
                onClick={() => console.log("TODO: implement recording")} 
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
              >
                <Mic className="w-5 h-5 mr-2" />
                Start Recording
              </button>
            </div>
          </div>
        )}

        {/* Flashcards Tab */}
        {activeTab === "flashcards" && <FlashcardReader studyItems={studyItems} />}

        {/* Quiz Tab */}
        {activeTab === "quiz" && <QuizTab studyItems={studyItems} />}

        {/* Essay Tab - FIXED */}
        {activeTab === "essay" && (
          <div className="space-y-6">
            {essays.length > 0 ? (
              <div className="space-y-6">
                {essays.map((essayData, idx) => (
                  <div key={idx} className="bg-white rounded-lg shadow-md overflow-hidden">
                    {/* Essay Header */}
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
                      <h2 className="text-xl font-semibold text-white flex items-center">
                        <PenTool className="w-5 h-5 mr-2" />
                        Essay Assignment {idx + 1}: {essayData.topic}
                      </h2>
                      <p className="text-purple-100 text-sm mt-1">
                        Created on {new Date(essayData.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="p-6">
                      {/* Lesson Summary */}
                      {essayData.summary && (
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                            <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
                            Lesson Summary
                          </h3>
                          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                            <p className="text-blue-800 leading-relaxed">{essayData.summary}</p>
                          </div>
                        </div>
                      )}

                      {/* Essay Prompt */}
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                          <PenTool className="w-5 h-5 mr-2 text-green-600" />
                          Essay Prompt
                        </h3>
                        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                          <div className="prose max-w-none text-green-800">
                            <p className="whitespace-pre-line leading-relaxed">{essayData.essay_prompt}</p>
                          </div>
                        </div>
                      </div>

                      {/* Student Response Area */}
                      <div className="border-t pt-6">
                        <h4 className="text-md font-semibold text-gray-900 mb-3">Your Response:</h4>
                        <textarea
                          id={`essay-response-${idx}`}
                          rows={10}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-vertical"
                          placeholder="Write your essay response here. Make sure to address all the requirements mentioned in the prompt above..."
                        />
                        <div className="flex justify-between items-center mt-4">
                          <div className="text-sm text-gray-500">
                            Tip: Review the prompt carefully and ensure you meet all requirements
                          </div>
                          <button 
                            onClick={() => {
                              const textarea = document.getElementById(`essay-response-${idx}`) as HTMLTextAreaElement;
                              const response = textarea?.value || '';
                              if (response.trim()) {
                                handleGradeEssay(essayData, response, idx);
                              } else {
                                alert('Please write your essay response before submitting for grading.');
                              }
                            }}
                            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Submit for Grading
                          </button>
                        </div>
                      </div>

                      {/* Grading Results */}
                      {essayData.grading && (
                        <div className="mt-6 pt-6 border-t">
                          <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                            <CheckCircle className="w-5 h-5 mr-2 text-orange-600" />
                            Grading & Feedback
                          </h4>
                          <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
                            <div className="text-orange-800 whitespace-pre-line leading-relaxed">
                              {essayData.grading}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <PenTool className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No Essays Yet</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Add your study content and click "Generate Essay" to create essay prompts based on your material.
                </p>
                <button
                  onClick={() => setActiveTab("input")}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Add Content
                </button>
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
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Add your study content and generate materials to get started. The AI will create questions, answers, and study guides based on your input.
                </p>
                <button
                  onClick={() => setActiveTab("input")}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Get Started
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-500">
            <p>EduDraft - Empowering teachers and students with AI-generated study materials</p>
            <p className="mt-1">Built with React, TypeScript, and OpenRouter AI</p>
          </div>
        </div>
      </footer>
    </div>
  );

  // Helper function for grading essays
  async function handleGradeEssay(essayData: EssayData, studentResponse: string, essayIndex: number) {
    setIsGeneratingEssay(true);
    
    try {
      const { apiService } = await import('./services/api');
      
      const result = await apiService.generateEssay(
        inputContent,
        essayData.topic,
        studentResponse // Pass the student's response for grading
      );

      // Update the essay with grading results
      setEssays(prev => prev.map((essay, idx) => 
        idx === essayIndex 
          ? { ...essay, grading: result.grading }
          : essay
      ));
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to grade essay';
      alert(`Essay grading failed: ${errorMessage}`);
    } finally {
      setIsGeneratingEssay(false);
    }
  }
}

export default App;-x-3">
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
          <div className="flex space
