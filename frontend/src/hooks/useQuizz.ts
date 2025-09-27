// frontend/src/hooks/useQuiz.ts
import { useState, useCallback, useReducer, useEffect } from 'react';
import { QuizQuestion, QuizSession, QuizSettings, StudyItem, apiService } from '../services/api';
import { saveToLocalStorage, loadFromLocalStorage } from '../utils/helpers';

interface QuizState {
  currentSession: QuizSession | null;
  isGenerating: boolean;
  isLoading: boolean;
  error: string | null;
  availableQuestions: QuizQuestion[];
}

type QuizAction =
  | { type: 'GENERATION_START' }
  | { type: 'GENERATION_SUCCESS'; payload: QuizQuestion[] }
  | { type: 'GENERATION_ERROR'; payload: string }
  | { type: 'SESSION_START'; payload: QuizSession }
  | { type: 'SESSION_UPDATE'; payload: Partial<QuizSession> }
  | { type: 'SESSION_END'; payload: { score: number; endTime: Date } }
  | { type: 'ANSWER_QUESTION'; payload: { questionIndex: number; answer: number } }
  | { type: 'NEXT_QUESTION' }
  | { type: 'PREVIOUS_QUESTION' }
  | { type: 'LOADING_START' }
  | { type: 'LOADING_END' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET' };

const initialState: QuizState = {
  currentSession: null,
  isGenerating: false,
  isLoading: false,
  error: null,
  availableQuestions: []
};

const defaultQuizSettings: QuizSettings = {
  questionCount: 10,
  difficulty: 'mixed',
  questionTypes: ['multiple-choice'],
  randomizeQuestions: true,
  randomizeOptions: true,
  showExplanations: true
};

function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'GENERATION_START':
      return { ...state, isGenerating: true, error: null };
    
    case 'GENERATION_SUCCESS':
      return { 
        ...state, 
        isGenerating: false, 
        availableQuestions: action.payload,
        error: null 
      };
    
    case 'GENERATION_ERROR':
      return { ...state, isGenerating: false, error: action.payload };
    
    case 'SESSION_START':
      return { ...state, currentSession: action.payload };
    
    case 'SESSION_UPDATE':
      return { 
        ...state, 
        currentSession: state.currentSession ? 
          { ...state.currentSession, ...action.payload } : 
          null 
      };
    
    case 'SESSION_END':
      return {
        ...state,
        currentSession: state.currentSession ? {
          ...state.currentSession,
          score: action.payload.score,
          endTime: action.payload.endTime
        } : null
      };
    
    case 'ANSWER_QUESTION':
      if (!state.currentSession) return state;
      const newAnswers = [...state.currentSession.answers];
      newAnswers[action.payload.questionIndex] = action.payload.answer;
      return {
        ...state,
        currentSession: {
          ...state.currentSession,
          answers: newAnswers
        }
      };
    
    case 'NEXT_QUESTION':
      if (!state.currentSession) return state;
      const nextIndex = Math.min(
        state.currentSession.currentQuestionIndex + 1,
        state.currentSession.questions.length - 1
      );
      return {
        ...state,
        currentSession: {
          ...state.currentSession,
          currentQuestionIndex: nextIndex
        }
      };
    
    case 'PREVIOUS_QUESTION':
      if (!state.currentSession) return state;
      const prevIndex = Math.max(state.currentSession.currentQuestionIndex - 1, 0);
      return {
        ...state,
        currentSession: {
          ...state.currentSession,
          currentQuestionIndex: prevIndex
        }
      };
    
    case 'LOADING_START':
      return { ...state, isLoading: true, error: null };
    
    case 'LOADING_END':
      return { ...state, isLoading: false };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    case 'RESET':
      return initialState;
    
    default:
      return state;
  }
}

export const useQuiz = () => {
  const [state, dispatch] = useReducer(quizReducer, initialState);
  const [quizSettings, setQuizSettings] = useState<QuizSettings>(
    loadFromLocalStorage('quiz-settings', defaultQuizSettings)
  );

  // Save settings to localStorage when they change
  useEffect(() => {
    saveToLocalStorage('quiz-settings', quizSettings);
  }, [quizSettings]);

  // Generate quiz from study items using Python backend
  const generateQuizFromStudyItems = useCallback(async (studyItems: StudyItem[], settings?: Partial<QuizSettings>) => {
    const finalSettings = { ...quizSettings, ...settings };
    
    dispatch({ type: 'GENERATION_START' });
    
    try {
      // Convert study items content to transcript format for your Python backend
      const transcript = studyItems.map(item => `${item.question} ${item.answer}`);
      
      // Call your Python backend quiz endpoint
      const backendStudyItems = await apiService.generateQuiz(transcript, finalSettings.questionCount);
      
      // Convert backend response to frontend quiz questions
      const questions = apiService.convertToQuizQuestions(backendStudyItems);
      
      dispatch({ type: 'GENERATION_SUCCESS', payload: questions });
      return questions;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Quiz generation failed';
      dispatch({ type: 'GENERATION_ERROR', payload: errorMessage });
      return [];
    }
  }, [quizSettings]);

  // Generate quiz from content using Python backend
  const generateQuizFromContent = useCallback(async (content: string, numQuestions?: number) => {
    const questionCount = numQuestions || quizSettings.questionCount;
    
    dispatch({ type: 'GENERATION_START' });
    
    try {
      // Split content into sentences/paragraphs for transcript format
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
      const transcript = sentences.slice(0, questionCount * 2); // Provide more content for better questions
      
      // Call your Python backend quiz endpoint
      const backendStudyItems = await apiService.generateQuiz(transcript, questionCount);
      
      // Convert backend response to frontend quiz questions
      const questions = apiService.convertToQuizQuestions(backendStudyItems);
      
      dispatch({ type: 'GENERATION_SUCCESS', payload: questions });
      return questions;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Quiz generation failed';
      dispatch({ type: 'GENERATION_ERROR', payload: errorMessage });
      return [];
    }
  }, [quizSettings]);

  // Start a new quiz session
  const startQuizSession = useCallback((questions: QuizQuestion[], settings?: Partial<QuizSettings>) => {
    const sessionSettings = { ...quizSettings, ...settings };
    
    // Randomize questions if setting is enabled
    let finalQuestions = [...questions];
    if (sessionSettings.randomizeQuestions) {
      finalQuestions = finalQuestions.sort(() => Math.random() - 0.5);
    }
    
    // Limit number of questions
    finalQuestions = finalQuestions.slice(0, sessionSettings.questionCount);
    
    // Randomize options for each question if setting is enabled
    if (sessionSettings.randomizeOptions) {
      finalQuestions = finalQuestions.map(question => {
        if (question.type === 'multiple-choice' && question.options.length > 1) {
          const correctAnswer = question.options[question.correctAnswer];
          const shuffledOptions = [...question.options].sort(() => Math.random() - 0.5);
          const newCorrectIndex = shuffledOptions.indexOf(correctAnswer);
          
          return {
            ...question,
            options: shuffledOptions,
            correctAnswer: newCorrectIndex
          };
        }
        return question;
      });
    }

    const newSession: QuizSession = {
      id: `quiz-${Date.now()}`,
      questions: finalQuestions,
      currentQuestionIndex: 0,
      answers: new Array(finalQuestions.length).fill(null),
      score: 0,
      startTime: new Date(),
      settings: sessionSettings
    };

    dispatch({ type: 'SESSION_START', payload: newSession });
    
    // Save session to localStorage
    saveToLocalStorage('current-quiz-session', newSession);
    
    return newSession;
  }, [quizSettings]);

  // Answer a question
  const answerQuestion = useCallback((answer: number) => {
    if (!state.currentSession) return;
    
    const currentIndex = state.currentSession.currentQuestionIndex;
    dispatch({ type: 'ANSWER_QUESTION', payload: { questionIndex: currentIndex, answer } });
    
    // Update localStorage
    const updatedSession = {
      ...state.currentSession,
      answers: state.currentSession.answers.map((a, i) => i === currentIndex ? answer : a)
    };
    saveToLocalStorage('current-quiz-session', updatedSession);
  }, [state.currentSession]);

  // Navigate to next question
  const nextQuestion = useCallback(() => {
    dispatch({ type: 'NEXT_QUESTION' });
  }, []);

  // Navigate to previous question
  const previousQuestion = useCallback(() => {
    dispatch({ type: 'PREVIOUS_QUESTION' });
  }, []);

  // Calculate and finalize quiz score
  const finishQuiz = useCallback(() => {
    if (!state.currentSession) return null;

    let correctAnswers = 0;
    state.currentSession.questions.forEach((question, index) => {
      const userAnswer = state.currentSession!.answers[index];
      if (userAnswer === question.correctAnswer) {
        correctAnswers++;
      }
    });

    const score = Math.round((correctAnswers / state.currentSession.questions.length) * 100);
    const endTime = new Date();

    dispatch({ type: 'SESSION_END', payload: { score, endTime } });

    const finalSession = {
      ...state.currentSession,
      score,
      endTime
    };

    // Save completed session
    saveToLocalStorage('last-quiz-result', finalSession);
    
    // Clear current session
    localStorage.removeItem('current-quiz-session');

    return {
      score,
      correctAnswers,
      totalQuestions: state.currentSession.questions.length,
      timeSpent: endTime.getTime() - state.currentSession.startTime.getTime()
    };
  }, [state.currentSession]);

  // Resume quiz session from localStorage
  const resumeSession = useCallback(() => {
    const savedSession = loadFromLocalStorage('current-quiz-session', null) as QuizSession | null;
    if (savedSession) {
      // Convert string dates back to Date objects
      const restoredSession: QuizSession = {
        ...savedSession,
        startTime: new Date(savedSession.startTime),
        endTime: savedSession.endTime ? new Date(savedSession.endTime) : undefined
      };
      dispatch({ type: 'SESSION_START', payload: restoredSession });
      return true;
    }
    return false;
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // Reset quiz state
  const resetQuiz = useCallback(() => {
    dispatch({ type: 'RESET' });
    localStorage.removeItem('current-quiz-session');
  }, []);

  // Computed values
  const currentQuestion = state.currentSession?.questions[state.currentSession.currentQuestionIndex] || null;
  const currentAnswer = state.currentSession?.answers[state.currentSession.currentQuestionIndex] || null;
  const isLastQuestion = state.currentSession ? 
    state.currentSession.currentQuestionIndex >= state.currentSession.questions.length - 1 : false;
  const isFirstQuestion = state.currentSession?.currentQuestionIndex === 0;
  const totalQuestions = state.currentSession?.questions.length || 0;
  const answeredQuestions = state.currentSession?.answers.filter(a => a !== null).length || 0;
  const progress = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

  return {
    // State
    currentSession: state.currentSession,
    currentQuestion,
    currentAnswer,
    isGenerating: state.isGenerating,
    isLoading: state.isLoading,
    error: state.error,
    availableQuestions: state.availableQuestions,
    quizSettings,
    
    // Computed values
    isLastQuestion,
    isFirstQuestion,
    totalQuestions,
    answeredQuestions,
    progress,
    currentQuestionIndex: state.currentSession?.currentQuestionIndex || 0,
    
    // Actions
    generateQuizFromStudyItems,
    generateQuizFromContent,
    startQuizSession,
    answerQuestion,
    nextQuestion,
    previousQuestion,
    finishQuiz,
    resumeSession,
    setQuizSettings,
    clearError,
    resetQuiz
  };
};
        }
      };
    
    case 'PREVIOUS_QUESTION':
      if (!state.currentSession) return state;
      const prevIndex = Math.max(state.currentSession.currentQuestionIndex - 1, 0);
      return {
        ...state,
        currentSession: {
          ...state.currentSession,
          currentQuestionIndex: prevIndex
        }
      };
    
    case 'LOADING_START':
      return { ...state, isLoading: true, error: null };
    
    case 'LOADING_END':
      return { ...state, isLoading: false };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    case 'RESET':
      return initialState;
    
    default:
      return state;
  }
}

export const useQuiz = () => {
  const [state, dispatch] = useReducer(quizReducer, initialState);
  const [quizSettings, setQuizSettings] = useState<QuizSettings>(
    loadFromLocalStorage('quiz-settings', defaultQuizSettings)
  );

  // Save settings to localStorage when they change
  useEffect(() => {
    saveToLocalStorage('quiz-settings', quizSettings);
  }, [quizSettings]);

  // Generate quiz from study items
  const generateQuizFromStudyItems = useCallback(async (studyItems: StudyItem[], settings?: Partial<QuizSettings>) => {
    const finalSettings = { ...quizSettings, ...settings };
    
    dispatch({ type: 'GENERATION_START' });
    
    try {
      const questions = await apiService.generateQuizFromStudyItems(studyItems, finalSettings);
      dispatch({ type: 'GENERATION_SUCCESS', payload: questions });
      return questions;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Quiz generation failed';
      dispatch({ type: 'GENERATION_ERROR', payload: errorMessage });
      return [];
    }
  }, [quizSettings]);

  // Generate quiz from content
  const generateQuizFromContent = useCallback(async (
    content: string, 
    generationSettings: GenerationSettings,
    quizSettingsOverride?: Partial<QuizSettings>
  ) => {
    const finalSettings = { ...generationSettings, ...quizSettings, ...quizSettingsOverride };
    
    dispatch({ type: 'GENERATION_START' });
    
    try {
      const questions = await apiService.generateQuizFromContent(content, finalSettings);
      dispatch({ type: 'GENERATION_SUCCESS', payload: questions });
      return questions;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Quiz generation failed';
      dispatch({ type: 'GENERATION_ERROR', payload: errorMessage });
      return [];
    }
  }, [quizSettings]);

  // Start a new quiz session
  const startQuizSession = useCallback((questions: QuizQuestion[], settings?: Partial<QuizSettings>) => {
    const sessionSettings = { ...quizSettings, ...settings };
    
    // Randomize questions if setting is enabled
    let finalQuestions = [...questions];
    if (sessionSettings.randomizeQuestions) {
      finalQuestions = finalQuestions.sort(() => Math.random() - 0.5);
    }
    
    // Limit number of questions
    finalQuestions = finalQuestions.slice(0, sessionSettings.questionCount);
    
    // Randomize options for each question if setting is enabled
    if (sessionSettings.randomizeOptions) {
      finalQuestions = finalQuestions.map(question => {
        if (question.type === 'multiple-choice') {
          const correctAnswer = question.options[question.correctAnswer];
          const shuffledOptions = [...question.options].sort(() => Math.random() - 0.5);
          const newCorrectIndex = shuffledOptions.indexOf(correctAnswer);
          
          return {
            ...question,
            options: shuffledOptions,
            correctAnswer: newCorrectIndex
          };
        }
        return question;
      });
    }

    const newSession: QuizSession = {
      id: `quiz-${Date.now()}`,
      questions: finalQuestions,
      currentQuestionIndex: 0,
      answers: new Array(finalQuestions.length).fill(null),
      score: 0,
      startTime: new Date(),
      settings: sessionSettings
    };

    dispatch({ type: 'SESSION_START', payload: newSession });
    
    // Save session to localStorage
    saveToLocalStorage('current-quiz-session', newSession);
    
    return newSession;
  }, [quizSettings]);

  // Answer a question
  const answerQuestion = useCallback((answer: number) => {
    if (!state.currentSession) return;
    
    const currentIndex = state.currentSession.currentQuestionIndex;
    dispatch({ type: 'ANSWER_QUESTION', payload: { questionIndex: currentIndex, answer } });
    
    // Update localStorage
    const updatedSession = {
      ...state.currentSession,
      answers: state.currentSession.answers.map((a, i) => i === currentIndex ? answer : a)
    };
    saveToLocalStorage('current-quiz-session', updatedSession);
  }, [state.currentSession]);

  // Navigate to next question
  const nextQuestion = useCallback(() => {
    dispatch({ type: 'NEXT_QUESTION' });
  }, []);

  // Navigate to previous question
  const previousQuestion = useCallback(() => {
    dispatch({ type: 'PREVIOUS_QUESTION' });
  }, []);

  // Calculate and finalize quiz score
  const finishQuiz = useCallback(() => {
    if (!state.currentSession) return null;

    let correctAnswers = 0;
    state.currentSession.questions.forEach((question, index) => {
      const userAnswer = state.currentSession!.answers[index];
      if (userAnswer === question.correctAnswer) {
        correctAnswers++;
      }
    });

    const score = Math.round((correctAnswers / state.currentSession.questions.length) * 100);
    const endTime = new Date();

    dispatch({ type: 'SESSION_END', payload: { score, endTime } });

    const finalSession = {
      ...state.currentSession,
      score,
      endTime
    };

    // Save completed session
    saveToLocalStorage('last-quiz-result', finalSession);
    
    // Clear current session
    localStorage.removeItem('current-quiz-session');

    return {
      score,
      correctAnswers,
      totalQuestions: state.currentSession.questions.length,
      timeSpent: endTime.getTime() - state.currentSession.startTime.getTime()
    };
  }, [state.currentSession]);

  // Resume quiz session from localStorage
  const resumeSession = useCallback(() => {
    const savedSession = loadFromLocalStorage('current-quiz-session', null) as QuizSession | null;
    if (savedSession) {
      // Convert string dates back to Date objects
      const restoredSession: QuizSession = {
        ...savedSession,
        startTime: new Date(savedSession.startTime),
        endTime: savedSession.endTime ? new Date(savedSession.endTime) : undefined
      };
      dispatch({ type: 'SESSION_START', payload: restoredSession });
      return true;
    }
    return false;
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // Reset quiz state
  const resetQuiz = useCallback(() => {
    dispatch({ type: 'RESET' });
    localStorage.removeItem('current-quiz-session');
  }, []);

  // Computed values
  const currentQuestion = state.currentSession?.questions[state.currentSession.currentQuestionIndex] || null;
  const currentAnswer = state.currentSession?.answers[state.currentSession.currentQuestionIndex] || null;
  const isLastQuestion = state.currentSession ? 
    state.currentSession.currentQuestionIndex >= state.currentSession.questions.length - 1 : false;
  const isFirstQuestion = state.currentSession?.currentQuestionIndex === 0;
  const totalQuestions = state.currentSession?.questions.length || 0;
  const answeredQuestions = state.currentSession?.answers.filter(a => a !== null).length || 0;
  const progress = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

  return {
    // State
    currentSession: state.currentSession,
    currentQuestion,
    currentAnswer,
    isGenerating: state.isGenerating,
    isLoading: state.isLoading,
    error: state.error,
    availableQuestions: state.availableQuestions,
    quizSettings,
    
    // Computed values
    isLastQuestion,
    isFirstQuestion,
    totalQuestions,
    answeredQuestions,
    progress,
    currentQuestionIndex: state.currentSession?.currentQuestionIndex || 0,
    
    // Actions
    generateQuizFromStudyItems,
    generateQuizFromContent,
    startQuizSession,
    answerQuestion,
    nextQuestion,
    previousQuestion,
    finishQuiz,
    resumeSession,
    setQuizSettings,
    clearError,
    resetQuiz
  };
};