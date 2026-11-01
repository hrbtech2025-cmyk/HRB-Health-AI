
export enum Mood {
  Terrible = 1,
  Bad = 2,
  Neutral = 3,
  Good = 4,
  Excellent = 5,
}

export interface LogEntry {
  id: string;
  timestamp: number;
  mood: Mood;
  energyLevel: number; // 1-10
  stressLevel: number; // 1-10
  sleepHours: number;
  hydrationCups: number;
  symptoms: string[];
  medicationsTaken: string[]; // Added for Bearable replication
  tags: string[]; // e.g., "Work", "Gym", "Date Night"
  notes?: string;
  nutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fats?: number;
    fiber?: number;
    sugar?: number;
    mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
    description?: string;
  };
  menstruation?: {
    flow: 'Spotting' | 'Light' | 'Medium' | 'Heavy';
  };
  // Polymorphic fields for training integration
  type?: 'log' | 'workout' | 'physique' | 'form_check' | 'experiment';
  title?: string;
  details?: string;
  image?: string; // Base64 for gallery
  video?: string; // Base64 for video logs
  metrics?: {
    muscleGroup?: string; // e.g. "Chest", "Back"
    intensity?: number; // 1-10
    formScore?: number; // 1-10 for form checks
    definitionScore?: number; // 1-10 for physique
  };
  experimentData?: {
    type: 'breathing' | 'movement' | 'habit';
    verified: boolean;
    aiFeedback?: string;
  };
}

export interface TrainingLog extends LogEntry {
  type: 'workout' | 'physique' | 'form_check';
  metrics?: {
    muscleGroup?: string; // e.g. "Chest", "Back"
    intensity?: number; // 1-10
    formScore?: number; // 1-10 for form checks
  };
}

export interface CustomGoal {
  id: string;
  type: 'hydration' | 'sleep' | 'workout' | 'nutrition' | 'mindfulness';
  label: string;
  target: number;
  unit: string;
  isActive: boolean;
}

export interface UserProfile {
  name: string;
  age?: number;
  gender?: string;
  goals: string[]; // "Lose Weight", "Reduce Stress"
  conditions: string[]; // e.g. "IBS", "Migraines"
  medications: string[]; // List of available meds to toggle
  onboardingComplete: boolean;
  fitnessLevel?: 'Sedentary' | 'Lightly Active' | 'Moderately Active' | 'Very Active' | 'Athlete';
  dietaryPreferences?: string[]; // e.g., "Vegan", "Keto"
  customGoals?: CustomGoal[];
}

export interface AIPrediction {
  riskLevel: 'Low' | 'Moderate' | 'High';
  vitalityScore: number; // AI-determined holistic score (0-100) replacing Thrive Score
  title: string;
  description: string;
  triggers: string[];
}

export interface AIIdentity {
  title: string; // e.g., "Disciplined Sleeper"
  description: string;
  progress: number; // 0-100
}

export interface MedicalBrief {
  summary: string;
  symptomTrends: string;
  potentialTriggers: string;
  questionsForDoctor: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  groundingChunks?: {
    web?: { uri?: string; title?: string };
  }[];
  attachment?: {
    type: 'image' | 'video' | 'document';
    url: string; // Base64 or Object URL
  };
  isHidden?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastModified: number;
}

export interface HealthExperiment {
  id: string;
  title: string;
  type: 'breathing' | 'movement' | 'habit';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  durationSeconds: number;
  description: string;
  instructions: string[];
  rationale: string; // Why AI chose this
  verificationPrompt?: string; // Prompt for AI vision to verify
}
