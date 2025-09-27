// frontend/src/components/SettingsPanel.tsx
import React from "react";
import { Settings } from "lucide-react";
import type { SettingsPanelProps } from "../types";

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSettingsChange,
}) => {
  const handleChange = (key: keyof typeof settings, value: unknown) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const handleQuestionTypeChange = (type: string, checked: boolean) => {
    const newTypes = checked
      ? [...settings.questionTypes, type]
      : settings.questionTypes.filter((t) => t !== type);
    handleChange("questionTypes", newTypes);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center">
        <Settings className="w-5 h-5 mr-2 text-indigo-600" />
        Generation Settings
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Questions
          </label>
          <input
            type="number"
            min="1"
            max="50"
            value={settings.numQuestions}
            onChange={(e) =>
              handleChange("numQuestions", parseInt(e.target.value) || 1)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Between 1 and 50 questions
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Difficulty Level
          </label>
          <select
            value={settings.difficulty}
            onChange={(e) => handleChange("difficulty", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject Area
          </label>
          <input
            type="text"
            value={settings.subject}
            onChange={(e) => handleChange("subject", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="e.g., Biology, History, Mathematics"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Question Types
          </label>
          <div className="space-y-2">
            {[
              { value: "multiple-choice", label: "Multiple Choice" },
              { value: "short-answer", label: "Short Answer" },
              { value: "true-false", label: "True/False" },
              { value: "fill-in-blank", label: "Fill in Blank" },
            ].map((type) => (
              <label key={type.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.questionTypes.includes(type.value)}
                  onChange={(e) =>
                    handleQuestionTypeChange(type.value, e.target.checked)
                  }
                  className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">{type.label}</span>
              </label>
            ))}
          </div>
          {settings.questionTypes.length === 0 && (
            <p className="text-xs text-red-500 mt-1">
              At least one question type must be selected
            </p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Custom Instructions (Optional)
        </label>
        <textarea
          value={settings.customPrompt || ""}
          onChange={(e) => handleChange("customPrompt", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="Add any specific instructions for question generation..."
        />
        <p className="text-xs text-gray-500 mt-1">
          Provide additional context or requirements for the AI to consider
        </p>
      </div>
    </div>
  );
};
