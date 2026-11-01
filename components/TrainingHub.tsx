
import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import ReactMarkdown from 'react-markdown';
import { generateWorkout, analyzeFormVideo, analyzePhysique, hasApiKey } from '../services/geminiService';
import { LogEntry, UserProfile } from '../types';

interface TrainingHubProps {
  onClose: () => void;
  onSaveLog: (log: any) => void;
  logs: LogEntry[];
  userProfile: UserProfile;
  onOpenApiKeyModal?: () => void;
}

const EQUIPMENT_OPTIONS = [
    { id: 'Gym', label: 'Full Gym' },
    { id: 'Dumbbells', label: 'Dumbbells' },
    { id: 'Bodyweight', label: 'Bodyweight' },
    { id: 'Kettlebell', label: 'Kettlebell' },
    { id: 'Bands', label: 'Resistance Bands' },
    { id: 'Barbell', label: 'Barbell' },
];

// Custom Markdown Components for Rich UI
const MarkdownComponents = {
    h1: ({node, ...props}: any) => <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2 leading-tight" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="text-base font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mt-6 mb-2 border-b border-slate-100 dark:border-white/10 pb-1" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-3 mb-1" {...props} />,
    ul: ({node, ...props}: any) => <ul className="space-y-1.5 mb-3 bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5 list-disc list-inside" {...props} />,
    ol: ({node, ...props}: any) => <ol className="space-y-1.5 mb-3 bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5 list-decimal list-inside" {...props} />,
    li: ({node, ...props}: any) => <li className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed" {...props} />,
    blockquote: ({node, ...props}: any) => (
        <div className="bg-indigo-50/80 dark:bg-indigo-950/30 border-l-4 border-indigo-500 p-3.5 rounded-r-xl my-4 text-xs italic text-indigo-900 dark:text-indigo-200" {...props} />
    ),
    p: ({node, ...props}: any) => <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-2" {...props} />,
    strong: ({node, ...props}: any) => <strong className="font-bold text-slate-900 dark:text-white" {...props} />,
};

const BodyMap = ({ selected, onSelect }: { selected: string, onSelect: (m: string) => void }) => {
    const [view, setView] = useState<'front' | 'back'>('front');
    
    // Styling helper
    const pStyle = (part: string) => `transition-all duration-300 cursor-pointer hover:opacity-80 stroke-2 ${selected === part ? 'fill-indigo-500 stroke-indigo-600 dark:stroke-indigo-400' : 'fill-slate-200 dark:fill-slate-700 stroke-transparent'}`;

    return (
        <div className="flex flex-col items-center w-full bg-slate-100/50 dark:bg-white/5 rounded-[32px] p-6 border border-slate-200 dark:border-white/5">
            <div className="flex bg-white dark:bg-black/20 rounded-full p-1 mb-6 shadow-sm border border-slate-100 dark:border-white/5">
                <button onClick={() => setView('front')} className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all ${view === 'front' ? 'bg-slate-900 text-white shadow' : 'text-slate-400 hover:text-slate-600'}`}>Front</button>
                <button onClick={() => setView('back')} className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all ${view === 'back' ? 'bg-slate-900 text-white shadow' : 'text-slate-400 hover:text-slate-600'}`}>Back</button>
            </div>
            
            <div className="relative h-64 w-40">
                <svg viewBox="0 0 200 400" className="w-full h-full drop-shadow-xl">
                    <defs>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="4" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>
                    
                    {/* Head */}
                     <circle cx="100" cy="35" r="20" className="fill-slate-300 dark:fill-slate-600" />
                    
                    {view === 'front' ? (
                        <g>
                            {/* Shoulders (Delts) */}
                            <path d="M45,65 Q65,55 100,60 Q135,55 155,65 L155,90 L45,90 Z" className={pStyle('Shoulders')} onClick={() => onSelect('Shoulders')} />

                            {/* Chest (Pecs) */}
                            <path d="M60,95 L140,95 L135,140 L65,140 Z" className={pStyle('Chest')} onClick={() => onSelect('Chest')} />
                            
                            {/* Arms */}
                            <g className={pStyle('Arms')} onClick={() => onSelect('Arms')}>
                                <path d="M35,95 L60,95 L55,200 L40,200 Z" />
                                <path d="M165,95 L140,95 L145,200 L160,200 Z" />
                            </g>

                            {/* Core (Abs) */}
                            <path d="M70,145 L130,145 L125,205 L75,205 Z" className={pStyle('Core')} onClick={() => onSelect('Core')} />
                            
                            {/* Legs (Quads) */}
                            <g className={pStyle('Legs')} onClick={() => onSelect('Legs')}>
                                <path d="M70,210 L95,210 L92,380 L75,380 Z" /> {/* Left */}
                                <path d="M105,210 L130,210 L125,380 L108,380 Z" /> {/* Right */}
                            </g>
                        </g>
                    ) : (
                        <g>
                             {/* Shoulders (Rear) */}
                            <path d="M45,65 Q65,55 100,60 Q135,55 155,65 L155,90 L45,90 Z" className={pStyle('Shoulders')} onClick={() => onSelect('Shoulders')} />

                             {/* Back (Lats/Traps) */}
                            <path d="M60,95 L140,95 L130,165 L70,165 Z" className={pStyle('Back')} onClick={() => onSelect('Back')} />
                            
                             {/* Arms */}
                            <g className={pStyle('Arms')} onClick={() => onSelect('Arms')}>
                                <path d="M35,95 L60,95 L55,200 L40,200 Z" />
                                <path d="M165,95 L140,95 L145,200 L160,200 Z" />
                            </g>

                            {/* Glutes */}
                            <path d="M70,170 L130,170 L130,205 L70,205 Z" className={pStyle('Glutes')} onClick={() => onSelect('Glutes')} />
                            
                            {/* Legs (Hams) */}
                            <g className={pStyle('Legs')} onClick={() => onSelect('Legs')}>
                                <path d="M70,210 L95,210 L92,380 L75,380 Z" /> {/* Left */}
                                <path d="M105,210 L130,210 L125,380 L108,380 Z" /> {/* Right */}
                            </g>
                        </g>
                    )}
                </svg>
                
                {/* Overlay Label for Selection */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                     {selected !== 'Full Body' && (
                         <span className="bg-slate-900/90 text-white text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg backdrop-blur-md animate-fade-in shadow-xl">
                             {selected}
                         </span>
                     )}
                </div>
            </div>
            
            <button 
                onClick={() => onSelect('Full Body')}
                className={`mt-6 px-8 py-3 rounded-2xl text-xs font-bold transition-all border ${selected === 'Full Body' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/30' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-indigo-400'}`}
            >
                Full Body Workout
            </button>
        </div>
    );
};

const TrainingHub: React.FC<TrainingHubProps> = ({ onClose, onSaveLog, logs, userProfile, onOpenApiKeyModal }) => {
  const [currentView, setCurrentView] = useState<'hub' | 'coach' | 'form' | 'physique' | 'tracker'>('hub');
  
  // Trainer AI State
  const [muscle, setMuscle] = useState<string>('Full Body');
  const [equipment, setEquipment] = useState<string[]>(['Bodyweight']);
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [duration, setDuration] = useState<number>(45);
  const [generatedPlan, setGeneratedPlan] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Form Check State
  const webcamRef = useRef<Webcam>(null);
  const [formMode, setFormMode] = useState<'menu' | 'countdown' | 'recording' | 'processing' | 'result'>('menu');
  const [formResult, setFormResult] = useState<any>(null);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const framesRef = useRef<string[]>([]);
  const intervalRef = useRef<any>(null);
  const [startDelay, setStartDelay] = useState<number>(3); 
  const [countdown, setCountdown] = useState<number>(0);
  const countdownIntervalRef = useRef<any>(null);

  // Physique Check State
  const [physiqueMode, setPhysiqueMode] = useState<'menu' | 'camera' | 'analyzing' | 'result'>('menu');
  const [capturedMedia, setCapturedMedia] = useState<string | null>(null); // Base64
  const [physiqueResult, setPhysiqueResult] = useState<any>(null);
  const [physiqueDelay, setPhysiqueDelay] = useState<number>(3);
  const [physiqueCountdown, setPhysiqueCountdown] = useState<number>(0);
  const physiqueCountdownIntervalRef = useRef<any>(null);

  const compressScreenshot = (dataUrl: string, maxDim = 512, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const comp = canvas.toDataURL('image/jpeg', quality);
          resolve(comp.split(',')[1]);
        } else {
          resolve(dataUrl.split(',')[1]);
        }
      };
      img.onerror = () => resolve(dataUrl.split(',')[1]);
      img.src = dataUrl;
    });
  };

  const toggleEquipment = (item: string) => {
      if (equipment.includes(item)) {
          setEquipment(equipment.filter(e => e !== item));
      } else {
          setEquipment([...equipment, item]);
      }
  };

  const handleGenerate = async () => {
      if (!hasApiKey()) {
          if (onOpenApiKeyModal) onOpenApiKeyModal();
          setGeneratedPlan("⚠️ **Google Gemini API Key Required**\n\nPlease enter your personal Gemini API key to generate a personalized workout plan.");
          return;
      }
      setIsGenerating(true);
      const plan = await generateWorkout({
          muscleGroup: muscle,
          equipment: equipment.length > 0 ? equipment : ['Bodyweight'],
          difficulty,
          duration,
          userGoals: userProfile.goals
      });
      setGeneratedPlan(plan);
      setIsGenerating(false);
  };

  const handleLogWorkout = () => {
      if (!generatedPlan) return;
      onSaveLog({
          type: 'workout',
          title: `${muscle} - ${difficulty} Workout`,
          details: generatedPlan,
          mood: 4, 
          energyLevel: 5, 
          stressLevel: 3, 
          sleepHours: 0, 
          hydrationCups: 0, 
          symptoms: [], 
          tags: ['Trainer AI', muscle],
          medicationsTaken: [],
          metrics: { intensity: 8, muscleGroup: muscle }
      });
      onClose();
  };

  const handleStartRecording = () => {
    if (startDelay > 0) {
        setFormMode('countdown');
        setCountdown(startDelay);
        
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        
        countdownIntervalRef.current = setInterval(() => {
             setCountdown(prev => {
                 if (prev <= 1) {
                     clearInterval(countdownIntervalRef.current);
                     startCapture(); 
                     return 0;
                 }
                 return prev - 1;
             });
        }, 1000);
    } else {
        startCapture();
    }
  };

  const cancelCountdown = () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setFormMode('menu');
  };

  const startCapture = () => {
      setFormMode('recording');
      setRecordingProgress(0);
      framesRef.current = [];
      
      let count = 0;
      const maxFrames = 5; 
      
      if (intervalRef.current) clearInterval(intervalRef.current);

      intervalRef.current = setInterval(async () => {
            if (webcamRef.current) {
                const src = webcamRef.current.getScreenshot();
                if (src) {
                    const comp = await compressScreenshot(src);
                    framesRef.current.push(comp);
                }
            }
            count++;
            setRecordingProgress((count / maxFrames) * 100);
            
            if (count >= maxFrames) {
                clearInterval(intervalRef.current);
                analyzeFrames();
            }
      }, 800);
  };

  const analyzeFrames = async () => {
      if (!hasApiKey()) {
          if (onOpenApiKeyModal) onOpenApiKeyModal();
          setFormResult({ formScore: 0, exerciseDetected: 'Error', safetyAlert: 'Gemini API key is required to analyze form.' });
          setFormMode('result');
          return;
      }
      setFormMode('processing');
      try {
          const result = await analyzeFormVideo(framesRef.current);
          setFormResult(result);
          setFormMode('result');
      } catch (e) {
          console.error("Analysis failed", e);
          setFormResult(null);
          setFormMode('menu'); 
      }
  };

  const handleLogFormCheck = () => {
      if (!formResult) return;
      onSaveLog({
          type: 'form_check',
          title: `Form Check: ${formResult.exerciseDetected || 'Exercise'}`,
          details: `Score: ${formResult.formScore}/10. ${formResult.safetyAlert}.`,
          mood: 3, energyLevel: 5, stressLevel: 5, sleepHours: 0, hydrationCups: 0,
          symptoms: [], tags: ['Form Check', formResult.exerciseDetected || 'Exercise'],
          metrics: { formScore: formResult.formScore },
          notes: JSON.stringify(formResult)
      });
      onClose();
  };

  const triggerPhysiqueCapture = () => {
      if (!hasApiKey()) {
          if (onOpenApiKeyModal) onOpenApiKeyModal();
          return;
      }
      if (physiqueDelay > 0) {
          setPhysiqueCountdown(physiqueDelay);
          let current = physiqueDelay;
          physiqueCountdownIntervalRef.current = setInterval(() => {
              current -= 1;
              setPhysiqueCountdown(current);
              if (current <= 0) {
                  clearInterval(physiqueCountdownIntervalRef.current);
                  executePhysiqueCapture();
              }
          }, 1000);
      } else {
          executePhysiqueCapture();
      }
  };

  const cancelPhysiqueCountdown = () => {
      if (physiqueCountdownIntervalRef.current) {
          clearInterval(physiqueCountdownIntervalRef.current);
      }
      setPhysiqueCountdown(0);
  };

  const executePhysiqueCapture = async () => {
      setPhysiqueCountdown(0);
      if (webcamRef.current) {
          const imageSrc = webcamRef.current.getScreenshot();
          if (imageSrc) {
              setCapturedMedia(imageSrc);
              setPhysiqueMode('analyzing');
              
              // Analyze with compressed payload to prevent timeout
              try {
                  const base64 = await compressScreenshot(imageSrc, 768, 0.8);
                  const result = await analyzePhysique(base64);
                  setPhysiqueResult(result);
                  setPhysiqueMode('result');
              } catch (error) {
                  console.error(error);
                  setPhysiqueMode('menu');
              }
          }
      }
  };

  const handleLogPhysique = () => {
      if (!physiqueResult) return;
      onSaveLog({
          type: 'physique',
          title: `Physique: ${physiqueResult.visibleRegion || 'Check'}`,
          details: `${physiqueResult.honestAssessment?.substring(0, 60)}...`,
          mood: 3, energyLevel: 5, stressLevel: 5, sleepHours: 0, hydrationCups: 0,
          symptoms: [], tags: ['Physique', physiqueResult.visibleRegion || 'General'],
          metrics: { definitionScore: physiqueResult.definitionScore },
          image: capturedMedia, 
          notes: JSON.stringify(physiqueResult)
      });
      onClose();
  };

  const renderHub = () => (
     <div className="p-6 space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Training Hub</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Select a tool to optimize your performance</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
            <button onClick={() => setCurrentView('coach')} className="group relative overflow-hidden p-6 rounded-[32px] bg-white dark:bg-[#161E2E] border border-slate-100 dark:border-white/5 shadow-xl text-left transition-all hover:scale-[1.02] active:scale-95">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/20 transition-colors"></div>
                <div className="relative z-10 flex items-start justify-between">
                    <div>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl mb-4">🤖</div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">AI Trainer</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Generate personalized workouts</p>
                    </div>
                    <div className="w-8 h-8 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">→</div>
                </div>
            </button>

            <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setCurrentView('form')} className="group relative overflow-hidden p-6 rounded-[32px] bg-white dark:bg-[#161E2E] border border-slate-100 dark:border-white/5 shadow-xl text-left transition-all hover:scale-[1.02] active:scale-95">
                     <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-rose-500/20 transition-colors"></div>
                     <div className="relative z-10">
                        <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl mb-4">🧘</div>
                        <h3 className="font-bold text-slate-900 dark:text-white leading-tight">Form<br/>Check</h3>
                     </div>
                </button>

                <button onClick={() => setCurrentView('physique')} className="group relative overflow-hidden p-6 rounded-[32px] bg-white dark:bg-[#161E2E] border border-slate-100 dark:border-white/5 shadow-xl text-left transition-all hover:scale-[1.02] active:scale-95">
                     <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/20 transition-colors"></div>
                     <div className="relative z-10">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl mb-4">📸</div>
                        <h3 className="font-bold text-slate-900 dark:text-white leading-tight">Physique<br/>Scan</h3>
                     </div>
                </button>
            </div>
            
            <button onClick={() => setCurrentView('tracker')} className="p-4 rounded-[24px] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center justify-between group hover:bg-slate-100 dark:hover:bg-white/10 transition-all">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400">📊</div>
                    <div className="text-left">
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">Workout History</h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{logs.filter(l => ['workout','form_check','physique'].includes(l.type || '')).length} sessions logged</p>
                    </div>
                </div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">View All</span>
            </button>
        </div>
     </div>
  );

  return (
    <div className="fixed inset-0 z-[60] bg-slate-50 dark:bg-[#0B0F19] flex flex-col animate-fade-in font-sans overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 flex justify-between items-center bg-white dark:bg-[#111827] border-b border-slate-100 dark:border-white/5 shrink-0 z-20">
            {currentView === 'hub' ? (
                <div className="w-8"></div> // Spacer
            ) : (
                <button 
                    onClick={() => !isGenerating && setCurrentView('hub')} 
                    disabled={isGenerating}
                    className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    ←
                </button>
            )}

            {currentView !== 'hub' && (
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    {currentView === 'coach' ? 'AI Trainer' : currentView === 'form' ? 'Form Check' : currentView === 'physique' ? 'Physique Scanner' : 'History'}
                </h2>
            )}

            <button 
                onClick={onClose} 
                disabled={isGenerating}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
                ✕
            </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto hide-scrollbar relative">
            
             {currentView === 'hub' && renderHub()}

            {/* --- TRAINER AI --- */}
            {currentView === 'coach' && (
                <div className="p-6 pb-32 animate-slide-up">
                    {!generatedPlan ? (
                        <div className="max-w-xl mx-auto">
                            <div className="text-center mb-8">
                                <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-500/10 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 border border-indigo-200 dark:border-indigo-500/20">🤖</div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">AI Workout Builder</h1>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">Target specific muscles with the equipment you have.</p>
                            </div>

                            <div className="space-y-8">
                                {/* Muscle Selector */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 block">Target Area</label>
                                    <BodyMap selected={muscle} onSelect={setMuscle} />
                                </div>

                                {/* Duration & Difficulty */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white dark:bg-[#161E2E] p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Duration</label>
                                        <div className="flex items-end gap-1">
                                            <span className="text-2xl font-black text-slate-900 dark:text-white">{duration}</span>
                                            <span className="text-xs font-bold text-slate-400 mb-1.5">min</span>
                                        </div>
                                        <input type="range" min="15" max="90" step="5" value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} className="w-full mt-2 accent-indigo-500" />
                                    </div>
                                    <div className="bg-white dark:bg-[#161E2E] p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Intensity</label>
                                        <div className="flex flex-col gap-1">
                                            {['Beginner', 'Intermediate', 'Advanced'].map((lvl) => (
                                                <button 
                                                    key={lvl} 
                                                    onClick={() => setDifficulty(lvl as any)}
                                                    className={`text-left text-xs font-bold py-1 px-2 rounded transition-colors ${difficulty === lvl ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                                >
                                                    {lvl}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Equipment */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Equipment Available</label>
                                    <div className="flex flex-wrap gap-2">
                                        {EQUIPMENT_OPTIONS.map(eq => (
                                            <button
                                                key={eq.id}
                                                onClick={() => toggleEquipment(eq.id)}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${equipment.includes(eq.id) ? 'bg-indigo-5 dark:bg-indigo-500/20 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/10 text-slate-500 dark:text-slate-400'}`}
                                            >
                                                {eq.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button 
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[24px] font-bold text-lg shadow-xl shadow-slate-900/20 dark:shadow-white/10 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-wait"
                                >
                                    {isGenerating ? 'Designing Workout...' : 'Generate Plan'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-2xl mx-auto animate-fade-in">
                            <div className="bg-white dark:bg-[#161E2E] rounded-[32px] p-8 shadow-xl border border-slate-100 dark:border-white/5 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                                <div className="prose prose-slate dark:prose-invert max-w-none">
                                    <ReactMarkdown components={MarkdownComponents}>
                                        {generatedPlan}
                                    </ReactMarkdown>
                                </div>
                                <div className="mt-12 flex gap-4 border-t border-slate-100 dark:border-white/5 pt-6">
                                    <button onClick={() => setGeneratedPlan(null)} className="flex-1 py-4 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 rounded-2xl font-bold">Discard</button>
                                    <button onClick={handleLogWorkout} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/30">Log Workout</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {isGenerating && (
                        <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                            <div className="relative mb-6">
                                <div className="w-20 h-20 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center text-3xl">💪</div>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Designing Your Workout</h3>
                            <p className="text-slate-300 text-sm max-w-xs mb-4">
                                Tailoring exercises, sets, reps, and cues for {muscle}...
                            </p>
                            <div className="px-4 py-1.5 bg-white/10 rounded-full text-xs text-indigo-300 font-medium">
                                Analyzing goals & equipment...
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- FORM CHECK --- */}
            {currentView === 'form' && (
                <div className="h-full flex flex-col bg-black animate-slide-up">
                    <div className="flex-1 relative overflow-hidden">
                        {(formMode === 'menu' || formMode === 'countdown' || formMode === 'recording') && (
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                className="absolute inset-0 w-full h-full object-cover"
                                videoConstraints={{ facingMode: "user" }}
                            />
                        )}

                        {formMode === 'menu' && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-8 text-center animate-fade-in backdrop-blur-sm">
                                <div className="w-20 h-20 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-4xl mb-6 shadow-2xl">
                                    🧘
                                </div>
                                <h2 className="text-3xl font-bold text-white mb-2">AI Form Coach</h2>
                                <p className="text-slate-300 mb-8 max-w-xs">Align your full body in frame. I will record 5 seconds and analyze your technique.</p>
                                
                                <div className="mb-8 w-full max-w-xs">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block text-center">Start Delay</label>
                                    <div className="flex bg-white/10 p-1 rounded-xl">
                                        {[0, 3, 5, 10].map(s => (
                                            <button
                                                key={s}
                                                onClick={() => setStartDelay(s)}
                                                className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all ${startDelay === s ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                            >
                                                {s === 0 ? 'None' : `${s}s`}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button 
                                    onClick={handleStartRecording}
                                    className="px-10 py-5 bg-white text-black rounded-full font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10"
                                >
                                    Start Analysis
                                </button>
                            </div>
                        )}

                        {formMode === 'countdown' && (
                            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/20 backdrop-blur-none">
                                <div className="text-[10rem] font-black text-white drop-shadow-2xl animate-pulse">
                                    {countdown}
                                </div>
                                <p className="text-white font-bold uppercase tracking-widest mt-4 bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm">Get in position</p>
                                <button onClick={cancelCountdown} className="mt-12 px-8 py-3 bg-white/20 hover:bg-white/30 text-white rounded-full font-bold backdrop-blur-md transition-all border border-white/10">
                                    Cancel
                                </button>
                            </div>
                        )}

                        {formMode === 'recording' && (
                            <div className="absolute inset-0 border-[6px] border-rose-500 animate-pulse-slow">
                                <div className="absolute top-6 right-6 flex items-center gap-2 bg-black/50 px-3 py-1 rounded-full backdrop-blur-md">
                                    <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></div>
                                    <span className="text-white font-bold text-xs uppercase tracking-wider">Recording</span>
                                </div>
                                <div className="absolute bottom-10 left-10 right-10">
                                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-rose-500 transition-all duration-500 ease-linear" style={{ width: `${recordingProgress}%` }}></div>
                                    </div>
                                    <p className="text-center text-white/80 text-xs font-bold mt-2 uppercase tracking-widest">Perform Reps Now</p>
                                </div>
                            </div>
                        )}

                        {formMode === 'processing' && (
                             <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-8">
                                 <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                                 <h3 className="text-xl font-bold text-white mb-2">Analyzing Biomechanics</h3>
                                 <p className="text-slate-400 text-sm">Measuring joint angles, stability, and tempo...</p>
                             </div>
                        )}

                        {formMode === 'result' && formResult && (
                            <div className="absolute inset-0 bg-slate-900 overflow-y-auto hide-scrollbar">
                                <div className="p-8 pb-32">
                                     <div className="flex justify-between items-start mb-8">
                                         <div>
                                             <div className="flex items-center gap-2 mb-1">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${formResult.safetyAlert === 'Safe' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                    {formResult.safetyAlert}
                                                </span>
                                             </div>
                                             <h2 className="text-3xl font-bold text-white">{formResult.exerciseDetected}</h2>
                                         </div>
                                         <div className="text-right">
                                             <div className="text-4xl font-black text-indigo-400">{formResult.formScore}</div>
                                             <div className="text-[10px] font-bold text-slate-500 uppercase">Score / 10</div>
                                         </div>
                                     </div>

                                     <div className="grid grid-cols-3 gap-3 mb-8">
                                         <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                                             <div className="text-xl font-bold text-white">{formResult.metrics?.stability ?? Math.round(formResult.formScore || 7)}/10</div>
                                             <div className="text-[10px] text-slate-500 uppercase font-bold">Stability</div>
                                         </div>
                                         <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                                             <div className="text-xl font-bold text-white">{formResult.metrics?.tempo ?? Math.round(formResult.formScore || 7)}/10</div>
                                             <div className="text-[10px] text-slate-500 uppercase font-bold">Tempo</div>
                                         </div>
                                         <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                                             <div className="text-xl font-bold text-white">{formResult.metrics?.jointAlignment ?? Math.round(formResult.formScore || 7)}/10</div>
                                             <div className="text-[10px] text-slate-500 uppercase font-bold">Alignment</div>
                                         </div>
                                     </div>

                                     <div className="space-y-4 mb-8">
                                         <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-white/10 pb-2">Corrections</h3>
                                         {formResult.keyFaults?.length > 0 ? (
                                             formResult.keyFaults.map((fault: any, i: number) => (
                                                 <div key={i} className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl">
                                                     <div className="flex justify-between items-center mb-1">
                                                         <span className="text-rose-400 font-bold text-sm">{fault.issue}</span>
                                                         <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded text-white/60">{fault.location}</span>
                                                     </div>
                                                     <p className="text-slate-300 text-sm">💡 Fix: {fault.fix}</p>
                                                 </div>
                                             ))
                                         ) : (
                                             <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center">
                                                 <p className="text-emerald-400 font-bold text-sm">Excellent Form! No major faults detected.</p>
                                             </div>
                                         )}
                                     </div>

                                     <div className="flex gap-4">
                                         <button onClick={() => setFormMode('menu')} className="flex-1 py-4 bg-white/10 text-white font-bold rounded-2xl hover:bg-white/20 transition-colors">Retake</button>
                                         <button onClick={handleLogFormCheck} className="flex-[2] py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/40 hover:bg-indigo-500 transition-colors">Save Analysis</button>
                                     </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- PHYSIQUE CHECK --- */}
            {currentView === 'physique' && (
                <div className="h-full flex flex-col bg-black animate-slide-up">
                     <div className="flex-1 relative overflow-hidden">
                         
                         {(physiqueMode === 'menu' || physiqueMode === 'camera') && (
                             <>
                                <Webcam
                                    audio={false}
                                    ref={webcamRef}
                                    screenshotFormat="image/jpeg"
                                    className="absolute inset-0 w-full h-full object-cover"
                                    videoConstraints={{ facingMode: "user" }}
                                />
                                {physiqueMode === 'menu' && (
                                     <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-8 text-center animate-fade-in backdrop-blur-sm">
                                        <div className="w-20 h-20 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-4xl mb-6 shadow-2xl">
                                            📸
                                        </div>
                                        <h2 className="text-3xl font-bold text-white mb-2">Physique Scanner</h2>
                                        <p className="text-slate-300 mb-8 max-w-xs">Track your physical progress with AI analysis of muscle definition and symmetry.</p>
                                        <button 
                                            onClick={() => setPhysiqueMode('camera')}
                                            className="px-10 py-5 bg-white text-black rounded-full font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10"
                                        >
                                            Take Photo
                                        </button>
                                    </div>
                                )}
                                {physiqueMode === 'camera' && (
                                    <>
                                        {physiqueCountdown > 0 && (
                                            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-none">
                                                <div className="text-[10rem] font-black text-white drop-shadow-2xl animate-pulse">
                                                    {physiqueCountdown}
                                                </div>
                                                <p className="text-white font-bold uppercase tracking-widest mt-4 bg-black/60 px-5 py-2 rounded-xl backdrop-blur-sm">
                                                    Strike Your Pose
                                                </p>
                                                <button
                                                    onClick={cancelPhysiqueCountdown}
                                                    className="mt-10 px-8 py-3 bg-white/20 hover:bg-white/30 text-white rounded-full font-bold backdrop-blur-md transition-all border border-white/20"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        )}

                                        <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-4 z-20">
                                            {/* Timer delay options */}
                                            <div className="flex bg-black/60 backdrop-blur-md p-1 rounded-2xl border border-white/15 shadow-xl">
                                                {[0, 3, 5, 10].map(s => (
                                                    <button
                                                        key={s}
                                                        onClick={() => setPhysiqueDelay(s)}
                                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${physiqueDelay === s ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-300 hover:text-white'}`}
                                                    >
                                                        {s === 0 ? 'Off' : `${s}s`}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="flex justify-center items-center gap-8 w-full max-w-xs">
                                                <button onClick={() => setPhysiqueMode('menu')} className="w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-md border border-white/10">✕</button>
                                                <button 
                                                    onClick={triggerPhysiqueCapture}
                                                    className="w-20 h-20 rounded-full border-[6px] border-white flex items-center justify-center active:scale-90 transition-transform bg-white/20 backdrop-blur-sm shadow-2xl"
                                                >
                                                    <div className="w-16 h-16 bg-white rounded-full"></div>
                                                </button>
                                                <div className="w-12 h-12"></div> {/* Spacer */}
                                            </div>
                                        </div>
                                    </>
                                )}
                             </>
                         )}

                         {physiqueMode === 'analyzing' && (
                             <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-8">
                                 {capturedMedia && <img src={capturedMedia} alt="Capture" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm" />}
                                 <div className="relative z-10 flex flex-col items-center">
                                    <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                                    <h3 className="text-xl font-bold text-white mb-2">Scanning Physique</h3>
                                    <p className="text-slate-400 text-sm">Identifying muscle groups and analyzing definition...</p>
                                 </div>
                             </div>
                         )}

                         {physiqueMode === 'result' && physiqueResult && (
                             <div className="absolute inset-0 bg-slate-900 overflow-y-auto hide-scrollbar">
                                 {capturedMedia && (
                                     <div className="relative h-64 w-full">
                                         <img src={capturedMedia} alt="Physique" className="w-full h-full object-cover" />
                                         <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                                         <div className="absolute bottom-4 left-6">
                                             <span className="bg-emerald-500 text-white px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider mb-2 inline-block">
                                                 {physiqueResult.visibleRegion || 'Analysis Complete'}
                                             </span>
                                             <h2 className="text-3xl font-bold text-white">Physique Report</h2>
                                         </div>
                                     </div>
                                 )}
                                 
                                 <div className="p-6 pb-32 -mt-4 relative z-10">
                                     <div className="flex items-center gap-4 mb-8">
                                         <div className="flex-1 bg-white/5 p-4 rounded-2xl border border-white/5">
                                             <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">Definition Score</p>
                                             <p className="text-4xl font-black text-emerald-400">{physiqueResult.definitionScore}<span className="text-sm text-slate-500">/10</span></p>
                                         </div>
                                         <div className="flex-1 bg-white/5 p-4 rounded-2xl border border-white/5">
                                             <p className="text-slate-400 text-[10px] font-bold uppercase mb-1">Muscles Detected</p>
                                             <div className="flex flex-wrap gap-1">
                                                 {physiqueResult.muscleGroupsDetected?.slice(0,3).map((m: string) => (
                                                     <span key={m} className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white">{m}</span>
                                                 ))}
                                             </div>
                                         </div>
                                     </div>

                                     <div className="bg-indigo-500/10 border border-indigo-500/20 p-5 rounded-2xl mb-6">
                                         <div className="flex items-center gap-2 mb-2">
                                             <span className="text-lg">🤖</span>
                                             <span className="text-xs font-bold uppercase text-indigo-400 tracking-wider">AI Assessment</span>
                                         </div>
                                         <p className="text-slate-200 text-sm leading-relaxed">
                                             {physiqueResult.honestAssessment}
                                         </p>
                                     </div>

                                     {physiqueResult.targetMuscleForWorkout && (
                                         <div className="bg-white/5 border border-white/10 p-5 rounded-2xl mb-8">
                                             <p className="text-xs font-bold uppercase text-slate-400 mb-2">Recommended Focus</p>
                                             <div className="flex justify-between items-center">
                                                 <h3 className="text-xl font-bold text-white">{physiqueResult.targetMuscleForWorkout}</h3>
                                                 <button 
                                                     onClick={() => {
                                                         setMuscle(physiqueResult.targetMuscleForWorkout);
                                                         setCurrentView('coach');
                                                     }}
                                                     className="px-4 py-2 bg-white text-slate-900 text-xs font-bold rounded-full hover:bg-slate-200"
                                                 >
                                                     Generate Workout
                                                 </button>
                                             </div>
                                         </div>
                                     )}

                                     <div className="flex gap-4">
                                         <button onClick={() => setPhysiqueMode('menu')} className="flex-1 py-4 bg-white/10 text-white font-bold rounded-2xl hover:bg-white/20 transition-colors">Retake</button>
                                         <button onClick={handleLogPhysique} className="flex-[2] py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/40 hover:bg-emerald-500 transition-colors">Save to Tracker</button>
                                     </div>
                                 </div>
                             </div>
                         )}
                     </div>
                </div>
            )}

            {/* --- TRACKER --- */}
            {currentView === 'tracker' && (
                <div className="p-6 flex flex-col items-center h-full text-center animate-slide-up">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center text-3xl mb-4">📊</div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Workout History</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mb-6">View your past training sessions and physique updates here.</p>
                    <div className="w-full space-y-3 pb-20">
                        {logs.filter(l => l.type === 'workout' || l.type === 'form_check' || l.type === 'physique').slice(0, 10).map(log => (
                            <div key={log.id} className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5 text-left relative overflow-hidden">
                                {log.type === 'physique' && (
                                    <div className="absolute right-0 top-0 bottom-0 w-20 opacity-20">
                                        {log.image && <img src={log.image} alt="" className="w-full h-full object-cover" />}
                                    </div>
                                )}
                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                                log.type === 'workout' ? 'bg-indigo-100 text-indigo-600' : 
                                                log.type === 'form_check' ? 'bg-rose-100 text-rose-600' : 
                                                'bg-emerald-100 text-emerald-600'
                                            }`}>
                                                {log.type === 'form_check' ? 'Form' : log.type === 'physique' ? 'Physique' : 'Workout'}
                                            </span>
                                            <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleDateString()}</span>
                                        </div>
                                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{log.title}</h4>
                                    </div>
                                    {log.metrics?.definitionScore && (
                                        <div className="text-center">
                                            <div className="text-lg font-black text-emerald-500">{log.metrics.definitionScore}</div>
                                            <div className="text-[8px] uppercase font-bold text-slate-400">Score</div>
                                        </div>
                                    )}
                                    {log.metrics?.formScore && (
                                        <div className="text-center">
                                            <div className="text-lg font-black text-indigo-500">{log.metrics.formScore}</div>
                                            <div className="text-[8px] uppercase font-bold text-slate-400">Score</div>
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 relative z-10">{log.details}</p>
                            </div>
                        ))}
                        {logs.filter(l => l.type === 'workout' || l.type === 'form_check' || l.type === 'physique').length === 0 && (
                            <p className="text-xs italic text-slate-400">No training logs found.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default TrainingHub;
