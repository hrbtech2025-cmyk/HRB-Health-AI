
import React, { useState, useEffect, useRef } from 'react';

interface TourProps {
  onComplete: () => void;
  onChangeView: (view: string) => void;
}

const STEPS = [
  {
    targetId: 'tour-vitality-score',
    title: "Vitality Score",
    text: "This is your daily health pulse. It aggregates your sleep, mood, nutrition, and activity into a real-time score (0-100). Watch it evolve as you log data to understand your overall wellbeing.",
    view: 'dashboard',
  },
  {
    targetId: 'tour-meal-widget',
    title: "AI Nutrition Lens",
    text: "Forget manual calorie counting. Tap here to take a photo of your food. Hyprova's vision model identifies ingredients and estimates macros instantly to keep your nutrition on track.",
    view: 'dashboard',
  },
  {
    targetId: 'tour-experiment-widget',
    title: "Bio-Experiments",
    text: "Need a boost? This widget suggests quick, science-backed micro-habits—like a 60s breathing exercise or a stretch—tailored specifically to your current mood and energy levels.",
    view: 'dashboard',
  },
  {
    targetId: 'tour-quick-log',
    title: "Quick Log",
    text: "The core of Hyprova. Tap this button anytime to rapidly log symptoms, mood swings, hydration, or medications. The more you log, the smarter the AI predictions become.",
    view: 'dashboard',
  },
  {
    targetId: 'tour-nav-training',
    title: "Training Hub",
    text: "Your pocket performance coach. Generate custom workout plans based on the equipment you have, or use the camera to analyze your form and prevent injury.",
    view: 'dashboard',
  },
  {
    targetId: 'tour-cycle-widget',
    title: "Cycle Sync",
    text: "Align with your biology. Track your cycle phases to understand energy fluctuations and receive phase-specific lifestyle advice to optimize your performance.",
    view: 'dashboard',
    condition: () => !!document.getElementById('tour-cycle-widget') 
  },
  {
    targetId: 'tour-chat-nav',
    title: "Health Assistant",
    text: "Your personal health data detective. Chat with the AI to find correlations (e.g., 'Does coffee affect my sleep?') or ask health questions based on your unique history.",
    view: 'dashboard',
  }
];

const Tour: React.FC<TourProps> = ({ onComplete, onChangeView }) => {
  const [step, setStep] = useState(0);
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({ opacity: 0 });
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({ opacity: 0 });
  const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});
  
  const currentStepData = STEPS[step];

  // Disable Scroll Hook
  useEffect(() => {
    // Prevent scrolling
    document.body.style.overflow = 'hidden';
    
    // Cleanup
    return () => {
        document.body.style.overflow = '';
    };
  }, []);

  const updatePosition = () => {
    // Condition check for dynamic steps
    if (currentStepData.condition && !currentStepData.condition()) {
        handleNext();
        return;
    }

    const element = document.getElementById(currentStepData.targetId);

    if (element) {
      // Scroll to element first
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

      // Wait for scroll to settle/render
      setTimeout(() => {
        const rect = element.getBoundingClientRect();
        
        // Highlight Box dimensions
        const padding = 12; // Increased padding for better breathing room
        const hTop = rect.top - padding;
        const hLeft = rect.left - padding;
        const hWidth = rect.width + (padding * 2);
        const hHeight = rect.height + (padding * 2);

        setHighlightStyle({
          top: hTop,
          left: hLeft,
          width: hWidth,
          height: hHeight,
          opacity: 1,
          position: 'absolute',
          transition: 'all 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
        });

        // Tooltip Positioning Logic
        const tooltipWidth = 320;
        const gap = 24;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Decide Top or Bottom preference based on available space
        const spaceAbove = rect.top;
        const spaceBelow = viewportHeight - rect.bottom;
        const placeTop = spaceAbove > spaceBelow && spaceAbove > 250;

        let tTop = 0;
        let tLeft = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        
        // Constrain Left/Right to stay on screen
        if (tLeft < 20) tLeft = 20;
        if (tLeft + tooltipWidth > viewportWidth - 20) tLeft = viewportWidth - tooltipWidth - 20;

        // Set Top
        if (placeTop) {
            tTop = rect.top - padding - gap;
        } else {
            tTop = rect.bottom + padding + gap;
        }

        setTooltipStyle({
          top: tTop,
          left: tLeft,
          transform: placeTop ? 'translateY(-100%)' : 'translateY(0)',
          opacity: 1,
          position: 'absolute',
          width: tooltipWidth,
          transition: 'all 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
        });

        // Arrow Logic
        const elementCenter = rect.left + (rect.width / 2);
        const arrowX = elementCenter - tLeft;

        setArrowStyle({
            left: Math.max(16, Math.min(tooltipWidth - 16, arrowX)), 
            [placeTop ? 'bottom' : 'top']: -8, 
            transform: 'translateX(-50%) rotate(45deg)',
        });

      }, 500); 
    } else {
       console.warn("Tour element not found:", currentStepData.targetId);
       // Skip if element missing in DOM (safety)
       if (step < STEPS.length - 1) handleNext();
       else onComplete();
    }
  };

  useEffect(() => {
    if (currentStepData.view) {
        onChangeView(currentStepData.view);
    }
    const t = setTimeout(updatePosition, 100);
    
    window.addEventListener('resize', updatePosition);
    return () => {
        window.removeEventListener('resize', updatePosition);
        clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(s => s - 1);
    }
  };

  return (
    // Changed pointer-events-none to auto to block clicks on underlying app
    // Added z-index to stay above everything
    <div className="fixed inset-0 z-[100] overflow-hidden pointer-events-auto font-sans">
      
      {/* Blocking Backdrop to prevent interaction with the app */}
      <div className="absolute inset-0 bg-transparent cursor-default" onClick={(e) => e.stopPropagation()}></div>

      {/* Highlight Box with "Hole" Effect via Shadow */}
      <div 
        className="rounded-[24px] border-2 border-white/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.85)] pointer-events-none z-10 transition-all duration-500 ease-in-out"
        style={highlightStyle}
      >
        <div className="absolute inset-0 rounded-[22px] animate-pulse-slow bg-white/10"></div>
        {/* Accents */}
        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-400 rounded-tl-xl"></div>
        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-400 rounded-tr-xl"></div>
        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-400 rounded-bl-xl"></div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-400 rounded-br-xl"></div>
      </div>

      {/* Tooltip Bubble */}
      <div 
        className={`bg-white/95 backdrop-blur-2xl dark:bg-slate-800/95 p-6 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-white/20 dark:border-white/10 pointer-events-auto z-20 flex flex-col transition-all duration-500`}
        style={tooltipStyle}
      >
         {/* Arrow */}
         <div 
            className="absolute w-4 h-4 bg-white/95 dark:bg-slate-800/95 border-l border-t border-white/20 dark:border-white/10"
            style={{ 
                ...arrowStyle, 
                borderTopColor: arrowStyle.bottom ? undefined : 'transparent',
                borderLeftColor: arrowStyle.bottom ? undefined : 'transparent',
                borderBottomColor: arrowStyle.top ? undefined : 'transparent',
                borderRightColor: arrowStyle.top ? undefined : 'transparent',
                backgroundColor: 'inherit'
            }}
         ></div>

         <div className="flex justify-between items-start mb-3">
             <div className="flex items-center gap-2">
                 <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                    {step + 1}
                 </span>
                 <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-none">{currentStepData.title}</h3>
             </div>
             <button onClick={onComplete} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 uppercase tracking-widest p-1">Skip</button>
         </div>
         
         <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-8 font-medium">
           {currentStepData.text}
         </p>
         
         <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100 dark:border-white/5">
            <div className="flex gap-1">
                {STEPS.map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === step ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-600'}`}></div>
                ))}
            </div>
            
            <div className="flex gap-3">
                {step > 0 && (
                    <button 
                        onClick={handleBack} 
                        className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                    >
                        Back
                    </button>
                )}
                <button 
                    onClick={handleNext} 
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-500/30 active:scale-95 transition-all"
                >
                    {step === STEPS.length - 1 ? "Get Started" : "Next"}
                </button>
            </div>
         </div>
      </div>

    </div>
  );
};

export default Tour;
