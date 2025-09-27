import React, { useState } from "react";
import { Loader2, FileText, Send, CheckCircle } from "lucide-react";
import { generateEssay } from "../api"; // 👈 import from api.ts

interface EssayResult {
  summary: string;
  essay_prompt: string;
  grading: string;
}

export const EssayTab: React.FC = () => {
  const [topic, setTopic] = useState("");
  const [studentAnswer, setStudentAnswer] = useState("");
  const [result, setResult] = useState<EssayResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!topic || !studentAnswer) {
      setError("Please enter both topic and essay answer.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const response = await generateEssay(topic, studentAnswer, "<YOUR_API_KEY>");
      setResult(response);
    } catch (err: any) {
      setError(err.message || "Failed to generate essay.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <FileText className="w-16 h-16 mx-auto mb-4 text-indigo-600" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Essay Practice</h2>
        <p className="text-gray-600">
          Generate essay prompts from your lesson plan and get AI grading.
        </p>
      </div>

      {/* Input Form */}
      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Topic
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter lesson topic (e.g. Biology)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Essay Answer
          </label>
          <textarea
            rows={6}
            value={studentAnswer}
            onChange={(e) => setStudentAnswer(e.target.value)}
            placeholder="Write your essay here..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex items-center px-6 py-3 rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              Submit Essay
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h3 className="text-lg font-semibold flex items-center text-indigo-600">
            <CheckCircle className="w-5 h-5 mr-2" />
            Results
          </h3>

          <div>
            <h4 className="font-medium text-gray-900">Lesson Summary</h4>
            <p className="text-gray-700">{result.summary}</p>
          </div>

          <div>
            <h4 className="font-medium text-gray-900">Essay Prompt</h4>
            <p className="text-gray-700">{result.essay_prompt}</p>
          </div>

          <div>
            <h4 className="font-medium text-gray-900">Grading & Feedback</h4>
            <p className="text-gray-700 whitespace-pre-line">
              {result.grading}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
