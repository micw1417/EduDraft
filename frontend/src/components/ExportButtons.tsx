// frontend/src/components/ExportButtons.tsx
import React from "react";
import { Download, FileText, Users, BookOpen } from "lucide-react";
import type { ExportButtonsProps, ExportFormat } from "../types";

export const ExportButtons: React.FC<ExportButtonsProps> = ({
  studyItems,
  onExport,
  disabled = false,
}) => {
  const exportOptions = [
    {
      format: "csv" as ExportFormat,
      label: "CSV Format",
      description: "Standard spreadsheet format",
      icon: FileText,
      color: "bg-green-600 hover:bg-green-700",
    },
    {
      format: "quizlet" as ExportFormat,
      label: "Quizlet",
      description: "Import directly to Quizlet",
      icon: Users,
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      format: "kahoot" as ExportFormat,
      label: "Kahoot",
      description: "For interactive quizzes",
      icon: Users,
      color: "bg-purple-600 hover:bg-purple-700",
    },
    {
      format: "anki" as ExportFormat,
      label: "Anki",
      description: "Spaced repetition flashcards",
      icon: BookOpen,
      color: "bg-orange-600 hover:bg-orange-700",
    },
  ];

  const handleExport = (format: ExportFormat) => {
    if (!disabled && studyItems.length > 0) {
      onExport(format);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <Download className="w-5 h-5 mr-2 text-indigo-600" />
        Export Options
      </h2>

      {studyItems.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Generate study materials first to enable export options</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exportOptions.map((option) => (
            <button
              key={option.format}
              onClick={() => handleExport(option.format)}
              disabled={disabled}
              className={`flex items-center p-4 rounded-lg text-white transition-colors duration-200 ${
                disabled ? "bg-gray-400 cursor-not-allowed" : option.color
              }`}
            >
              <option.icon className="w-6 h-6 mr-3" />
              <div className="text-left">
                <div className="font-semibold">{option.label}</div>
                <div className="text-sm opacity-90">{option.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {studyItems.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>{studyItems.length}</strong> study items ready for export
          </p>
        </div>
      )}
    </div>
  );
};
