// frontend/src/hooks/useStudyGuide.ts
import { useState, useCallback, useReducer, useEffect } from 'react';
import type { StudyItem, GenerationSettings, AppState, ExportFormat } from '../types';
import { apiService } from '../services/api';
import { validateContent, validateSettings, downloadBlob, saveToLocalStorage, loadFromLocalStorage } from '../utils/helpers';

// Action types for reducer
type StudyGuideAction = 
  | { type: 'GENERATION_START' }
  | { type: 'GENERATION_SUCCESS'; payload: StudyItem[] }
  | { type: 'GENERATION_ERROR'; payload: string }
  | { type: 'UPLOAD_START' }
  | { type: 'UPLOAD_SUCCESS' }
  | { type: 'UPLOAD_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_STUDY_ITEM'; payload: { id: string; updates: Partial<StudyItem> } }
  | { type: 'DELETE_STUDY_ITEM'; payload: string }
  | { type: 'RESET' }
  | { type: 'SET_STUDY_ITEMS'; payload: StudyItem[] };

const initialState: AppState = {
  studyItems: [],
  isGenerating: false,
  isUploading: false,
  error: null,
  lastGenerated: null
};

// Reducer function
function studyGuideReducer(state: AppState, action: StudyGuideAction): AppState {
  switch (action.type) {
    case 'GENERATION_START':
      return { ...state, isGenerating: true, error: null };
    
    case 'GENERATION_SUCCESS':
      return { 
        ...state, 
        isGenerating: false, 
        studyItems: action.payload,
        lastGenerated: new Date(),
        error: null 
      };
    
    case 'GENERATION_ERROR':
      return { ...state, isGenerating: false, error: action.payload };
    
    case 'UPLOAD_START':
      return { ...state, isUploading: true, error: null };
    
    case 'UPLOAD_SUCCESS':
      return { ...state, isUploading: false, error: null };
    
    case 'UPLOAD_ERROR':
      return { ...state, isUploading: false, error: action.payload };
    
    case 'UPDATE_STUDY_ITEM':
      return {
        ...state,
        studyItems: state.studyItems.map(item =>
          item.id === action.payload.id 
            ? { ...item, ...action.payload.updates }
            : item
        )
      };
    
    case 'DELETE_STUDY_ITEM':
      return {
        ...state,
        studyItems: state.studyItems.filter(item => item.id !== action.payload)
      };
    
    case 'SET_STUDY_ITEMS':
      return { ...state, studyItems: action.payload };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    case 'RESET':
      return initialState;
    
    default:
      return state;
  }
}

// Default settings
const defaultSettings: GenerationSettings = {
  numQuestions: 10,
  difficulty: 'medium',
  questionTypes: ['multiple-choice', 'short-answer'],
  subject: 'General'
};

// Main hook
export const useStudyGuide = () => {
  const [state, dispatch] = useReducer(studyGuideReducer, initialState);
  const [inputContent, setInputContent] = useState('');
  const [settings, setSettings] = useState<GenerationSettings>(
    loadFromLocalStorage('studyguide-settings', defaultSettings)
  );

  // Save settings to localStorage when they change
  useEffect(() => {
    saveToLocalStorage('studyguide-settings', settings);
  }, [settings]);

  // Generate study materials
  const generateStudyMaterials = useCallback(async () => {
    // Validate content
    const contentValidation = validateContent(inputContent);
    if (!contentValidation.isValid) {
      dispatch({ type: 'GENERATION_ERROR', payload: contentValidation.errors[0] });
      return false;
    }

    // Validate settings
    const settingsValidation = validateSettings(settings);
    if (!settingsValidation.isValid) {
      dispatch({ type: 'GENERATION_ERROR', payload: settingsValidation.errors[0] });
      return false;
    }

    dispatch({ type: 'GENERATION_START' });
    
    try {
      const studyItems = await apiService.generateStudyMaterials(inputContent, settings);
      dispatch({ type: 'GENERATION_SUCCESS', payload: studyItems });
      
      // Save to localStorage for persistence
      saveToLocalStorage('studyguide-last-session', {
        studyItems,
        content: inputContent,
        settings,
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      dispatch({ type: 'GENERATION_ERROR', payload: errorMessage });
      return false;
    }
  }, [inputContent, settings]);

  // Upload file
  const uploadFile = useCallback(async (file: File) => {
    dispatch({ type: 'UPLOAD_START' });
    
    try {
      const content = await apiService.uploadFile(file);
      setInputContent(content);
      dispatch({ type: 'UPLOAD_SUCCESS' });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      dispatch({ type: 'UPLOAD_ERROR', payload: errorMessage });
      return false;
    }
  }, []);

  // Export study materials
  const exportStudyMaterials = useCallback(async (format: ExportFormat) => {
    if (state.studyItems.length === 0) {
      dispatch({ type: 'GENERATION_ERROR', payload: 'No study materials to export' });
      return false;
    }

    try {
      // Handle formats that can be done client-side
      if (format === 'anki') {
        const ankiContent = state.studyItems
          .map(item => `${item.question}\t${item.answer}\t${item.topic} ${item.difficulty} ${item.type}`)
          .join('\n');
        
        const blob = new Blob([ankiContent], { type: 'text/plain' });
        downloadBlob(blob, `anki-import-${Date.now()}.txt`);
        return true;
      }

      // For server-side formats
      const blob = await apiService.exportStudyMaterials(state.studyItems, format as 'csv' | 'quizlet' | 'kahoot');
      const fileExtension = format === 'quizlet' ? 'txt' : 'csv';
      downloadBlob(blob, `study-guide-${format}-${Date.now()}.${fileExtension}`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      dispatch({ type: 'GENERATION_ERROR', payload: errorMessage });
      return false;
    }
  }, [state.studyItems]);

  // Update study item
  const updateStudyItem = useCallback((id: string, updates: Partial<StudyItem>) => {
    dispatch({ type: 'UPDATE_STUDY_ITEM', payload: { id, updates } });
    
    // Update localStorage
    const updatedItems = state.studyItems.map(item =>
      item.id === id ? { ...item, ...updates } : item
    );
    saveToLocalStorage('studyguide-study-items', updatedItems);
  }, [state.studyItems]);

  // Delete study item
  const deleteStudyItem = useCallback((id: string) => {
    dispatch({ type: 'DELETE_STUDY_ITEM', payload: id });
    
    // Update localStorage
    const updatedItems = state.studyItems.filter(item => item.id !== id);
    saveToLocalStorage('studyguide-study-items', updatedItems);
  }, [state.studyItems]);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // Reset all data
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
    setInputContent('');
    setSettings(defaultSettings);
    localStorage.removeItem('studyguide-last-session');
    localStorage.removeItem('studyguide-study-items');
  }, []);

  // Load last session
  const loadLastSession = useCallback(() => {
    const lastSession = loadFromLocalStorage('studyguide-last-session', null) as
      | {
          studyItems?: StudyItem[];
          content?: string;
          settings?: GenerationSettings;
          timestamp?: string;
        }
      | null;
    if (lastSession) {
      setInputContent(lastSession.content || '');
      setSettings(lastSession.settings || defaultSettings);
      if (lastSession.studyItems) {
        dispatch({ type: 'SET_STUDY_ITEMS', payload: lastSession.studyItems });
      }
      return true;
    }
    return false;
  }, []);

  // Check if API is available
  const [isApiAvailable, setIsApiAvailable] = useState<boolean | null>(null);
  
  const checkApiHealth = useCallback(async () => {
    try {
      const isHealthy = await apiService.healthCheck();
      setIsApiAvailable(isHealthy);
      return isHealthy;
    } catch {
      setIsApiAvailable(false);
      return false;
    }
  }, []);

  // Check API health on mount
  useEffect(() => {
    checkApiHealth();
  }, [checkApiHealth]);

  // Validate current content and settings
  const contentValidation = validateContent(inputContent);
  const settingsValidation = validateSettings(settings);
  const canGenerate = contentValidation.isValid && settingsValidation.isValid && !state.isGenerating;

  return {
    // State
    studyItems: state.studyItems,
    isGenerating: state.isGenerating,
    isUploading: state.isUploading,
    error: state.error,
    lastGenerated: state.lastGenerated,
    inputContent,
    settings,
    isApiAvailable,
    
    // Validation
    contentValidation,
    settingsValidation,
    canGenerate,
    
    // Actions
    generateStudyMaterials,
    uploadFile,
    exportStudyMaterials,
    updateStudyItem,
    deleteStudyItem,
    setInputContent,
    setSettings,
    clearError,
    reset,
    loadLastSession,
    checkApiHealth
  };
};