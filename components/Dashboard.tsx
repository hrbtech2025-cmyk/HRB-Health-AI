
import React, { useMemo } from 'react';
import { LogEntry, AIPrediction, AIIdentity, UserProfile } from '../types';
import ReactMarkdown from 'react-markdown';
import { hasApiKey } from '../services/geminiService';

interface DashboardProps {
  logs: LogEntry[];
  prediction: AIPrediction | null;
  identity: AIIdentity | null;
  userProfile: UserProfile;
  onOpenTraining: () => void;
  onOpenMealScanner: () => void;
  onOpenExperiment: (type?: string) => void;
  onOpenCycleTracker?: () => void;
  onSaveLog: (log: any) => void;
  onOpenApiKeyModal?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ logs, prediction, identity, userProfile, onOpenTraining, onOpenMealScanner, onOpenExperiment, onOpenCycleTracker, onSaveLog, onOpenApiKeyModal }) => {
  const isKeyActive = hasApiKey();
  const displayScore = prediction?.vitalityScore ?? 0;
  const isScoreLoading = logs.length > 0 && prediction?.vitalityScore === undefined;
  
  // Calculate Task Completion
  const today = new Date().toLocaleDateString();
  const todaysLogs = logs.filter(l => new Date(l.timestamp).toLocaleDateString() === today);
  
  const baseTasks = [
    { 
        id: 'mood', 
        label: 'Daily Check-in', 
        xp: 10, 
        completed: todaysLogs.some(l => l.mood !== undefined && !l.nutrition && l.type !== 'workout' && l.type !== 'experiment' && l.type !== 'physique' && l.type !== 'form_check'), 
        icon: '📝', 
        color: 'bg-orange-100 text-orange-500 dark:bg-slate-700 dark:text-orange-400',
        action: undefined
    },
    { 
        id: 'nutrition', 
        label: 'Log Nutrition', 
        xp: 15, 
        completed: todaysLogs.some(l => !!l.nutrition), 
        icon: '🥗', 
        color: 'bg-emerald-100 text-emerald-500 dark:bg-slate-700 dark:text-emerald-400',
        action: onOpenMealScanner
    }
  ];

  // Dynamically generate tasks from Custom Goals if they exist, otherwise fallback to defaults
  const customGoalTasks = (userProfile.customGoals || []).map(goal => {
      let completed = false;
      let action = undefined;
      let icon = '🎯';
      let color = 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';

      if (goal.type === 'hydration') {
          const currentAmount = todaysLogs.reduce((acc, log) => acc + (log.hydrationCups || 0), 0);
          completed = currentAmount >= goal.target;
          action = undefined; // No direct action, handled via check-in
          icon = '💧';
          color = 'bg-blue-100 text-blue-500 dark:bg-slate-700 dark:text-blue-400';
      } else if (goal.type === 'sleep') {
          completed = todaysLogs.some(l => l.sleepHours >= goal.target);
          action = undefined;
          icon = '😴';
          color = 'bg-indigo-100 text-indigo-500 dark:bg-slate-700 dark:text-indigo-400';
      } else if (goal.type === 'workout') {
          // Check if at least 1 workout exists today
          completed = todaysLogs.some(l => l.type === 'workout' || l.type === 'form_check' || l.type === 'physique');
          action = onOpenTraining;
          icon = '💪';
          color = 'bg-red-100 text-red-500 dark:bg-slate-700 dark:text-red-400';
      } else if (goal.type === 'mindfulness') {
          completed = todaysLogs.some(l => l.type === 'experiment' && l.experimentData?.type === 'breathing');
          action = () => onOpenExperiment('breathing');
          icon = '🧘';
          color = 'bg-purple-100 text-purple-500 dark:bg-slate-700 dark:text-purple-400';
      }

      return {
          id: goal.id,
          label: goal.label,
          xp: 25,
          completed,
          icon,
          color,
          action
      };
  });

  // Default tasks if no custom goals set
  const defaultTasks = [
    { 
        id: 'workout_def', 
        label: 'Log Workout', 
        xp: 20, 
        completed: todaysLogs.some(l => l.type === 'workout' || l.type === 'form_check' || l.type === 'physique'), 
        icon: '💪', 
        color: 'bg-red-100 text-red-500 dark:bg-slate-700 dark:text-red-400',
        action: onOpenTraining
    },
    { 
        id: 'hydration_def', 
        label: 'Track hydration', 
        xp: 10, 
        completed: todaysLogs.some(l => l.hydrationCups > 0), 
        icon: '💧', 
        color: 'bg-blue-100 text-blue-500 dark:bg-slate-700 dark:text-blue-400',
        action: undefined
    },
    { 
        id: 'biohack_def', 
        label: 'Bio-Hack Experiment', 
        xp: 20, 
        completed: todaysLogs.some(l => l.type === 'experiment'), 
        icon: '🧬', 
        color: 'bg-purple-100 text-purple-500 dark:bg-slate-700 dark:text-purple-400',
        action: () => onOpenExperiment('habit')
    }
  ];

  // If user has custom goals, prioritize them. Always keep base tasks (Mood/Food)
  const tasks = [
      ...baseTasks,
      ...(customGoalTasks.length > 0 ? customGoalTasks : defaultTasks)
  ];

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = (completedCount / tasks.length) * 100;

  return (
    <div className="space-y-6 animate-slide-up pb-24 font-sans bg-slate-50 dark:bg-[#0B0F19] min-h-screen text-slate-900 dark:text-white transition-colors duration-500">
      
      {/* Header */}
      <header className="px-6 pt-12 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-light tracking-tight leading-tight text-slate-900 dark:text-white">
            Good Morning,<br/>
            <span className="font-bold">{userProfile.name}</span>
          </h1>
        </div>
        
        {/* Vitality Ring */}
        <div id="tour-vitality-score" className="relative w-20 h-20 flex items-center justify-center">
           <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
             <defs>
               <linearGradient id="gradScore" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#F43F5E" /><stop offset="100%" stopColor="#FB7185" /></linearGradient>
             </defs>
             <circle cx="50" cy="50" r="40" fill="none" className="stroke-slate-200 dark:stroke-slate-800 transition-colors duration-500" strokeWidth="6" />
             <circle cx="50" cy="50" r="40" fill="none" stroke="url(#gradScore)" strokeWidth="6" strokeLinecap="round" strokeDasharray="251" strokeDashoffset={251 - (251 * displayScore) / 100} className="transition-all duration-1000" />
           </svg>
           <div className="absolute flex flex-col items-center">
             <span className="text-xl font-bold text-slate-900 dark:text-white">{isScoreLoading ? '-' : displayScore}</span>
             <span className="text-[8px] font-bold uppercase text-slate-400 dark:text-slate-500">Vitality</span>
           </div>
        </div>
      </header>

      {/* Missing API Key Alert Banner */}
      {!isKeyActive && (
        <div className="px-6">
          <div className="rounded-[24px] bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-pink-500/15 border border-indigo-500/25 dark:border-indigo-400/30 p-4 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-lg shadow-md shrink-0">
                🔑
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Gemini API Key Required
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Enter your Google Gemini API key to activate AI health predictions and coaching.
                </p>
              </div>
            </div>
            {onOpenApiKeyModal && (
              <button
                id="dashboard-setup-api-key-btn"
                onClick={onOpenApiKeyModal}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-sm shrink-0 transition-all"
              >
                Enter Key
              </button>
            )}
          </div>
        </div>
      )}

      {/* Forecast Card */}
      <div className="px-6">
        <div className="relative overflow-hidden rounded-[32px] bg-white dark:bg-gradient-to-br dark:from-[#111827] dark:to-[#1F2937] p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-white/5 transition-colors duration-500">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-300">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                {prediction?.riskLevel && (
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${prediction.riskLevel === 'Low' ? 'bg-emerald-100 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'}`}>
                        {prediction.riskLevel} Risk
                    </span>
                )}
            </div>
            
            <div className="mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-400">Hyprova AI &bull; Daily Forecast</span>
            </div>
            
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 leading-tight">
                {prediction?.title || "Analyzing Patterns..."}
            </h2>
            
            <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
               <ReactMarkdown>{prediction?.description || "We're gathering more data to build your personalized health model. Keep logging consistently."}</ReactMarkdown>
            </div>

            {!isKeyActive && onOpenApiKeyModal && (
              <div className="mt-3">
                <button
                  id="forecast-enter-key-btn"
                  onClick={onOpenApiKeyModal}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
                >
                  Configure Gemini Key →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Grid */}
      <div className="px-6 grid grid-cols-2 gap-4">
        <button id="tour-experiment-widget" onClick={() => onOpenExperiment('habit')} className="aspect-square bg-indigo-600 dark:bg-[#7C5CFC] rounded-[32px] p-6 flex flex-col justify-between text-left active:scale-95 transition-all shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/30 relative overflow-hidden group">
           <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-xl backdrop-blur-sm text-white">🧬</div>
           <div className="relative z-10">
              <h3 className="font-bold text-white text-lg leading-tight">Bio<br/>Hack</h3>
              <p className="text-[10px] text-indigo-100/80 uppercase font-bold mt-1">Daily Experiment</p>
           </div>
           <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-110 transition-transform duration-500"></div>
        </button>

        <button id="tour-meal-widget" onClick={onOpenMealScanner} className="aspect-square bg-emerald-500 dark:bg-[#10B981] rounded-[32px] p-6 flex flex-col justify-between text-left active:scale-95 transition-all shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 relative overflow-hidden group">
           <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-xl backdrop-blur-sm text-white">🥗</div>
           <div className="relative z-10">
              <h3 className="font-bold text-white text-lg leading-tight">Scan<br/>Meal</h3>
              <p className="text-[10px] text-emerald-100/80 uppercase font-bold mt-1">AI Nutrition Lens</p>
           </div>
           <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-110 transition-transform duration-500"></div>
        </button>
      </div>

      {/* Today's Focus */}
      <div className="px-6 space-y-4">
         <div className="flex justify-between items-end">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Today's Focus</h3>
            <span className="text-xs font-bold text-indigo-600 dark:text-[#7C5CFC]">{Math.round(progress)}% Complete</span>
         </div>
         
         <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
             <div className="h-full bg-indigo-600 dark:bg-[#7C5CFC] transition-all duration-500 rounded-full" style={{ width: `${progress}%` }}></div>
         </div>

         <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
             <span>Daily XP: {completedCount * 10}</span>
             <span>{completedCount}/{tasks.length} Tasks</span>
         </div>

         <div className="space-y-3">
            {tasks.map(task => (
               <button 
                 key={task.id} 
                 className={`w-full flex items-center justify-between p-4 rounded-[24px] border transition-all active:scale-[0.98] ${task.completed ? 'bg-slate-50 dark:bg-slate-800/50 border-transparent opacity-60' : 'bg-white dark:bg-[#161E2E] border-slate-100 dark:border-[#1F2937] hover:border-slate-300 dark:hover:border-slate-600 shadow-sm'}`}
                 onClick={task.action}
                 disabled={!task.action}
                 style={{ cursor: task.action ? 'pointer' : 'default' }}
               >
                  <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${task.color}`}>
                          {task.icon}
                      </div>
                      <div className="text-left">
                          <p className={`text-sm font-bold ${task.completed ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-white'}`}>{task.label}</p>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5">+ {task.xp} XP</p>
                      </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${task.completed ? 'border-indigo-500 bg-indigo-500 dark:border-[#7C5CFC] dark:bg-[#7C5CFC]' : 'border-slate-200 dark:border-slate-600'}`}>
                      {task.completed && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
               </button>
            ))}
         </div>
      </div>
    </div>
  );
};

export default Dashboard;
