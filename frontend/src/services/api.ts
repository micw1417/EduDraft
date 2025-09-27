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

// Quiz-specific types
export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false';
  options: string[];
  correctAnswer: number;
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
  timeLimit?: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  showExplanations: boolean;
}

class APIService {
  private axiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    // Request interceptor
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

    // Response interceptor
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
      if (!content.trim()) throw new Error('Content is required');
      if (content.length < 50) throw new Error('Content should be at least 50 characters long');

      const response = await this.axiosInstance.post<APIResponse<StudyItem[]>>('/generate', {
        content,
        settings
      });
      
      if (!response.data.success) throw new Error(response.data.error || 'Generation failed');
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
      const maxSize = parseInt(import.meta.env.VITE_MAX_FILE_SIZE || '10485760');
      if (file.size > maxSize) throw new Error(`File size exceeds maximum limit of ${Math.round(maxSize / 1024 / 1024)}MB`);

      const allowedTypes = ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) throw new Error('Invalid file type. Only TXT, PDF, and DOCX files are allowed.');

      const formData = new FormData();
      formData.append('file', file);
      
      const response = await this.axiosInstance.post<APIResponse<{ content: string }>>('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (!response.data.success) throw new Error(response.data.error || 'Upload failed');
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
      if (!studyItems || studyItems.length === 0) throw new Error('No study materials to export');

      const response = await this.axiosInstance.post(`/export/${format}`, { studyItems }, { responseType: 'blob' });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) throw new Error(`Export failed: ${error.response?.statusText || error.message}`);
      throw error;
    }
  }

  // Quiz generation
  async generateQuiz(transcript: string[], numQuestions: number = 10): Promise<StudyItem[]> {
    try {
      if (!transcript || transcript.length === 0) throw new Error('Transcript is required for quiz generation');

      const response = await this.axiosInstance.post<APIResponse<StudyItem[]>>('/quiz', {
        transcript,
        num_questions: numQuestions
      });

      if (!response.data.success) throw new Error(response.data.error || 'Quiz generation failed');
      return response.data.data || [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error || error.message;
        throw new Error(`Quiz generation failed: ${message}`);
      }
      throw error;
    }
  }

  convertToQuizQuestions(studyItems: StudyItem[]): QuizQuestion[] {
    return studyItems
      .filter(item => item.type === 'multiple-choice')
      .map(item => {
        const options = item.options ? Object.values(item.options) : [];
        const correctAnswerIndex = options.findIndex(opt => opt === item.answer);
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

  async generateFlashcards(transcript: string[]): Promise<any[]> {
    try {
      if (!transcript || transcript.length === 0) throw new Error('Transcript is required for flashcard generation');

      const response = await this.axiosInstance.post<APIResponse<{ flashcards: any[] }>>('/flashcards', { transcript });
      if (!response.data.success) throw new Error(response.data.error || 'Flashcard generation failed');

      return response.data.data?.flashcards || [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error || error.message;
        throw new Error(`Flashcard generation failed: ${message}`);
      }
      throw error;
    }
  }

  async generateNotes(transcript: string[]): Promise<any[]> {
    try {
      if (!transcript || transcript.length === 0) throw new Error('Transcript is required for notes generation');

      const response = await this.axiosInstance.post<APIResponse<{ notes: any[] }>>('/notes', { transcript });
      if (!response.data.success) throw new Error(response.data.error || 'Notes generation failed');

      return response.data.data?.notes || [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error || error.message;
        throw new Error(`Notes generation failed: ${message}`);
      }
      throw error;
    }
  }

  // 📝 Generate essay (summary + prompt + grading)
  async generateEssay(topic: string, studentAnswer: string): Promise<{
    summary: string;
    essay_prompt: string;
    grading: string;
  }> {
    try {
      if (!topic.trim()) throw new Error('Topic is required');
      if (!studentAnswer.trim()) throw new Error('Student answer is required');

      const response = await this.axiosInstance.post<APIResponse<{
        summary: string;
        essay_prompt: string;
        grading: string;
      }>>('/essay', {
        topic,
        student_answer: studentAnswer
      });

      if (!response.data.success) throw new Error(response.data.error || 'Essay generation failed');
      return response.data.data!;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error || error.message;
        throw new Error(`Essay generation failed: ${message}`);
      }
      throw error;
    }
  }
}

// Export singleton
export const apiService = new APIService();

// Utility functions
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
  if (!content.trim()) return 'Content is required';
  if (content.length < 50) return 'Content should be at least 50 characters long for better results';
  if (content.length > 50000) return 'Content is too long. Please limit to 50,000 characters';
 
