// frontend/src/components/StudyItemCard.tsx
import React, { useState } from "react";
import { Edit2, Trash2, Save, X, Copy } from "lucide-react";
import type { StudyItem, StudyItemCardProps } from "../types";
import {
  getDifficultyColor,
  getTypeDisplayName,
  copyToClipboard,
} from "../utils/helpers";

export const StudyItemCard: React.FC<StudyItemCardProps> = ({
  studyItem,
  index,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedItem, setEditedItem] = useState(studyItem);

  const handleSave = () => {
    onUpdate(studyItem.id, editedItem);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedItem(studyItem);
    setIsEditing(false);
  };

  const handleCopy = async () => {
    const text = `Q: ${studyItem.question}\nA: ${studyItem.answer}`;
    const success = await copyToClipboard(text);
    if (success) {
      // You could show a toast notification here
      console.log("Copied to clipboard");
    }
  };

  if (isEditing) {
    return (
      <div className="border border-gray-200 rounded-lg p-6 bg-yellow-50">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question
            </label>
            <textarea
              value={editedItem.question}
              onChange={(e) =>
                setEditedItem((prev) => ({ ...prev, question: e.target.value }))
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Answer
            </label>
            <textarea
              value={editedItem.answer}
              onChange={(e) =>
                setEditedItem((prev) => ({ ...prev, answer: e.target.value }))
              }
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty
              </label>
              <select
                value={editedItem.difficulty}
                onChange={(e) =>
                  setEditedItem((prev) => ({
                    ...prev,
                    difficulty: e.target.value as StudyItem["difficulty"],
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Topic
              </label>
              <input
                type="text"
                value={editedItem.topic}
                onChange={(e) =>
                  setEditedItem((prev) => ({ ...prev, topic: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={editedItem.type}
                onChange={(e) =>
                  setEditedItem((prev) => ({
                    ...prev,
                    type: e.target.value as StudyItem["type"],
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="multiple-choice">Multiple Choice</option>
                <option value="short-answer">Short Answer</option>
                <option value="true-false">True/False</option>
                <option value="fill-in-blank">Fill in Blank</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={handleCancel}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Save className="w-4 h-4 mr-1" />
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
          Question {index + 1}
        </span>
        <div className="flex items-center space-x-2">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(
              studyItem.difficulty
            )}`}
          >
            {studyItem.difficulty}
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {studyItem.topic}
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {getTypeDisplayName(studyItem.type)}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Question:</h4>
          <p className="text-gray-700">{studyItem.question}</p>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Answer:</h4>
          <p className="text-gray-600">{studyItem.answer}</p>
        </div>
      </div>

      <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-gray-100">
        <button
          onClick={handleCopy}
          className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-700"
        >
          <Copy className="w-3 h-3 mr-1" />
          Copy
        </button>
        <button
          onClick={() => setIsEditing(true)}
          className="inline-flex items-center px-2 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          <Edit2 className="w-3 h-3 mr-1" />
          Edit
        </button>
        <button
          onClick={() => onDelete(studyItem.id)}
          className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700"
        >
          <Trash2 className="w-3 h-3 mr-1" />
          Delete
        </button>
      </div>
    </div>
  );
};
