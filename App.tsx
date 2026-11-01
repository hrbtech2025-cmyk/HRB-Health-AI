
import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import Dashboard from './components/Dashboard';
import LogInput from './components/LogInput';
import TrainingHub from './components/TrainingHub';
import MealScanner from './components/MealScanner';
import MedicalReport from './components/MedicalReport';
import ExperimentHub from './components/ExperimentHub';
import CycleTracker from './components/CycleTracker';
import Onboarding from './components/Onboarding';
import AIChat from './components/AIChat';
import Tour from './components/Tour';
import SettingsPage from './components/SettingsPage';
import ApiKeyModal from './components/ApiKeyModal';
import { LogEntry, AIPrediction, AIIdentity, UserProfile, Mood } from './types';
import { generateHealthPrediction, generateReflectionAndIdentity, hasApiKey } from './services/geminiService';
import { startNotificationScheduler } from './services/notificationService';

const App: React.FC = () => {
  // --- State ---
  const [view, setView] = useState<'dashboard' | 'chat' | 'profile'>('dashboard');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [activeToast, setActiveToast] = useState<{ title: string; body: string; icon?: string } | null>(null);
  
  // Settings State - Dark Mode is default ON, privacyMode removed
  const [settings, setSettings] = useState({
    darkMode: true, 
    notifications: true,
    units: 'Metric'
  });
  
  // Modal States
  const [isLogging, setIsLogging] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [isScanningMeal, setIsScanningMeal] = useState(false);
  const [isExperimenting, setIsExperimenting] = useState(false);
  const [isCycleTracking, setIsCycleTracking] = useState(false);
  const [selectedExperimentType, setSelectedExperimentType] = useState<string | undefined>(undefined);

  const [showMedicalReport, setShowMedicalReport] = useState(false);
  const [showTour, setShowTour] = useState(false);
  
  // Content Ref for Scrolling
  const mainContentRef = useRef<HTMLDivElement>(null);
  
  // AI State
  const [prediction, setPrediction] = useState<AIPrediction | null>(null);
  const [identity, setIdentity] = useState<AIIdentity | null>(null);

  // Sync dark mode class to html element
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  // Notifications scheduler & In-App Toast listener
  useEffect(() => {
    startNotificationScheduler();
    const handleToast = (e: any) => {
      if (e.detail) {
        setActiveToast(e.detail);
        setTimeout(() => setActiveToast(null), 5000);
      }
    };
    window.addEventListener('hyprova-toast', handleToast);
    return () => window.removeEventListener('hyprova-toast', handleToast);
  }, []);

  // --- Effects ---
  useEffect(() => {
    const savedLogs = localStorage.getItem('hyprova_logs');
    const savedProfile = localStorage.getItem('hyprova_profile');
    const savedSettings = localStorage.getItem('hyprova_settings');

    if (savedProfile) {
      setUserProfile(JSON.parse(savedProfile));
    }

    if (savedLogs) {
      const parsedLogs = JSON.parse(savedLogs);
      setLogs(parsedLogs);
      if (parsedLogs.length > 0 && savedProfile) {
        refreshInsights(parsedLogs, JSON.parse(savedProfile));
      }
    }

    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      setSettings({
        darkMode: parsedSettings.darkMode !== undefined ? parsedSettings.darkMode : true,
        notifications: parsedSettings.notifications !== undefined ? parsedSettings.notifications : true,
        units: parsedSettings.units || 'Metric'
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll Reset on View Change
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [view]);

  // Tour check effect - never trigger while ApiKeyModal is open
  useEffect(() => {
    if (userProfile && userProfile.onboardingComplete && !isApiKeyModalOpen) {
      const tourCompleted = localStorage.getItem('hyprova_tour_completed');
      if (!tourCompleted) {
        // Small delay to ensure rendering
        const timer = setTimeout(() => setShowTour(true), 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [userProfile, isApiKeyModalOpen]);

  const toggleSetting = (key: string) => {
    // @ts-ignore - dynamic key access
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    localStorage.setItem('hyprova_settings', JSON.stringify(newSettings));
  };

  const updateSetting = (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('hyprova_settings', JSON.stringify(newSettings));
  };

  const refreshInsights = async (currentLogs: LogEntry[], profile: UserProfile) => {
    try {
      const [pred, iden] = await Promise.all([
        generateHealthPrediction(currentLogs, profile),
        generateReflectionAndIdentity(currentLogs, profile)
      ]);
      
      setPrediction(pred);
      setIdentity({
        title: iden.identityTitle || "New User",
        description: iden.reflection || `Welcome to Hyprova, ${profile.name}. Start logging to get insights.`,
        progress: iden.identityProgress || 10
      });
    } catch (e) {
      console.error("AI Refresh failed", e);
    }
  };

  const handleSaveLog = (entryData: any) => {
    const newLog: LogEntry = {
      ...entryData,
      medicationsTaken: entryData.medicationsTaken || [],
      id: Date.now().toString(),
      timestamp: entryData.timestamp || Date.now()
    };
    const updatedLogs = [newLog, ...logs];
    
    // Sort logs by timestamp (newest first)
    updatedLogs.sort((a, b) => b.timestamp - a.timestamp);
    
    setLogs(updatedLogs);
    localStorage.setItem('hyprova_logs', JSON.stringify(updatedLogs));
    
    setIsLogging(false);
    setIsTraining(false);
    setIsScanningMeal(false);
    setIsExperimenting(false);
    setIsCycleTracking(false);
    
    if (userProfile) {
      refreshInsights(updatedLogs, userProfile);
    }
  };

  const handleOnboardingComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem('hyprova_profile', JSON.stringify(profile));
    if (hasApiKey()) {
      refreshInsights(logs, profile);
    }
  };

  const handleApiKeySaved = () => {
    if (userProfile) {
      refreshInsights(logs, userProfile);
    }
  };

  const handleUpdateProfile = (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
    localStorage.setItem('hyprova_profile', JSON.stringify(updatedProfile));
    refreshInsights(logs, updatedProfile);
  };

  const handleTourComplete = () => {
    localStorage.setItem('hyprova_tour_completed', 'true');
    setShowTour(false);
    setView('dashboard'); 
    setIsTraining(false);
    // Auto-open first check-in prompt for new user right after App Tour
    if (logs.length === 0) {
      setTimeout(() => {
        setIsLogging(true);
      }, 350);
    }
  };

  const handleTourChangeView = (targetView: string) => {
    if (targetView === 'training') {
      setIsTraining(true);
      setView('dashboard'); // Ensure main view allows modal
    } else {
      setIsTraining(false);
      if (['dashboard', 'chat', 'profile'].includes(targetView)) {
        setView(targetView as 'dashboard' | 'chat' | 'profile');
      }
    }
  };

  // --- Profile Actions ---
  const handleExportData = (format: 'pdf' | 'csv') => {
    if (!userProfile) return;

    if (format === 'pdf') {
        try {
            const doc = new jsPDF();
            
            // Brand & Header
            doc.setFillColor(248, 250, 252); // slate-50
            doc.rect(0, 0, 210, 40, 'F');
            
            doc.setFontSize(22);
            doc.setTextColor(15, 23, 42); // slate-900
            doc.text("Hyprova Health Report", 14, 20);
            
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139); // slate-500
            doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 28);
            doc.text(`User: ${userProfile.name} | Age: ${userProfile.age || 'N/A'} | Gender: ${userProfile.gender || 'N/A'}`, 14, 34);

            const tableBody = logs.map(log => {
                const date = new Date(log.timestamp);
                const dateStr = date.toLocaleDateString();
                const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                
                let category = log.type === 'workout' ? 'Workout' : 
                               log.type === 'physique' ? 'Physique' : 
                               log.type === 'form_check' ? 'Form Check' :
                               log.nutrition ? 'Nutrition' : 
                               log.type === 'experiment' ? 'Bio-Hack' : 'Daily Log';
                
                let vitals = `Mood: ${Mood[log.mood] || log.mood || '-'}\nEnergy: ${log.energyLevel || '-'}/10\nStress: ${log.stressLevel || '-'}/10`;
                if (log.sleepHours > 0) vitals += `\nSleep: ${log.sleepHours}h`;
                
                let details = "";
                if (log.nutrition) {
                    details += `${log.nutrition.description || log.nutrition.mealType}\n`;
                    if (log.nutrition.calories) details += `${log.nutrition.calories} kcal `;
                    if (log.nutrition.protein) details += `P:${log.nutrition.protein}g `;
                    if (log.nutrition.carbs) details += `C:${log.nutrition.carbs}g `;
                    if (log.nutrition.fats) details += `F:${log.nutrition.fats}g`;
                } else if (log.type === 'workout') {
                    details += `${log.title}\nIntensity: ${log.metrics?.intensity || '-'}/10`;
                } else if (log.type === 'form_check') {
                    details += `${log.title}\nScore: ${log.metrics?.formScore || '-'}/10`;
                } else if (log.type === 'experiment') {
                    details += `${log.title} (${log.experimentData?.type})\nVerified: ${log.experimentData?.verified ? 'Yes' : 'No'}`;
                }

                let notes = log.notes || "";
                if (log.symptoms && log.symptoms.length > 0) notes += `\nSymptoms: ${log.symptoms.join(', ')}`;
                if (log.medicationsTaken && log.medicationsTaken.length > 0) notes += `\nMeds: ${log.medicationsTaken.join(', ')}`;

                return [
                    `${dateStr}\n${timeStr}`,
                    category,
                    vitals,
                    details,
                    notes
                ];
            });

            // @ts-ignore
            autoTable(doc, {
                head: [['Date', 'Category', 'Vitals', 'Activity/Nutrition', 'Notes & Symptoms']],
                body: tableBody,
                startY: 45,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
                headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 20 },
                    2: { cellWidth: 35 },
                    3: { cellWidth: 50 },
                    4: { cellWidth: 'auto' }
                },
                alternateRowStyles: { fillColor: [248, 250, 252] }
            });

            doc.save(`Hyprova_Report_${userProfile.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (e) {
            console.error("PDF generation failed", e);
            alert("Could not generate PDF. Please try again.");
        }
    } else if (format === 'csv') {
        try {
            // Generate CSV
            const headers = [
                "Date", "Time", "Type", "Mood", "Energy (1-10)", "Stress (1-10)", "Sleep (hrs)", "Hydration (cups)", 
                "Symptoms", "Medications", "Tags", "Notes", 
                "Meal Description", "Calories", "Protein", "Carbs", "Fats",
                "Workout Title", "Intensity", "Form Score"
            ];

            const rows = logs.map(log => {
                const date = new Date(log.timestamp);
                return [
                    date.toLocaleDateString(),
                    date.toLocaleTimeString(),
                    log.type || 'log',
                    Mood[log.mood] || log.mood || '',
                    log.energyLevel || '',
                    log.stressLevel || '',
                    log.sleepHours || '',
                    log.hydrationCups || '',
                    (log.symptoms || []).join('; '),
                    (log.medicationsTaken || []).join('; '),
                    (log.tags || []).join('; '),
                    (log.notes || '').replace(/(\r\n|\n|\r)/gm, " "), // Remove newlines for CSV safety
                    log.nutrition ? (log.nutrition.description || log.nutrition.mealType) : '',
                    log.nutrition?.calories || '',
                    log.nutrition?.protein || '',
                    log.nutrition?.carbs || '',
                    log.nutrition?.fats || '',
                    log.title || '',
                    log.metrics?.intensity || '',
                    log.metrics?.formScore || ''
                ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','); // Escape quotes
            });

            const csvContent = [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `Hyprova_Data_${userProfile.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error("CSV generation failed", e);
            alert("Could not generate CSV.");
        }
    }
  };

  const handleEditProfile = () => {
    if (userProfile) {
        setUserProfile({ ...userProfile, onboardingComplete: false });
    }
  };

  const handleResetApp = () => {
    // 1. Clear Local Storage
    localStorage.clear();
    
    // 2. Reset State
    setLogs([]);
    setUserProfile(null); // Triggers Onboarding render
    setSettings({
        darkMode: true, 
        notifications: true,
        units: 'Metric'
    });
    setPrediction(null);
    setIdentity(null);
    setIsLogging(false);
    setIsTraining(false);
    setIsScanningMeal(false);
    setIsExperimenting(false);
    setIsCycleTracking(false);
    setShowMedicalReport(false);
    setShowTour(false);
    
    // 3. Reset View
    setView('dashboard');
  };

  const handleOpenExperiment = (type?: string) => {
    setSelectedExperimentType(type);
    setIsExperimenting(true);
  };

  if (!userProfile || !userProfile.onboardingComplete) {
    return <Onboarding onComplete={handleOnboardingComplete} initialProfile={userProfile} />;
  }

  return (
    <div className={`relative min-h-screen w-full font-sans overflow-hidden transition-colors duration-500 ${settings.darkMode ? 'dark bg-[#0B0F19] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Dynamic Background */}
      <div className={`fixed inset-0 pointer-events-none overflow-hidden z-0 transition-colors duration-700 ${settings.darkMode ? 'bg-[#0B0F19]' : 'bg-slate-50'}`}>
        <div className={`absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 transition-colors duration-700 ${settings.darkMode ? 'bg-indigo-900/20' : 'bg-indigo-300/30'}`}></div>
        <div className={`absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 transition-colors duration-700 ${settings.darkMode ? 'bg-emerald-900/10' : 'bg-emerald-200/40'}`}></div>
      </div>

      {/* Main Layout Container */}
      <div className={`relative z-20 max-w-md mx-auto h-screen flex flex-col sm:my-8 sm:rounded-[48px] sm:h-[calc(100vh-4rem)] overflow-hidden transition-colors duration-500 ${settings.darkMode ? 'bg-[#0B0F19] sm:border-white/5 sm:shadow-2xl' : 'bg-white/50 backdrop-blur-sm sm:border-white/40 sm:shadow-2xl shadow-slate-200'}`}>
        
        {/* In-app Toast Banner */}
        {activeToast && (
          <div className="absolute top-4 left-4 right-4 z-[999] bg-slate-900/95 dark:bg-[#161E2E]/95 border border-indigo-500/30 text-white p-3.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-start gap-3 animate-slide-down">
            <span className="text-xl shrink-0">{activeToast.icon || '⚡'}</span>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-white leading-tight">{activeToast.title}</h4>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{activeToast.body}</p>
            </div>
            <button onClick={() => setActiveToast(null)} className="text-slate-400 hover:text-white text-xs p-1">✕</button>
          </div>
        )}

        {/* Brand Header */}
        {view === 'dashboard' && (
           <div className="absolute top-0 w-full pt-4 flex justify-center z-30 pointer-events-none">
             <span className={`text-[9px] font-bold uppercase tracking-[0.3em] backdrop-blur-sm px-3 py-1 rounded-full transition-colors ${settings.darkMode ? 'text-slate-500' : 'text-slate-400 bg-white/40'}`}>Hyprova Research</span>
           </div>
        )}

        {/* Scrollable Content Area */}
        <main 
          ref={mainContentRef} 
          className={`flex-1 overflow-y-auto hide-scrollbar h-full scroll-smooth ${view === 'chat' ? 'pb-0' : 'pb-32'}`}
        >
          {view === 'dashboard' && (
            <Dashboard 
              logs={logs} 
              prediction={prediction} 
              identity={identity} 
              userProfile={userProfile} 
              onOpenTraining={() => setIsTraining(true)}
              onOpenMealScanner={() => setIsScanningMeal(true)}
              onOpenExperiment={handleOpenExperiment}
              onOpenCycleTracker={() => setIsCycleTracking(true)}
              onSaveLog={handleSaveLog}
              onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
            />
          )}

          {view === 'chat' && (
            <AIChat 
              logs={logs} 
              userProfile={userProfile}
              identity={identity}
              onBack={() => setView('dashboard')}
              onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
            />
          )}
          
          {view === 'profile' && (
             <SettingsPage 
                userProfile={userProfile}
                settings={settings}
                logsCount={logs.length}
                onToggleSetting={toggleSetting}
                onUpdateSetting={updateSetting}
                onEditProfile={handleEditProfile}
                onUpdateProfile={handleUpdateProfile}
                onExportData={handleExportData}
                onResetApp={handleResetApp}
                onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
             />
          )}
        </main>

        {/* Floating Bottom Dock */}
        {view !== 'chat' && (
          <nav 
            className={`absolute bottom-8 left-6 right-6 h-[80px] rounded-[32px] flex items-center justify-between px-4 z-40 shadow-2xl transition-all duration-500 border ${settings.darkMode ? 'bg-[#161E2E]/90 backdrop-blur-xl border-white/5 shadow-black/50' : 'bg-white/90 backdrop-blur-xl border-white/50 shadow-slate-300/60'}`}
          >
            {/* Home */}
            <button 
              onClick={() => setView('dashboard')}
              className={`flex-1 group relative flex flex-col items-center justify-center h-full transition-all duration-300`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${view === 'dashboard' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg scale-110' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-600 dark:hover:text-slate-200'}`}>
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              </div>
            </button>
            
            {/* Chat */}
            <button 
              id="tour-chat-nav"
              onClick={() => setView('chat')}
              className={`flex-1 group relative flex flex-col items-center justify-center h-full transition-all duration-300`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-600 dark:hover:text-slate-200`}>
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              </div>
            </button>
            
            {/* FAB: Add Log */}
            <div id="tour-quick-log" className="relative -top-8 group px-2 z-50">
              <div className={`absolute inset-3 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500 opacity-60 ${settings.darkMode ? 'bg-white/20' : 'bg-slate-900/20'}`}></div>
              <button 
                onClick={() => setIsLogging(true)}
                className={`relative w-16 h-16 rounded-[24px] shadow-xl flex items-center justify-center text-3xl hover:scale-105 active:scale-95 transition-all border-4 ${settings.darkMode ? 'bg-white text-slate-900 shadow-white/10 border-slate-900 ring-1 ring-slate-700' : 'bg-slate-900 text-white shadow-slate-900/30 border-white ring-1 ring-slate-100'}`}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
            </div>

            {/* Training */}
            <button 
              id="tour-nav-training"
              onClick={() => setIsTraining(true)}
               className={`flex-1 group relative flex flex-col items-center justify-center h-full transition-all duration-300`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-600 dark:hover:text-slate-200 transition-all duration-300`}>
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                 </svg>
              </div>
            </button>
            
            {/* Profile */}
            <button 
               onClick={() => setView('profile')}
               className={`flex-1 group relative flex flex-col items-center justify-center h-full transition-all duration-300`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${view === 'profile' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg scale-110' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-600 dark:hover:text-slate-200'}`}>
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
            </button>
          </nav>
        )}

        {/* Overlays */}
        {isLogging && (
          <LogInput 
            userMeds={userProfile.medications} 
            gender={userProfile.gender}
            isFirstLog={logs.length === 0}
            onSave={handleSaveLog} 
            onClose={() => setIsLogging(false)} 
          />
        )}
        {isTraining && (
          <TrainingHub 
            onSaveLog={handleSaveLog} 
            onClose={() => setIsTraining(false)} 
            logs={logs}
            userProfile={userProfile}
            onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
          />
        )}
        {isScanningMeal && (
          <MealScanner 
             onSave={handleSaveLog}
             onClose={() => setIsScanningMeal(false)}
             onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
          />
        )}
        {isExperimenting && (
          <ExperimentHub 
              logs={logs} 
              userProfile={userProfile} 
              onClose={() => setIsExperimenting(false)} 
              onComplete={handleSaveLog}
              initialType={selectedExperimentType}
          />
        )}
        {isCycleTracking && (
            <CycleTracker 
                logs={logs}
                onClose={() => setIsCycleTracking(false)}
                onSaveLog={handleSaveLog}
            />
        )}
        {showMedicalReport && (
          <MedicalReport
            logs={logs}
            onClose={() => setShowMedicalReport(false)}
            onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
          />
        )}
        
        {showTour && (
          <Tour onComplete={handleTourComplete} onChangeView={handleTourChangeView} />
        )}

        <ApiKeyModal
          isOpen={isApiKeyModalOpen}
          onClose={() => setIsApiKeyModalOpen(false)}
          onKeySaved={handleApiKeySaved}
        />

      </div>
    </div>
  );
};

export default App;
