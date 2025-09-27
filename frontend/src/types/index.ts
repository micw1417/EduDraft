// frontend/src/types/index.ts
export interface StudyItem {
  id: string;
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  type: 'multiple-choice' | 'short-answer' | 'true-false' | 'fill-in-blank';
}

export interface GenerationSettings {
  numQuestions: number;
  difficulty: string;
  questionTypes: string[];
  subject: string;
  customPrompt?: string;
}

export interface AppState {
  studyItems: StudyItem[];
  isGenerating: boolean;
  isUploading: boolean;
  error: string | null;
  lastGenerated: Date | null;
}

export type TabType = 'input' | 'settings' | 'results';

export type ExportFormat = 'csv' | 'quizlet' | 'kahoot' | 'anki' | 'moodle';

export interface FileUploadResult {
  success: boolean;
  content?: string;
  error?: string;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Form validation types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// UI Component Props
export interface FileUploadProps {
  onFileUpload: (file: File) => void;
  isUploading: boolean;
  disabled?: boolean;
}

export interface StudyItemCardProps {
  studyItem: StudyItem;
  index: number;
  onUpdate: (id: string, updates: Partial<StudyItem>) => void;
  onDelete: (id: string) => void;
}

export interface SettingsPanelProps {
  settings: GenerationSettings;
  onSettingsChange: (settings: GenerationSettings) => void;
}

export interface ExportButtonsProps {
  studyItems: StudyItem[];
  onExport: (format: ExportFormat) => void;
  disabled?: boolean;
}