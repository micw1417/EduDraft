// frontend/src/services/api.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Define types directly in this file to avoid circular imports
export interface StudyItem {
  id: string;
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  type: 'multiple-choice' | 'short-answer' | 'true-false' | 'fill-in-blank';
  // Enhanced for quiz functionality
  options?: { [key: string]: string }; // For multiple choice questions from your backend
}

export interface GenerationSettings {
  numQuestions: number;
  difficulty: string;
  questionTypes: string[];
  subject: string;
  customPrompt?: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Quiz-specific types that work with your Python backend
export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false';
  options: string[]; // Array format for frontend
  correctAnswer: number; // Index of correct option
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
}

export interface QuizSession {
  id: string;
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  answers: (number | null)[];
  score: number;
  startTime: Date;
  endTime?: Date;
  settings: QuizSettings;
}

export interface QuizSettings {
  questionCount: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  questionTypes: ('multiple-choice' | 'true-false')[];
  timeLimit?: number; // in seconds
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  showExplanations: boolean;
}

class APIService {
  private axiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 60000, // 60 seconds for AI generation
      headers: {
        'Content-Type': 'application/json',
      }
    });

    // Request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        console.log(`✅ API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('❌ Response Error:', error.response?.status, error.response?.data?.error || error.message);
        return Promise.reject(error);
      }
    );
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/health');
      return response.data.status === 'OK';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  async generateStudyMaterials(content: string, settings: GenerationSettings): Promise<StudyItem[]> {
    try {
      if (!content.trim()) {
        throw new Error('Content is required');
      }

      if (content.length < 50) {
        throw new Error('Content should be at least 50 characters long');
      }

      const response = await this.axiosInstance.post<APIResponse<StudyItem[]>>('/generate', {
        content,
        settings
      });
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Generation failed');
      }
      
      return response.data.data || [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error || error.message;
        throw new Error(`Generation failed: ${message}`);
      }
      throw error;
    }
  }

  async uploadFile(file: File): Promise<string> {
    try {
      // Validate file size
      const maxSize = parseInt(import.meta.env.VITE_MAX_FILE_SIZE || '10485760');
      if (file.size > maxSize) {
        throw new Error(`File size exceeds maximum limit of ${Math.round(maxSize / 1024 / 1024)}MB`);
      }

      // Validate file type
      const allowedTypes = ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Only TXT, PDF, and DOCX files are allowed.');
      }

      const formData = new FormData();
      formData.append('file', file);
      
      const response = await this.axiosInstance.post<APIResponse<{ content: string }>>('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Upload failed');
      }
      
      return response.data.data?.content || '';
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error || error.message;
        throw new Error(`Upload failed: ${message}`);
      }
      throw error;
    }
  }

  async exportStudyMaterials(studyItems: StudyItem[], format: 'csv' | 'quizlet' | 'kahoot'): Promise<Blob> {
    try {
      if (!studyItems || studyItems.length === 0) {
        throw new Error('No study materials to export');
      }

      const response = await this.axiosInstance.post(`/export/${format}`, {
        studyItems
      }, {
        responseType: 'blob'
      });
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Export failed: ${error.response?.statusText || error.message}`);
      }
      throw error;
    }
  }

  // Quiz generation using your Python backend
  async generateQuiz(transcript: string[], numQuestions: number = 10): Promise<StudyItem[]> {
    try {
      if (!transcript || transcript.length === 0) {
        throw new Error('Transcript is required for quiz generation');
      }

      const response = await this.axiosInstance.post<APIResponse<StudyItem[]>>('/quiz', {
        transcript,
        num_questions: numQuestions
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Quiz generation failed');
      }

      return response.data.data || [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error || error.message;
        throw new Error(`Quiz generation failed: ${message}`);
      }
      throw error;
    }
  }

  // Convert StudyItems to QuizQuestions for frontend use
  convertToQuizQuestions(studyItems: StudyItem[]): QuizQuestion[] {
    return studyItems
      .filter(item => item.type === 'multiple-choice')
      .map(item => {
        // Convert backend format to frontend format
        const options = item.options ? Object.values(item.options) : [];
        const correctAnswerKey = item.answer; // Assuming answer is like "Option A"
        const correctAnswerIndex = options.findIndex(opt => opt === correctAnswerKey);

        return {
          id: item.id,
          question: item.question,
          type: 'multiple-choice' as const,
          options: options,
          correctAnswer: correctAnswerIndex >= 0 ? correctAnswerIndex : 0,
          explanation: `This question covers ${item.topic} concepts at ${item.difficulty} difficulty level.`,
          difficulty: item.difficulty,
          topic: item.topic
        };
      });
  }

  // Generate flashcards using your Python backend
  async generateFlashcards(transcript: string[]): Promise<any[]> {
    try {
      if (!transcript || transcript.length === 0) {
        throw new Error('Transcript is required for flashcard generation');
      }

      const response = await this.axiosInstance.post<APIResponse<{ flashcards: any[] }>>('/flashcards', {
        transcript
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Flashcard generation failed');
      }

      return response.data.data?.flashcards || [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error || error.message;
        throw new Error(`Flashcard generation failed: ${message}`);
      }
      throw error;
    }
  }

  // Generate notes using your Python backend
  async generateNotes(transcript: string[]): Promise<any[]> {
    try {
      if (!transcript || transcript.length === 0) {
        throw new Error('Transcript is required for notes generation');
      }

      const response = await this.axiosInstance.post<APIResponse<{ notes: any[] }>>('/notes', {
        transcript
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Notes generation failed');
      }

      return response.data.data?.notes || [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error || error.message;
        throw new Error(`Notes generation failed: ${message}`);
      }
      throw error;
    }
  }
}

// Export singleton instance
export const apiService = new APIService();

// Export utility functions
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const validateContent = (content: string): string | null => {
  if (!content.trim()) {
    return 'Content is required';
  }
  if (content.length < 50) {
    return 'Content should be at least 50 characters long for better results';
  }
  if (content.length > 50000) {
    return 'Content is too long. Please limit to 50,000 characters';
  }
  return null;
};

export const validateSettings = (settings: GenerationSettings): string | null => {
  if (settings.numQuestions < 1 || settings.numQuestions > 50) {
    return 'Number of questions should be between 1 and 50';
  }
  if (settings.questionTypes.length === 0) {
    return 'At least one question type must be selected';
  }
  return null;
};
