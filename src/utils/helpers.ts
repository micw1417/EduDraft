// frontend/src/utils/helpers.ts
import type { GenerationSettings, StudyItem } from '../services/api';

// Form validation types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
export const validateContent = (content: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!content.trim()) {
    errors.push('Content is required');
  } else if (content.length < 50) {
    errors.push('Content should be at least 50 characters long for better results');
  } else if (content.length > 50000) {
    errors.push('Content is too long. Please limit to 50,000 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Settings validation
export const validateSettings = (settings: GenerationSettings): ValidationResult => {
  const errors: string[] = [];
  
  if (settings.numQuestions < 1 || settings.numQuestions > 50) {
    errors.push('Number of questions should be between 1 and 50');
  }
  
  if (settings.questionTypes.length === 0) {
    errors.push('At least one question type must be selected');
  }
  
  if (!settings.subject.trim()) {
    errors.push('Subject is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// File validation
export const validateFile = (file: File): ValidationResult => {
  const errors: string[] = [];
  const maxSize = parseInt(import.meta.env.VITE_MAX_FILE_SIZE || '10485760'); // 10MB
  const allowedTypes = ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  
  if (file.size > maxSize) {
    errors.push(`File size exceeds maximum limit of ${Math.round(maxSize / 1024 / 1024)}MB`);
  }
  
  if (!allowedTypes.includes(file.type)) {
    errors.push('Invalid file type. Only TXT, PDF, and DOCX files are allowed.');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Download helper
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Format helpers
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

// Study item helpers
export const getDifficultyColor = (difficulty: string): string => {
  switch (difficulty) {
    case 'easy':
      return 'bg-green-100 text-green-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'hard':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getTypeDisplayName = (type: string): string => {
  const typeMap: Record<string, string> = {
    'multiple-choice': 'Multiple Choice',
    'short-answer': 'Short Answer',
    'true-false': 'True/False',
    'fill-in-blank': 'Fill in Blank'
  };
  return typeMap[type] || type;
};

// Statistics helpers
export const getStudyItemStats = (studyItems: StudyItem[]) => {
  const total = studyItems.length;
  const difficulties = studyItems.reduce((acc, item) => {
    acc[item.difficulty] = (acc[item.difficulty] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const types = studyItems.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topics = studyItems.reduce((acc, item) => {
    acc[item.topic] = (acc[item.topic] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    total,
    difficulties,
    types,
    topics
  };
};

// Local storage helpers
export const saveToLocalStorage = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

export const loadFromLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return defaultValue;
  }
};

// Debounce helper for search/input
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Error handling helpers
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
};

// Copy to clipboard helper
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    // Fallback method
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (fallbackError) {
      document.body.removeChild(textArea);
      return false;
    }
  }
};