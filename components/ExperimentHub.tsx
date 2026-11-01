
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { HealthExperiment, LogEntry, UserProfile } from '../types';
import { generateHealthExperiment, verifyAction } from '../services/geminiService';

interface ExperimentHubProps {
  logs: LogEntry[];
  userProfile: UserProfile;
  onClose: () => void;
  onComplete: (log: LogEntry) => void;
  initialType?: string; // New prop to force specific experiment type
}

const ExperimentHub: React.FC<ExperimentHubProps> = ({ logs, userProfile, onClose, onComplete, initialType }) => {
  const [experiment, setExperiment] = useState<HealthExperiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'proposal' | 'active' | 'verify' | 'result'>('proposal');
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<any>(null);

  // Breathing State
  const [breathState, setBreathState] = useState<'inhale' | 'hold' | 'exhale'>('exhale');
  const breathingTimerRef = useRef<any>(null);

  // Verification State
  const webcamRef = useRef<Webcam>(null);
  const recordedFramesRef = useRef<string[]>([]); 
  const [isRecording, setIsRecording] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ success: boolean; feedback: string } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const captureIntervalRef = useRef<any>(null);
  
  // Prep Timer State
  const [prepTime, setPrepTime] = useState(0);
  const prepIntervalRef = useRef<any>(null);

  // Initialize
  useEffect(() => {
    const loadExp = async () => {
      // Pass the initialType to the generator if it exists, or let it decide
      const exp = await generateHealthExperiment(logs, userProfile, initialType);
      setExperiment(exp);
      setLoading(false);
      setTimeLeft(exp.durationSeconds || 60);
    };
    loadExp();
    return () => clearInterval(timerRef.current!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer Logic
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      if (experiment?.type === 'breathing') {
         // Breathing auto-completes
         handleSuccess("Completed a mindful breathing session.");
      } else {
         // Others go to verify
         setView('verify');
      }
    }
    return () => clearInterval(timerRef.current!);
  }, [isActive, timeLeft, experiment]);

  // Breathing Animation Loop
  useEffect(() => {
    if (view === 'active' && experiment?.type === 'breathing') {
        const cycle = () => {
            setBreathState('inhale');
            breathingTimerRef.current = setTimeout(() => {
                setBreathState('hold');
                breathingTimerRef.current = setTimeout(() => {
                    setBreathState('exhale');
                    breathingTimerRef.current = setTimeout(cycle, 4000);
                }, 4000);
            }, 4000);
        };
        
        // Start from contracted state
        setBreathState('exhale');
        breathingTimerRef.current = setTimeout(cycle, 100);

        return () => clearTimeout(breathingTimerRef.current);
    }
  }, [view, experiment]);

  const startExperiment = () => {
    setView('active');
    setIsActive(true);
  };

  const initVerification = () => {
      setPrepTime(3);
      prepIntervalRef.current = setInterval(() => {
         setPrepTime(prev => {
            if (prev <= 1) {
                clearInterval(prepIntervalRef.current);
                startRecordingProcess();
                return 0;
            }
            return prev - 1;
         });
      }, 1000);
  };

  const startRecordingProcess = () => {
      setIsRecording(true);
      recordedFramesRef.current = []; 
      
      let count = 0;
      captureIntervalRef.current = setInterval(() => {
          if (webcamRef.current) {
              const src = webcamRef.current.getScreenshot();
              if (src) {
                  const base64 = src.split(',')[1];
                  recordedFramesRef.current.push(base64);
              }
          }
          count++;
          if (count >= 6) { 
              clearInterval(captureIntervalRef.current!);
              setIsRecording(false);
              verifyFrames();
          }
      }, 500);
  };

  const verifyFrames = async () => {
      setVerifying(true);
      setTimeout(async () => {
         const frames = recordedFramesRef.current;

         if (frames.length === 0 && webcamRef.current) {
             const src = webcamRef.current.getScreenshot();
             if (src) frames.push(src.split(',')[1]);
         }
         
         const result = await verifyAction(frames, experiment?.verificationPrompt || "Did the user complete the action?");
         setVerificationResult(result);
         setVerifying(false);
         setView('result');
         
         if (result.success) {
             handleSuccess(result.feedback);
         }
      }, 500);
  };

  const handleSuccess = (feedback: string) => {
      const log: LogEntry = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          mood: 4, 
          energyLevel: 5,
          stressLevel: 3,
          sleepHours: 0,
          hydrationCups: experiment?.type === 'habit' && experiment.title.includes('Water') ? 1 : 0,
          symptoms: [],
          medicationsTaken: [],
          tags: ['Experiment', experiment?.title || 'Bio-Hack'],
          type: 'experiment',
          title: experiment?.title,
          details: `Completed experiment: ${experiment?.title}. \nFeedback: ${feedback}`,
          experimentData: {
              type: experiment?.type as any || 'habit',
              verified: true,
              aiFeedback: feedback
          }
      };
      
      setTimeout(() => {
         onComplete(log);
      }, 3000);
  };

  if (loading) {
      return (
          <div className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center text-center animate-fade-in">
              <div className="w-20 h-20 rounded-full border-4 border-slate-700 border-t-emerald-500 animate-spin mb-6"></div>
              <h2 className="text-2xl font-bold text-white mb-2">Analyzing Bio-Rhythms</h2>
              <p className="text-slate-400">Designing your personalized experiment...</p>
          </div>
      );
  }

  if (!experiment) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900 flex flex-col font-sans text-white overflow-y-auto">
        {/* Dynamic Background */}
        <div className="fixed inset-0 pointer-events-none">
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] transition-all duration-1000 ${breathState === 'inhale' ? 'scale-110 opacity-40' : 'scale-90 opacity-20'}`}></div>
        </div>

        {/* Close Button */}
        <button onClick={onClose} className="fixed top-6 right-6 z-50 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors backdrop-blur-md border border-white/10">✕</button>

        {/* --- PROPOSAL VIEW --- */}
        {view === 'proposal' && (
            <div className="flex-1 flex flex-col items-center justify-start sm:justify-center p-6 pt-16 pb-20 animate-slide-up max-w-md mx-auto w-full min-h-min">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[28px] sm:rounded-[32px] bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-3xl sm:text-4xl shadow-2xl mb-6 border border-white/20 shrink-0">
                    {experiment.type === 'breathing' ? '🌬️' : experiment.type === 'movement' ? '🧘' : '💧'}
                </div>
                
                <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-[0.2em] mb-2">Bio-Hack Recommended</h3>
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 text-center leading-tight">{experiment.title}</h1>
                <p className="text-slate-300 text-center mb-6 leading-relaxed font-medium text-base sm:text-lg">{experiment.description}</p>
                
                <div className="bg-white/5 rounded-2xl p-5 border border-white/10 w-full mb-6">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Why this?</p>
                    <p className="text-sm text-slate-200 leading-relaxed">{experiment.rationale}</p>
                    <div className="mt-4 flex gap-4 text-xs font-bold text-slate-400 uppercase">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> {experiment.difficulty}</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> {Math.floor(experiment.durationSeconds/60)}m {experiment.durationSeconds%60}s</span>
                    </div>
                </div>

                <button 
                  onClick={startExperiment}
                  className="w-full py-4 sm:py-5 bg-white text-slate-900 rounded-[24px] font-bold text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all shrink-0 mb-4"
                >
                    Accept Challenge
                </button>
            </div>
        )}

        {/* --- ACTIVE VIEW --- */}
        {view === 'active' && (
            <div className="flex-1 flex flex-col items-center justify-between p-8 animate-fade-in relative z-10">
                
                <div className="w-full flex justify-between items-center">
                    <h2 className="font-bold text-slate-400 uppercase tracking-widest text-xs">Experiment in Progress</h2>
                    <div className="text-2xl font-black font-mono">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</div>
                </div>

                {experiment.type === 'breathing' ? (
                    <div className="flex-1 flex flex-col items-center justify-center relative">
                         {/* Breathing Circle */}
                         <div className={`w-64 h-64 rounded-full border-4 border-white/20 flex items-center justify-center transition-all duration-[4000ms] ease-in-out relative 
                            ${breathState === 'inhale' 
                                ? 'scale-125 bg-indigo-500/20 border-indigo-400/50' 
                                : breathState === 'hold' 
                                    ? 'scale-125 bg-indigo-500/40 border-indigo-400 shadow-[0_0_40px_rgba(99,102,241,0.6)]' 
                                    : 'scale-90 bg-transparent border-white/20'
                            }`}
                         >
                             <div className={`absolute inset-0 rounded-full blur-2xl bg-indigo-500/30 transition-all duration-[4000ms] ${breathState === 'inhale' ? 'opacity-100 scale-150' : 'opacity-0 scale-100'}`}></div>
                             <span className="text-2xl font-bold tracking-widest uppercase transition-all duration-500">
                                 {breathState}
                             </span>
                         </div>
                         <p className="mt-12 text-slate-400 text-sm animate-pulse">Follow the rhythm...</p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center w-full">
                        {/* Instructor View (Self Camera + Instructions) */}
                        <div className="relative w-full aspect-[4/5] bg-black rounded-[32px] overflow-hidden border border-white/10 shadow-2xl">
                             <Webcam
                                audio={false}
                                className="absolute inset-0 w-full h-full object-cover opacity-60 mirror-mode"
                                videoConstraints={{ facingMode: "user" }}
                             />
                             <div className="absolute inset-0 flex flex-col justify-end p-6 bg-gradient-to-t from-black via-transparent to-transparent">
                                 <div className="bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                                     <h3 className="text-primary font-bold text-xs uppercase mb-2">Instruction</h3>
                                     <p className="text-lg font-bold leading-tight">
                                         {experiment.instructions[Math.floor(((experiment.durationSeconds - timeLeft) / experiment.durationSeconds) * experiment.instructions.length)] || experiment.instructions[experiment.instructions.length-1]}
                                     </p>
                                 </div>
                             </div>
                        </div>
                    </div>
                )}

                <button onClick={() => setView('verify')} className="mt-6 text-slate-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">
                    Skip Timer & Verify
                </button>
            </div>
        )}

        {/* --- VERIFY VIEW --- */}
        {view === 'verify' && (
            <div className="flex-1 flex flex-col p-8 animate-slide-up">
                 <h2 className="text-2xl font-bold text-white mb-2 text-center">Verification Required</h2>
                 <p className="text-slate-400 text-center mb-8 text-sm">Please record yourself performing the action for 3 seconds.</p>
                 
                 <div className="flex-1 relative bg-black rounded-[32px] overflow-hidden border border-white/10 shadow-2xl mb-8">
                      <Webcam
                          ref={webcamRef}
                          audio={false}
                          className="absolute inset-0 w-full h-full object-cover"
                          videoConstraints={{ facingMode: "user" }}
                      />
                      
                      {/* Recording UI */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          {prepTime > 0 ? (
                               <div className="text-6xl font-black text-white drop-shadow-lg animate-ping">
                                   {prepTime}
                               </div>
                          ) : isRecording ? (
                              <div className="w-24 h-24 rounded-full border-4 border-rose-500 flex items-center justify-center animate-pulse">
                                  <div className="w-20 h-20 bg-rose-500/20 rounded-full"></div>
                              </div>
                          ) : verifying ? (
                               <div className="flex flex-col items-center gap-4 bg-black/60 p-6 rounded-2xl backdrop-blur-md">
                                   <div className="w-12 h-12 border-4 border-t-emerald-500 rounded-full animate-spin"></div>
                                   <p className="font-bold text-sm uppercase tracking-widest">Verifying Proof...</p>
                               </div>
                          ) : (
                              <div className="w-64 h-64 border-2 border-white/30 rounded-full flex items-center justify-center border-dashed opacity-50">
                                  <p className="font-bold text-xs uppercase tracking-widest">Frame Subject Here</p>
                              </div>
                          )}
                      </div>
                 </div>

                 <button 
                   onClick={initVerification}
                   disabled={isRecording || verifying || prepTime > 0}
                   className={`w-full py-5 rounded-[24px] font-bold text-lg shadow-xl transition-all ${isRecording || prepTime > 0 ? 'bg-rose-500 text-white' : 'bg-white text-slate-900 hover:scale-[1.02]'}`}
                 >
                     {prepTime > 0 ? `Get Ready: ${prepTime}` : isRecording ? 'Recording...' : 'Record Proof'}
                 </button>
            </div>
        )}

        {/* --- RESULT VIEW --- */}
        {view === 'result' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 animate-fade-in text-center">
                 <div className={`w-32 h-32 rounded-full flex items-center justify-center text-6xl mb-6 shadow-2xl ${verificationResult?.success ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-rose-500/20 text-rose-400 border border-rose-500/50'}`}>
                     {verificationResult?.success ? '✨' : '🤔'}
                 </div>
                 
                 <h2 className="text-3xl font-bold text-white mb-2">{verificationResult?.success ? 'Experiment Complete' : 'Verification Failed'}</h2>
                 <p className="text-slate-300 text-lg mb-8 leading-relaxed max-w-sm">{verificationResult?.feedback}</p>

                 {verificationResult?.success ? (
                     <div className="bg-white/10 px-6 py-3 rounded-full border border-white/10 animate-bounce">
                         <span className="font-bold text-emerald-400">+50 XP</span> <span className="text-white ml-2">Vitality Boosted</span>
                     </div>
                 ) : (
                     <button onClick={() => setView('verify')} className="px-8 py-4 bg-white text-slate-900 rounded-full font-bold">Try Again</button>
                 )}
            </div>
        )}

    </div>
  );
};

export default ExperimentHub;
