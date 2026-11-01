import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';

interface TourProps {
  onComplete: () => void;
  onChangeView: (view: string) => void;
}

interface TourStep {
  targetId: string;
  title: string;
  text: string;
  view: string;
  condition?: () => boolean;
}

const RAW_STEPS: TourStep[] = [
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
  // Filter steps dynamically based on what exists or conditions
  const [activeSteps, setActiveSteps] = useState<TourStep[]>(() => 
    RAW_STEPS.filter(s => !s.condition || s.condition())
  );
  const [step, setStep] = useState(0);

  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({ opacity: 0 });
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({ opacity: 0 });
  const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});
  const [arrowPlacement, setArrowPlacement] = useState<'top' | 'bottom'>('top');

  const tooltipRef = useRef<HTMLDivElement>(null);

  // Re-check conditions on mount
  useEffect(() => {
    setActiveSteps(RAW_STEPS.filter(s => !s.condition || s.condition()));
  }, []);

  const currentStepData = activeSteps[step] || activeSteps[0];

  // Disable background scrolling while tour is active
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const updatePosition = useCallback(() => {
    if (!currentStepData) return;

    const element = document.getElementById(currentStepData.targetId);

    if (!element) {
      // Element not found - skip to next step safely
      if (step < activeSteps.length - 1) {
        setStep(s => s + 1);
      } else {
        onComplete();
      }
      return;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Smart scrolling: if element is inside scrollable container, scroll with generous margin
    const mainContainer = document.querySelector('main');
    if (mainContainer && mainContainer.contains(element)) {
      const containerRect = mainContainer.getBoundingClientRect();
      const elemRect = element.getBoundingClientRect();
      
      // If not already comfortably visible
      const isComfortable = elemRect.top >= containerRect.top + 60 && elemRect.bottom <= containerRect.bottom - 220;
      if (!isComfortable) {
        // Scroll so element sits nicely in upper third of view, giving ample room below for tooltip
        const targetScrollTop = Math.max(0, element.offsetTop - 80);
        mainContainer.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        });
      }
    } else {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Measure after scroll has a moment to settle
    const measureTimer = setTimeout(() => {
      const rect = element.getBoundingClientRect();

      // Highlight Box dimensions
      const padding = 10;
      const hTop = Math.max(4, rect.top - padding);
      const hLeft = Math.max(4, rect.left - padding);
      const hWidth = rect.width + padding * 2;
      const hHeight = rect.height + padding * 2;

      setHighlightStyle({
        top: hTop,
        left: hLeft,
        width: hWidth,
        height: hHeight,
        opacity: 1,
        position: 'fixed',
        transition: 'all 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)',
      });

      // Tooltip dimensions
      const tooltipEl = tooltipRef.current;
      const tooltipWidth = Math.min(330, viewportWidth - 32);
      const tooltipHeight = tooltipEl ? tooltipEl.offsetHeight : 200;
      const gap = 16;

      const spaceAbove = rect.top - padding;
      const spaceBelow = viewportHeight - (rect.bottom + padding);

      // Prefer bottom if there's enough room (at least tooltipHeight + 20px)
      // Otherwise use top if it fits better
      let placeOnTop = false;
      if (spaceBelow >= tooltipHeight + gap) {
        placeOnTop = false;
      } else if (spaceAbove >= tooltipHeight + gap) {
        placeOnTop = true;
      } else {
        // Fall back to whichever side has more space
        placeOnTop = spaceAbove > spaceBelow;
      }

      let idealTop = 0;
      if (placeOnTop) {
        idealTop = rect.top - padding - gap - tooltipHeight;
      } else {
        idealTop = rect.bottom + padding + gap;
      }

      // Hard clamp so the card NEVER overflows the viewport top or bottom
      const minTop = 16;
      const maxTop = Math.max(minTop, viewportHeight - tooltipHeight - 16);
      const clampedTop = Math.max(minTop, Math.min(maxTop, idealTop));

      // Horizontal positioning centered on the element
      const elementCenter = rect.left + rect.width / 2;
      let idealLeft = elementCenter - tooltipWidth / 2;
      const minLeft = 16;
      const maxLeft = Math.max(minLeft, viewportWidth - tooltipWidth - 16);
      const clampedLeft = Math.max(minLeft, Math.min(maxLeft, idealLeft));

      setTooltipStyle({
        top: clampedTop,
        left: clampedLeft,
        width: tooltipWidth,
        opacity: 1,
        position: 'fixed',
        transition: 'all 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)',
      });

      // Arrow position pointing at element center
      const arrowRelativeX = elementCenter - clampedLeft;
      const clampedArrowX = Math.max(20, Math.min(tooltipWidth - 20, arrowRelativeX));

      setArrowPlacement(placeOnTop ? 'bottom' : 'top');
      setArrowStyle({
        left: clampedArrowX,
      });

    }, 320);

    return () => clearTimeout(measureTimer);
  }, [currentStepData, step, activeSteps.length, onComplete]);

  // Update on step change, resize, or view change
  useEffect(() => {
    if (currentStepData?.view) {
      onChangeView(currentStepData.view);
    }
    const cleanup = updatePosition();

    const handleResize = () => updatePosition();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (cleanup) cleanup();
    };
  }, [step, currentStepData, onChangeView, updatePosition]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handleBack();
      } else if (e.key === 'Escape') {
        onComplete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleNext = () => {
    if (step < activeSteps.length - 1) {
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

  if (!currentStepData) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden pointer-events-auto font-sans">
      {/* Semi-transparent blocking backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] cursor-default" 
        onClick={(e) => e.stopPropagation()} 
      />

      {/* Highlight Box around the target element */}
      <div 
        className="rounded-[24px] border-2 border-indigo-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.82)] pointer-events-none z-10"
        style={highlightStyle}
      >
        <div className="absolute inset-0 rounded-[22px] animate-pulse-slow bg-indigo-500/10" />
        {/* Corner Accents */}
        <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-indigo-400 rounded-tl-xl" />
        <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-indigo-400 rounded-tr-xl" />
        <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-indigo-400 rounded-bl-xl" />
        <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-indigo-400 rounded-br-xl" />
      </div>

      {/* Tooltip Card */}
      <div 
        ref={tooltipRef}
        className="bg-white/98 dark:bg-[#161E2E]/98 backdrop-blur-2xl p-4 sm:p-5 rounded-3xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.6)] border border-slate-200 dark:border-white/10 pointer-events-auto z-20 flex flex-col text-slate-900 dark:text-white"
        style={tooltipStyle}
      >
        {/* Dynamic Pointer Arrow */}
        <div 
          className={`absolute w-3.5 h-3.5 bg-white dark:bg-[#161E2E] transform -translate-x-1/2 rotate-45 ${
            arrowPlacement === 'top' 
              ? '-top-1.5 border-t border-l border-slate-200 dark:border-white/10' 
              : '-bottom-1.5 border-b border-r border-slate-200 dark:border-white/10'
          }`}
          style={arrowStyle}
        />

        {/* Header */}
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold">
              {step + 1}
            </span>
            <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
              {currentStepData.title}
            </h3>
          </div>
          <button 
            onClick={onComplete} 
            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 uppercase tracking-wider px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            Skip
          </button>
        </div>
        
        {/* Body Text */}
        <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed mb-3.5 font-normal">
          {currentStepData.text}
        </p>
        
        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/10">
          <div className="flex gap-1.5">
            {activeSteps.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? 'w-5 bg-indigo-600 dark:bg-indigo-400' : 'w-1.5 bg-slate-200 dark:bg-slate-700'
                }`} 
              />
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button 
                onClick={handleBack} 
                className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
              >
                Back
              </button>
            )}
            <button 
              onClick={handleNext} 
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1"
            >
              <span>{step === activeSteps.length - 1 ? "Finish" : "Next"}</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tour;
