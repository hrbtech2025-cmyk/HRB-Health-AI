import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
  initialProfile?: UserProfile | null;
}

const GOAL_OPTIONS = [
  { id: 'mood', label: 'Improve Mood', icon: '🧠', color: 'bg-purple-50 text-purple-600 border-purple-100' },
  { id: 'sleep', label: 'Better Sleep', icon: '😴', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  { id: 'energy', label: 'Increase Energy', icon: '⚡', color: 'bg-yellow-50 text-yellow-600 border-yellow-100' },
  { id: 'anxiety', label: 'Reduce Anxiety', icon: '🧘', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  { id: 'fitness', label: 'Physical Fitness', icon: '💪', color: 'bg-orange-50 text-orange-600 border-orange-100' },
  { id: 'symptoms', label: 'Track Symptoms', icon: '🤒', color: 'bg-red-50 text-red-600 border-red-100' },
  { id: 'weight', label: 'Manage Weight', icon: '⚖️', color: 'bg-cyan-50 text-cyan-600 border-cyan-100' },
  { id: 'focus', label: 'Boost Focus', icon: '🚀', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
];

const FITNESS_LEVELS = [
  { id: 'Sedentary', label: 'Sedentary', desc: 'Little to no regular exercise' },
  { id: 'Lightly Active', label: 'Lightly Active', desc: 'Light exercise 1-3 days/week' },
  { id: 'Moderately Active', label: 'Moderately Active', desc: 'Moderate exercise 3-5 days/week' },
  { id: 'Very Active', label: 'Very Active', desc: 'Hard exercise 6-7 days/week' },
  { id: 'Athlete', label: 'Athlete', desc: 'Physical job or 2x training/day' },
];

const DIET_OPTIONS = ['None', 'Vegetarian', 'Vegan', 'Keto', 'Paleo', 'Gluten-Free', 'Dairy-Free', 'Pescatarian', 'Halal', 'Kosher'];

const COMMON_CONDITIONS = ['Migraines', 'IBS', 'Anxiety', 'Depression', 'Hypertension', 'Diabetes', 'Asthma', 'Insomnia'];
const COMMON_MEDS = ['Vitamin D', 'Magnesium', 'Ibuprofen', 'Melatonin', 'Sertraline', 'Lisinopril', 'Multivitamin'];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, initialProfile }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(initialProfile?.name || '');
  const [age, setAge] = useState<string>(initialProfile?.age?.toString() || '');
  const [gender, setGender] = useState(initialProfile?.gender || '');
  const [selectedGoals, setSelectedGoals] = useState<string[]>(initialProfile?.goals || []);
  const [conditions, setConditions] = useState(initialProfile?.conditions.join(', ') || '');
  const [medications, setMedications] = useState(initialProfile?.medications.join(', ') || '');
  
  // New State Fields
  const [fitnessLevel, setFitnessLevel] = useState<any>(initialProfile?.fitnessLevel || 'Moderately Active');
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>(initialProfile?.dietaryPreferences || []);
  
  // Transition State
  const [isExiting, setIsExiting] = useState(false);
  const TOTAL_STEPS = 7;

  const nextStep = (targetStep?: number) => {
    setIsExiting(true);
    setTimeout(() => {
      setStep(targetStep || step + 1);
      setIsExiting(false);
    }, 300);
  };

  const toggleGoal = (id: string) => {
    if (selectedGoals.includes(id)) {
      setSelectedGoals(selectedGoals.filter(g => g !== id));
    } else {
      setSelectedGoals([...selectedGoals, id]);
    }
  };

  const toggleDiet = (diet: string) => {
    if (dietaryPreferences.includes(diet)) {
      setDietaryPreferences(dietaryPreferences.filter(d => d !== diet));
    } else {
      setDietaryPreferences([...dietaryPreferences, diet]);
    }
  };

  const addChip = (text: string, current: string, setter: (s: string) => void) => {
    const parts = current.split(',').map(s => s.trim()).filter(s => s);
    if (!parts.includes(text)) {
      setter([...parts, text].join(', '));
    }
  };

  const handleFinish = () => {
    nextStep(TOTAL_STEPS); // Go to processing screen
    
    setTimeout(() => {
      const profile: UserProfile = {
        name: name || 'Friend',
        age: parseInt(age) || undefined,
        gender: gender,
        goals: selectedGoals,
        conditions: conditions.split(',').map(c => c.trim()).filter(c => c.length > 0),
        medications: medications.split(',').map(m => m.trim()).filter(m => m.length > 0),
        fitnessLevel: fitnessLevel,
        dietaryPreferences: dietaryPreferences,
        onboardingComplete: true,
      };
      onComplete(profile);
    }, 2500); // Fake processing time
  };

  return (
    <div className="fixed inset-0 bg-slate-50 z-[100] flex flex-col overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-noise opacity-30 z-0"></div>
      <div className="absolute -top-[15%] -left-[10%] w-[80%] h-[80%] rounded-full bg-hrb-gold/80 blur-[100px] animate-blob mix-blend-multiply"></div>
      <div className="absolute top-[20%] -right-[15%] w-[70%] h-[70%] rounded-full bg-primary/80 blur-[100px] animate-blob animation-delay-2000 mix-blend-multiply"></div>
      
      {/* Progress Bar */}
      <div className="relative z-20 w-full px-6 pt-10 pb-4">
        <div className="flex justify-between items-end mb-2">
           <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Hyprova Setup</span>
           <span className="text-[10px] font-bold text-slate-500">{step < TOTAL_STEPS ? `Step ${step} of ${TOTAL_STEPS - 1}` : 'Finalizing'}</span>
        </div>
        <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
           <div 
             className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
             style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
           ></div>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col w-full max-w-lg mx-auto p-6 overflow-y-auto hide-scrollbar">
        
        {/* Step 1: Identity */}
        {step === 1 && (
          <div className={`flex-1 flex flex-col justify-center transition-all duration-300 ${isExiting ? 'opacity-0 -translate-x-4' : 'opacity-100 animate-slide-up'}`}>
            <div className="mb-10">
              <h1 className="text-5xl font-light text-slate-900 mb-4 leading-[1.1] tracking-tighter">
                {initialProfile ? 'Welcome back.' : 'Hello.'} <br/><span className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-hrb-navy to-primary">{initialProfile ? 'Update details?' : 'Who are you?'}</span>
              </h1>
              <p className="text-slate-600 text-lg font-medium">We'd love to know what to call you.</p>
            </div>
            
            <div className="space-y-6">
               <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider group-focus-within:text-primary transition-colors">First Name</label>
               <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                className="w-full text-3xl font-bold border-b-2 border-slate-300 outline-none py-3 bg-transparent placeholder-slate-400 text-slate-900 transition-all duration-300 focus:border-primary focus:pl-2"
                autoFocus
              />
            </div>

            <div className="mt-auto">
              <button 
                disabled={!name.trim()}
                onClick={() => nextStep()}
                className="w-full py-5 bg-hrb-navy text-white rounded-[20px] font-bold text-lg shadow-xl shadow-slate-900/20 hover:bg-blue-900 hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 transition-all duration-300 ease-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Continue <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Demographics */}
        {step === 2 && (
          <div className={`flex-1 flex flex-col transition-all duration-300 ${isExiting ? 'opacity-0 -translate-x-4' : 'opacity-100 animate-slide-up'}`}>
             <div className="mb-8 mt-4">
               <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">A bit about you.</h1>
               <p className="text-slate-600 font-medium">This helps our AI tailor health predictions to your physiology.</p>
            </div>
            
            <div className="space-y-8">
               <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider">Age</label>
                  <input 
                    type="number" 
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 28"
                    className="w-full p-5 rounded-2xl bg-white/60 border border-slate-200 outline-none text-xl font-bold text-slate-900 placeholder-slate-400 transition-all duration-300 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 focus:shadow-xl focus:-translate-y-1"
                  />
               </div>

               <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider">Gender Identity</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Female', 'Male', 'Other'].map((g) => (
                      <button
                        key={g}
                        onClick={() => setGender(g)}
                        className={`py-4 rounded-xl font-bold text-sm border transition-all duration-300 active:scale-95 ${gender === g ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30 scale-105' : 'bg-white text-slate-600 border-slate-200 hover:border-primary/50 hover:text-primary hover:shadow-md hover:-translate-y-0.5'}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
               </div>
            </div>
            
            <div className="mt-auto pt-8">
              <button 
                onClick={() => nextStep()}
                className="w-full py-5 bg-hrb-navy text-white rounded-[20px] font-bold text-lg shadow-xl shadow-slate-900/20 hover:bg-blue-900 hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 transition-all duration-300 ease-out"
              >
                Next Step
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Lifestyle (Fitness & Diet) */}
        {step === 3 && (
          <div className={`flex-1 flex flex-col transition-all duration-300 ${isExiting ? 'opacity-0 -translate-x-4' : 'opacity-100 animate-slide-up'}`}>
            <div className="mb-6 mt-2">
              <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Lifestyle</h1>
              <p className="text-slate-600 font-medium">Help us understand your activity and nutrition needs.</p>
            </div>

            <div className="space-y-8 flex-1">
                {/* Fitness Level */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider">Fitness Level</label>
                  <div className="flex flex-col gap-2">
                    {FITNESS_LEVELS.map((level) => (
                      <button
                        key={level.id}
                        onClick={() => setFitnessLevel(level.id)}
                        className={`p-3 rounded-xl border text-left transition-all duration-200 active:scale-[0.98] flex items-center justify-between ${
                          fitnessLevel === level.id 
                            ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                            : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <span className={`block text-sm font-bold ${fitnessLevel === level.id ? 'text-indigo-700' : 'text-slate-700'}`}>{level.label}</span>
                          <span className="block text-[10px] text-slate-500">{level.desc}</span>
                        </div>
                        {fitnessLevel === level.id && <span className="text-indigo-600 font-bold">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Diet */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider">Dietary Preferences</label>
                  <div className="flex flex-wrap gap-2">
                    {DIET_OPTIONS.map((diet) => (
                      <button
                        key={diet}
                        onClick={() => toggleDiet(diet)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all duration-200 ${
                          dietaryPreferences.includes(diet)
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {diet}
                      </button>
                    ))}
                  </div>
                </div>
            </div>

            <div className="mt-8">
              <button 
                onClick={() => nextStep()}
                className="w-full py-5 bg-hrb-navy text-white rounded-[20px] font-bold text-lg shadow-xl shadow-slate-900/20 hover:bg-blue-900 hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 transition-all duration-300 ease-out"
              >
                Next Step
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Goals */}
        {step === 4 && (
          <div className={`flex-1 flex flex-col transition-all duration-300 ${isExiting ? 'opacity-0 -translate-x-4' : 'opacity-100 animate-slide-up'}`}>
             <div className="mb-6 mt-2">
               <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Your Focus</h1>
               <p className="text-slate-600 font-medium">Select what matters most to you right now.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-8">
              {GOAL_OPTIONS.map((opt, idx) => (
                <button
                  key={opt.id}
                  onClick={() => toggleGoal(opt.label)}
                  className={`p-4 rounded-[20px] text-left transition-all duration-300 border relative overflow-hidden group active:scale-95 ${
                    selectedGoals.includes(opt.label)
                      ? 'border-primary bg-white shadow-lg shadow-primary/10 ring-1 ring-primary/50 scale-[1.02]'
                      : 'border-transparent bg-white/50 shadow-sm hover:bg-white hover:shadow-md hover:scale-[1.01]'
                  }`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className={`w-10 h-10 rounded-xl ${opt.color} border flex items-center justify-center text-xl transition-transform duration-300 group-hover:scale-110`}>
                      {opt.icon}
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors duration-300 ${selectedGoals.includes(opt.label) ? 'bg-primary border-primary' : 'border-slate-200 group-hover:border-primary/50'}`}>
                       {selectedGoals.includes(opt.label) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                  </div>
                  <span className={`font-bold text-sm block tracking-tight transition-colors ${selectedGoals.includes(opt.label) ? 'text-primary' : 'text-slate-700 group-hover:text-slate-900'}`}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
            
            <button 
              disabled={selectedGoals.length === 0}
              onClick={() => nextStep()}
              className="mt-auto w-full py-5 bg-hrb-navy text-white rounded-[20px] font-bold text-lg shadow-xl shadow-slate-900/20 hover:bg-blue-900 hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 transition-all duration-300 ease-out disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 5: Medical History */}
        {step === 5 && (
          <div className={`flex-1 flex flex-col transition-all duration-300 ${isExiting ? 'opacity-0 -translate-x-4' : 'opacity-100 animate-slide-up'}`}>
             <div className="mb-6 mt-2">
              <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Health Profile</h1>
              <p className="text-slate-600 font-medium">Do you manage any chronic conditions?</p>
            </div>
            
            <div className="space-y-4">
               <div className="bg-white p-1 rounded-[24px] shadow-sm border border-slate-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 focus-within:shadow-xl transition-all duration-300">
                  <textarea 
                    value={conditions}
                    onChange={(e) => setConditions(e.target.value)}
                    placeholder="Type here (e.g. Migraines, IBS)..."
                    className="w-full h-32 p-4 bg-transparent outline-none text-lg text-slate-800 placeholder-slate-400 resize-none"
                  />
               </div>
               
               <div>
                 <p className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-3">Common Conditions</p>
                 <div className="flex flex-wrap gap-2">
                   {COMMON_CONDITIONS.map(c => (
                     <button 
                       key={c}
                       onClick={() => addChip(c, conditions, setConditions)}
                       className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 hover:text-slate-900 hover:-translate-y-0.5 hover:shadow-sm active:scale-95 transition-all duration-200"
                     >
                       + {c}
                     </button>
                   ))}
                 </div>
               </div>
            </div>

            <div className="mt-auto">
              <button 
                onClick={() => nextStep()}
                className="w-full py-5 bg-hrb-navy text-white rounded-[20px] font-bold text-lg shadow-xl shadow-slate-900/20 hover:bg-blue-900 hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 transition-all duration-300 ease-out"
              >
                {conditions.trim() ? 'Next' : 'Skip / None'}
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Meds */}
        {step === 6 && (
           <div className={`flex-1 flex flex-col transition-all duration-300 ${isExiting ? 'opacity-0 -translate-x-4' : 'opacity-100 animate-slide-up'}`}>
             <div className="mb-6 mt-2">
              <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Medications</h1>
              <p className="text-slate-600 font-medium">Supplements or prescriptions you take regularly.</p>
            </div>
            
            <div className="space-y-4">
               <div className="bg-white p-1 rounded-[24px] shadow-sm border border-slate-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 focus-within:shadow-xl transition-all duration-300">
                  <textarea 
                    value={medications}
                    onChange={(e) => setMedications(e.target.value)}
                    placeholder="Type here (e.g. Vitamin D, Sertraline)..."
                    className="w-full h-32 p-4 bg-transparent outline-none text-lg text-slate-800 placeholder-slate-400 resize-none"
                  />
               </div>
               
               <div>
                 <p className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-3">Frequently Added</p>
                 <div className="flex flex-wrap gap-2">
                   {COMMON_MEDS.map(m => (
                     <button 
                       key={m}
                       onClick={() => addChip(m, medications, setMedications)}
                       className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 hover:text-slate-900 hover:-translate-y-0.5 hover:shadow-sm active:scale-95 transition-all duration-200"
                     >
                       + {m}
                     </button>
                   ))}
                 </div>
               </div>
            </div>

            <button 
              onClick={handleFinish}
              className="mt-auto w-full py-5 bg-gradient-to-r from-primary to-hrb-gold text-white rounded-[20px] font-bold text-lg shadow-xl shadow-primary/30 active:scale-[0.98] active:translate-y-0 transition-all duration-300 ease-out flex justify-center items-center gap-3 hover:shadow-2xl hover:-translate-y-1 hover:shadow-primary/50"
            >
              <span>✨</span> {initialProfile ? 'Update Profile' : 'Create Profile'}
            </button>
          </div>
        )}

        {/* Step 7: Loading */}
        {step === TOTAL_STEPS && (
          <div className="flex-1 flex flex-col items-center justify-center animate-fade-in text-center">
             <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 bg-hrb-gold/20 rounded-full animate-ping"></div>
                <div className="relative w-full h-full bg-white rounded-full shadow-xl flex items-center justify-center text-4xl">
                  🧬
                </div>
             </div>
             <h2 className="text-2xl font-bold text-slate-900 mb-2">Personalizing Hyprova...</h2>
             <p className="text-slate-600 max-w-[200px]">Calibrating AI models for {name}.</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default Onboarding;