// frontend/src/components/FileUpload.tsx
import React, { useRef } from "react";
import { Upload, File } from "lucide-react";
import type { FileUploadProps } from "../types";
import { validateFile } from "../utils/helpers";

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileUpload,
  isUploading,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.isValid) {
      alert(validation.errors.join("\n"));
      return;
    }

    onFileUpload(file);
    // Clear the input
    event.target.value = "";
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".txt,.pdf,.docx"
        className="hidden"
        disabled={disabled || isUploading}
      />

      <button
        onClick={handleClick}
        disabled={disabled || isUploading}
        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUploading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
            Uploading...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            Upload File
          </>
        )}
      </button>

      <div className="text-xs text-gray-500">
        <File className="w-3 h-3 inline mr-1" />
        Supports TXT, PDF, DOCX files up to 10MB
      </div>
    </div>
  );
};
