
import React, { useState } from 'react';
import { LogEntry, Mood } from '../types';

interface LogInputProps {
  userMeds: string[];
  gender?: string;
  isFirstLog?: boolean;
  onSave: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  onClose: () => void;
}

const SYMPTOMS_LIST = ['Headache', 'Nausea', 'Anxiety', 'Fatigue', 'Back Pain', 'Bloating', 'Insomnia', 'Soreness', 'Fog', 'Cramps', 'Dizziness'];
const SLEEP_TAGS = ['Trouble falling asleep', 'Woke up often', 'Vivid dreams', 'Nightmare', 'Slept through', 'Woke up early', 'Overslept'];
const TAGS_LIST = [
  'Work', 'School', 'Study', 'Home', 'Gym', 'Walk', 
  'Social', 'Family', 'Partner', 'Date',
  'Gaming', 'TV/Movies', 'Reading', 'Creative',
  'Travel', 'Commute', 'Outdoors', 
  'Therapy', 'Doctor', 'Period', 'Sick'
];

const LogInput: React.FC<LogInputProps> = ({ userMeds, gender, isFirstLog, onSave, onClose }) => {
  const [step, setStep] = useState(1);
  const [mood, setMood] = useState<Mood>(Mood.Neutral);
  const [energy, setEnergy] = useState(5);
  const [stress, setStress] = useState(3);
  const [sleep, setSleep] = useState(7);
  const [hydration, setHydration] = useState(4);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedMeds, setSelectedMeds] = useState<string[]>([]);
  
  // Enhanced Sleep State
  const [sleepQuality, setSleepQuality] = useState<'Poor' | 'Fair' | 'Good' | 'Excellent'>('Good');
  const [feltRested, setFeltRested] = useState<boolean>(true);
  const [selectedSleepTags, setSelectedSleepTags] = useState<string[]>([]);
  
  // Menstruation State
  const [flow, setFlow] = useState<string | null>(null);

  const toggleItem = (item: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleSave = () => {
    // Combine general tags with sleep tags for the AI context
    const allTags = [...selectedTags, ...selectedSleepTags];
    
    // Create a detailed note string for AI context if specific sleep data exists
    const sleepNote = `Sleep Quality: ${sleepQuality}, Felt Rested: ${feltRested ? 'Yes' : 'No'}.`;

    onSave({
      mood,
      energyLevel: energy,
      stressLevel: stress,
      sleepHours: sleep,
      hydrationCups: hydration,
      symptoms: selectedSymptoms,
      tags: allTags,
      medicationsTaken: selectedMeds,
      menstruation: flow ? { flow: flow as any } : undefined,
      notes: sleepNote // Inject sleep details into notes for AI processing
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in pointer-events-auto transition-opacity duration-300" onClick={onClose}></div>

      {/* Modal Sheet */}
      <div className="w-full max-w-md bg-white/95 dark:bg-[#131B2E]/95 backdrop-blur-2xl rounded-t-[40px] p-8 shadow-2xl shadow-black/20 border-t border-white/60 dark:border-white/10 animate-slide-up pointer-events-auto max-h-[94vh] overflow-y-auto hide-scrollbar pb-10 relative">
        
        {/* Handle Bar */}
        <div className="w-12 h-1.5 bg-slate-200/80 dark:bg-slate-700 rounded-full mx-auto mb-6 cursor-grab active:cursor-grabbing"></div>

        {/* First Log Welcome Banner */}
        {isFirstLog && (
          <div className="mb-6 p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-2.5 animate-fade-in">
            <span className="text-lg">👋</span>
            <span>Welcome! Log your first check-in below to calibrate your baseline Vitality Score.</span>
          </div>
        )}

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mb-8">
           {[1, 2, 3].map(i => (
             <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ease-out ${step === i ? 'w-8 bg-slate-900 dark:bg-white' : 'w-1.5 bg-slate-200 dark:bg-slate-700'}`}></div>
           ))}
        </div>

        <div className="min-h-[450px] flex flex-col">
          
          {/* Step 1: Vitals */}
          {step === 1 && (
            <div className="space-y-10 animate-fade-in">
              
              {/* Mood Selector */}
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">How are you feeling?</h2>
                <div className="flex justify-between items-end px-1 h-24">
                  {[
                    { val: Mood.Terrible, icon: '😫', label: 'Bad', color: 'bg-rose-100 text-rose-500 ring-rose-200' },
                    { val: Mood.Bad, icon: '🙁', label: 'Low', color: 'bg-orange-100 text-orange-500 ring-orange-200' },
                    { val: Mood.Neutral, icon: '😐', label: 'Okay', color: 'bg-slate-100 text-slate-500 ring-slate-200' },
                    { val: Mood.Good, icon: '🙂', label: 'Good', color: 'bg-emerald-100 text-emerald-500 ring-emerald-200' },
                    { val: Mood.Excellent, icon: '🤩', label: 'Great', color: 'bg-indigo-100 text-indigo-500 ring-indigo-200' },
                  ].map((m) => (
                    <button
                      key={m.val}
                      onClick={() => setMood(m.val)}
                      className={`group flex flex-col items-center gap-3 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] outline-none ${
                        mood === m.val 
                          ? 'scale-125 -translate-y-4' 
                          : 'scale-100 opacity-60 hover:opacity-100 hover:-translate-y-1 active:scale-90'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-3xl shadow-sm transition-all duration-300 ${mood === m.val ? `${m.color} shadow-lg ring-4 ring-white` : 'bg-transparent grayscale'}`}>
                        {m.icon}
                      </div>
                      {mood === m.val && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-900 animate-fade-in absolute -bottom-6">{m.label}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders - Using Custom CSS from index.html */}
              <div className="space-y-8 px-1 pt-4">
                 {/* Energy */}
                 <div className="space-y-3 group">
                  <div className="flex justify-between items-end transition-transform duration-300 group-hover:translate-x-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <span className="text-lg">⚡</span> Energy
                    </label>
                    <span className="text-xl font-black text-slate-900 tabular-nums">{energy}</span>
                  </div>
                  <input 
                    type="range" min="1" max="10" value={energy} 
                    onChange={(e) => setEnergy(parseInt(e.target.value))}
                    className="accent-amber-500 transition-all hover:brightness-110 active:cursor-grabbing"
                  />
                </div>

                {/* Stress */}
                <div className="space-y-3 group">
                  <div className="flex justify-between items-end transition-transform duration-300 group-hover:translate-x-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <span className="text-lg">😰</span> Stress
                    </label>
                    <span className="text-xl font-black text-slate-900 tabular-nums">{stress}</span>
                  </div>
                  <input 
                    type="range" min="1" max="10" value={stress} 
                    onChange={(e) => setStress(parseInt(e.target.value))}
                    className="accent-rose-500 transition-all hover:brightness-110 active:cursor-grabbing"
                  />
                </div>
                
                {/* Sleep Expanded Section - Streamlined */}
                <div className="space-y-4 bg-indigo-50/60 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                  {/* Hours Slider */}
                  <div className="space-y-2 group">
                    <div className="flex justify-between items-end">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <span className="text-base">😴</span> Sleep Duration
                      </label>
                      <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                        {sleep}<span className="text-xs font-bold text-slate-400 ml-1">hrs</span>
                      </span>
                    </div>
                    <input 
                      type="range" min="0" max="14" step="0.5" value={sleep} 
                      onChange={(e) => setSleep(parseFloat(e.target.value))}
                      className="accent-indigo-500 transition-all hover:brightness-110 active:cursor-grabbing"
                    />
                  </div>

                  {/* Quality & Rested - Streamlined Layout */}
                  <div className="space-y-3 pt-1">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">Sleep Quality</span>
                      <div className="grid grid-cols-4 gap-1.5 bg-slate-100/80 dark:bg-white/5 p-1 rounded-xl">
                        {(['Poor', 'Fair', 'Good', 'Optimal'] as const).map(q => (
                          <button 
                            key={q} 
                            type="button"
                            onClick={() => setSleepQuality(q === 'Optimal' ? 'Excellent' : q as any)}
                            className={`py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                              (q === 'Optimal' && sleepQuality === 'Excellent') || sleepQuality === q 
                                ? 'bg-indigo-600 text-white shadow-sm scale-[1.02]' 
                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Woke Up Feeling:</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setFeltRested(true)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                            feltRested
                              ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/20'
                              : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'
                          }`}
                        >
                          <span>☀️</span>
                          <span>Rested</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFeltRested(false)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                            !feltRested
                              ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/20'
                              : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'
                          }`}
                        >
                          <span>🥱</span>
                          <span>Tired</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Specific Sleep Tags - Streamlined Chips */}
                  <div className="pt-2 border-t border-indigo-100/50 dark:border-white/5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Sleep Patterns</span>
                    <div className="flex flex-wrap gap-1.5">
                      {SLEEP_TAGS.map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleItem(tag, selectedSleepTags, setSelectedSleepTags)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${
                            selectedSleepTags.includes(tag) 
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                              : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-indigo-300'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Hydration */}
                <div className="space-y-3 group">
                  <div className="flex justify-between items-end transition-transform duration-300 group-hover:translate-x-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <span className="text-lg">💧</span> Hydration
                    </label>
                    <span className="text-xl font-black text-slate-900 tabular-nums">{hydration}<span className="text-sm font-bold text-slate-400 ml-1">cups</span></span>
                  </div>
                  <input 
                    type="range" min="0" max="16" step="1" value={hydration} 
                    onChange={(e) => setHydration(parseInt(e.target.value))}
                    className="accent-cyan-500 transition-all hover:brightness-110 active:cursor-grabbing"
                  />
                </div>

                {/* Menstruation Flow (Female Only) */}
                {gender === 'Female' && (
                  <div className="space-y-3 group pt-4 border-t border-slate-100">
                     <div className="flex justify-between items-end">
                       <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <span className="text-lg">🌸</span> Cycle Flow
                       </label>
                       <span className="text-sm font-bold text-slate-900">{flow || 'None'}</span>
                     </div>
                     <div className="flex justify-between gap-2">
                       {['Spotting', 'Light', 'Medium', 'Heavy'].map(f => (
                         <button
                           key={f}
                           onClick={() => setFlow(flow === f ? null : f)}
                           className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all border shadow-sm ${
                              flow === f 
                              ? 'bg-pink-500 text-white border-pink-500 shadow-md transform scale-105' 
                              : 'bg-white border-slate-100 text-slate-500 hover:border-pink-300 hover:text-pink-500'
                           }`}
                         >
                           {f}
                         </button>
                       ))}
                     </div>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setStep(2)}
                className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[24px] font-bold text-lg shadow-xl shadow-slate-900/20 hover:bg-slate-800 dark:hover:bg-slate-100 hover:shadow-2xl hover:-translate-y-1 active:scale-95 transition-all duration-300 mt-4"
              >
                Next Step
              </button>
            </div>
          )}

          {/* Step 2: Symptoms & Meds */}
          {step === 2 && (
            <div className="space-y-10 animate-fade-in flex-1 flex flex-col">
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Symptoms</h2>
                <div className="flex flex-wrap gap-2">
                  {SYMPTOMS_LIST.map(s => (
                    <button
                      key={s}
                      onClick={() => toggleItem(s, selectedSymptoms, setSelectedSymptoms)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 border relative overflow-hidden active:scale-90 ${
                        selectedSymptoms.includes(s) 
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 shadow-md ring-2 ring-rose-100 dark:ring-rose-900/40 ring-offset-1 scale-105' 
                          : 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:border-slate-200 hover:shadow-sm'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {userMeds.length > 0 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Medications</h2>
                  <div className="flex flex-wrap gap-2">
                    {userMeds.map(m => (
                      <button
                        key={m}
                        onClick={() => toggleItem(m, selectedMeds, setSelectedMeds)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 border active:scale-90 ${
                          selectedMeds.includes(m) 
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-300 shadow-md ring-2 ring-emerald-100 dark:ring-emerald-900/40 ring-offset-1 scale-105' 
                            : 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:border-slate-200 hover:shadow-sm'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-auto">
                <button onClick={() => setStep(1)} className="px-6 rounded-[24px] bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-white/20 hover:text-slate-800 dark:hover:text-white transition-all active:scale-95">Back</button>
                <button onClick={() => setStep(3)} className="flex-1 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[24px] font-bold text-lg shadow-xl shadow-slate-900/20 hover:bg-slate-800 dark:hover:bg-slate-100 hover:shadow-2xl hover:-translate-y-1 active:scale-95 transition-all duration-300">Continue</button>
              </div>
            </div>
          )}

          {/* Step 3: Context */}
          {step === 3 && (
            <div className="space-y-10 animate-fade-in flex-1 flex flex-col">
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Activities</h2>
                <div className="flex flex-wrap gap-2">
                  {TAGS_LIST.map(t => (
                    <button
                      key={t}
                      onClick={() => toggleItem(t, selectedTags, setSelectedTags)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 border active:scale-90 ${
                        selectedTags.includes(t) 
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 shadow-md ring-2 ring-indigo-100 dark:ring-indigo-900/40 ring-offset-1 scale-105' 
                          : 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 hover:border-slate-200 hover:shadow-sm'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-auto">
                <button onClick={() => setStep(2)} className="px-6 rounded-[24px] bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-white/20 hover:text-slate-800 dark:hover:text-white transition-all active:scale-95">Back</button>
                <button 
                  onClick={handleSave}
                  className="flex-1 py-5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-[24px] font-bold text-lg shadow-xl shadow-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/40 hover:-translate-y-1 active:scale-95 transition-all duration-300 relative overflow-hidden group"
                >
                  <span className="relative z-10">Save Log</span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default LogInput;
