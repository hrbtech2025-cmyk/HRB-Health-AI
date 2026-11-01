
import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import ReactMarkdown from 'react-markdown';
import { analyzeMealPhoto, analyzeMealText, hasApiKey } from '../services/geminiService';

interface MealScannerProps {
  onSave: (logData: any) => void;
  onClose: () => void;
  onOpenApiKeyModal?: () => void;
}

const MealScanner: React.FC<MealScannerProps> = ({ onSave, onClose, onOpenApiKeyModal }) => {
  const webcamRef = useRef<Webcam>(null);
  const [img, setImg] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [cameraError, setCameraError] = useState(false);
  
  // Manual Mode State
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [manualText, setManualText] = useState('');

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImg(imageSrc);
    }
  }, [webcamRef]);

  const handleUserMediaError = useCallback(() => {
    setCameraError(true);
  }, []);

  const handleAnalyze = async (imageSrc?: string) => {
    const src = imageSrc || img;
    if (!src) return;

    if (!hasApiKey()) {
      if (onOpenApiKeyModal) {
        onOpenApiKeyModal();
      }
      setResult({ isFood: false, nonFoodMessage: "Google Gemini API key is required to analyze meals. Please input your key." });
      return;
    }

    setAnalyzing(true);
    try {
      const base64 = src.split(',')[1];
      const data = await analyzeMealPhoto(base64);
      setResult(data);
    } catch (e) {
      console.error("Meal scan failed", e);
      setResult({ isFood: false, nonFoodMessage: "Could not analyze image. Try again." });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyzeText = async () => {
    if (!manualText.trim()) return;

    if (!hasApiKey()) {
      if (onOpenApiKeyModal) {
        onOpenApiKeyModal();
      }
      setResult({ isFood: false, nonFoodMessage: "Google Gemini API key is required to analyze meals. Please input your key." });
      return;
    }

    setAnalyzing(true);
    try {
        const data = await analyzeMealText(manualText);
        setResult(data);
    } catch (e) {
        setResult({ isFood: false, nonFoodMessage: "Could not analyze text." });
    } finally {
        setAnalyzing(false);
    }
  };

  const handleSave = () => {
    if (result && result.isFood) {
      onSave({
        type: 'log',
        nutrition: {
          mealType: 'Snack',
          calories: result.calories,
          protein: result.protein,
          carbs: result.carbs,
          fats: result.fat,
          fiber: result.fiber,
          sugar: result.sugar,
          description: result.foodName
        },
        mood: 3, energyLevel: 5, stressLevel: 5, sleepHours: 0, hydrationCups: 0,
        symptoms: [], tags: ['Nutrition', mode === 'manual' ? 'Manual Entry' : 'AI Scan'],
        notes: `Ate ${result.foodName}. \nIncludes: ${result.ingredients?.join(', ')}`
      });
    }
  };

  const resetScan = () => {
    setResult(null);
    setImg(null);
    setManualText('');
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black flex flex-col animate-fade-in font-sans">
      {/* Top Header with Mode Switcher */}
      <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 z-30 flex justify-between items-center bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-none">
        <button 
          onClick={onClose} 
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white font-bold hover:bg-white/20 transition-colors pointer-events-auto border border-white/10"
        >
          ✕
        </button>

        {/* Mode Switcher in top header */}
        <div className="flex bg-black/60 backdrop-blur-md rounded-full p-1 border border-white/15 pointer-events-auto shadow-2xl">
            <button
                onClick={() => { resetScan(); setMode('camera'); }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${mode === 'camera' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
                📷 Camera
            </button>
            <button
                onClick={() => { resetScan(); setMode('manual'); }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${mode === 'manual' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
                ✍️ Manual
            </button>
        </div>

        <div className="w-10"></div> {/* Balanced spacer */}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        
        {/* CAMERA LAYER */}
        <div className={`absolute inset-0 transition-opacity duration-300 ${mode === 'camera' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            {!img && !cameraError && (
            <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                className="absolute inset-0 w-full h-full object-cover"
                videoConstraints={{ facingMode: "environment" }}
                onUserMediaError={handleUserMediaError}
            />
            )}
            {img && (
            <img src={img} alt="Captured meal" className="absolute inset-0 w-full h-full object-cover opacity-80" />
            )}

            {/* Scanning Overlay (Live Camera Only) */}
            {!img && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 border border-white/30 rounded-[32px] relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl-[8px]"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr-[8px]"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl-[8px]"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br-[8px]"></div>
                </div>
                <p className="absolute bottom-32 text-white/80 text-xs font-bold tracking-widest uppercase animate-pulse">Align Food</p>
            </div>
            )}
            
            {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20">
                    <div className="text-4xl mb-4">🚫</div>
                    <h3 className="text-white font-bold mb-2">Camera Access Denied</h3>
                    <p className="text-slate-400 text-sm mb-6">Switch to manual mode to log your food.</p>
                    <button onClick={() => setMode('manual')} className="px-6 py-3 bg-slate-800 rounded-full text-white font-bold text-sm pointer-events-auto border border-white/10">Switch to Manual Entry</button>
                </div>
            )}
        </div>

        {/* MANUAL LAYER */}
        <div className={`absolute inset-0 bg-slate-900 transition-opacity duration-300 flex flex-col items-center justify-center p-6 overflow-y-auto ${mode === 'manual' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
             {!result && (
                 <div className="w-full max-w-sm space-y-4 animate-slide-up pt-16 pb-12">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 border border-white/10 shadow-lg">
                            ✍️
                        </div>
                        <h2 className="text-2xl font-bold text-white">Describe Your Meal</h2>
                        <p className="text-slate-400 text-sm mt-1">Tell Hyprova what you ate. AI will calculate the macros.</p>
                    </div>
                    
                    <textarea 
                       value={manualText}
                       onChange={(e) => setManualText(e.target.value)}
                       placeholder="e.g. 2 scrambled eggs with avocado toast and a black coffee..."
                       className="w-full h-36 bg-slate-800/90 border border-white/15 rounded-2xl p-4 text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition-colors resize-none text-base pointer-events-auto shadow-inner"
                    />

                    <button 
                       onClick={handleAnalyzeText}
                       disabled={!manualText.trim() || analyzing}
                       className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/30 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none pointer-events-auto text-base"
                    >
                        {analyzing ? 'Analyzing...' : 'Calculate Macros'}
                    </button>
                 </div>
             )}
        </div>
      </div>

      {/* Review Overlay (Image captured, not analyzing, no result) */}
      {mode === 'camera' && img && !analyzing && !result && (
            <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col items-center bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-20 z-[60]">
                <div className="flex w-full gap-4 max-w-sm pointer-events-auto">
                    <button 
                    onClick={() => setImg(null)}
                    className="flex-1 py-4 bg-white text-slate-900 font-bold rounded-2xl shadow-xl hover:bg-slate-200 transition-colors"
                    >
                    Retake
                    </button>
                    <button 
                    onClick={() => handleAnalyze()}
                    className="flex-[2] py-4 bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/40 border border-emerald-400/50 hover:bg-emerald-400 transition-colors"
                    >
                    Scan Meal
                    </button>
                </div>
        </div>
      )}

      {/* Analysis Loading State */}
      {analyzing && (
           <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
              <div className="relative w-24 h-24">
                 <div className="absolute inset-0 border-t-4 border-emerald-500 rounded-full animate-spin"></div>
                 <div className="absolute inset-2 border-b-4 border-primary rounded-full animate-spin animation-delay-500"></div>
              </div>
              <p className="mt-6 text-white font-bold text-lg tracking-tight">Deconstructing Meal...</p>
           </div>
      )}

      {/* Result Card */}
      {result && !analyzing && (
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] p-8 z-40 animate-slide-up shadow-2xl max-h-[85vh] overflow-y-auto">
            {result.isFood ? (
              <>
                <div className="flex justify-between items-start mb-6">
                   <div className="flex-1 pr-4">
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Identified</p>
                     <h2 className="text-2xl font-bold text-slate-900 leading-tight break-words">{result.foodName}</h2>
                     {result.ingredients && (
                         <div className="flex flex-wrap gap-1 mt-2">
                             {result.ingredients.map((ing: string, i: number) => (
                                 <span key={i} className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600 border border-slate-200">{ing}</span>
                             ))}
                         </div>
                     )}
                   </div>
                   <div className="text-right shrink-0">
                     <p className="text-3xl font-black text-emerald-600">{result.calories}</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase">Kcal est.</p>
                   </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6">
                   <div className="bg-slate-50 p-3 rounded-2xl text-center border border-slate-100">
                      <div className="text-base font-bold text-slate-800">{result.protein}g</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Protein</div>
                   </div>
                   <div className="bg-slate-50 p-3 rounded-2xl text-center border border-slate-100">
                      <div className="text-base font-bold text-slate-800">{result.carbs}g</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Carbs</div>
                   </div>
                   <div className="bg-slate-50 p-3 rounded-2xl text-center border border-slate-100">
                      <div className="text-base font-bold text-slate-800">{result.fat}g</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Fats</div>
                   </div>
                   
                   {(result.fiber !== undefined || result.sugar !== undefined) && (
                     <>
                        <div className="bg-slate-50 p-3 rounded-2xl text-center border border-slate-100">
                            <div className="text-base font-bold text-slate-800">{result.fiber !== undefined ? result.fiber : '-'}g</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Fiber</div>
                        </div>
                         <div className="bg-slate-50 p-3 rounded-2xl text-center border border-slate-100">
                            <div className="text-base font-bold text-slate-800">{result.sugar !== undefined ? result.sugar : '-'}g</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Sugar</div>
                        </div>
                     </>
                   )}
                </div>

                {result.healthTip && (
                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl mb-6">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">💡</span>
                            <span className="text-xs font-bold uppercase text-emerald-600 tracking-wider">Smart Insight</span>
                        </div>
                        <div className="text-sm text-emerald-900 leading-relaxed prose-sm">
                            <ReactMarkdown components={{ strong: ({node, ...props}) => <span className="font-bold text-emerald-700" {...props} /> }}>
                                {result.healthTip}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}

                <div className="flex gap-3">
                  <button 
                    onClick={resetScan}
                    className="flex-1 py-5 bg-slate-100 text-slate-700 font-bold text-lg rounded-[20px] transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSave}
                    className="flex-[2] py-5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg rounded-[20px] shadow-xl shadow-emerald-500/30 active:scale-[0.98] transition-all"
                  >
                    Log Meal
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="text-4xl mb-4">🤔</div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Not quite food?</h3>
                <p className="text-slate-500 mb-6">{result.nonFoodMessage || "I couldn't detect a meal. Please try again."}</p>
                <div className="flex gap-3">
                   <button 
                      onClick={resetScan}
                      className="flex-1 py-4 bg-slate-100 text-slate-700 font-bold rounded-[20px]"
                    >
                      Try Again
                    </button>
                    {mode === 'camera' && (
                        <button 
                        onClick={() => { resetScan(); setMode('manual'); }}
                        className="flex-1 py-4 bg-slate-900 text-white font-bold rounded-[20px]"
                        >
                        Switch to Text
                        </button>
                    )}
                </div>
              </div>
            )}
          </div>
      )}

      {/* Footer Shutter Button (Camera Mode Only) */}
      {!result && !analyzing && mode === 'camera' && !img && !cameraError && (
        <div className="absolute bottom-0 left-0 right-0 z-50 flex flex-col items-center pb-10 pt-8 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none">
            <button 
                onClick={capture}
                className="pointer-events-auto w-20 h-20 rounded-full border-[5px] border-white flex items-center justify-center active:scale-90 transition-transform group shadow-2xl bg-white/20 backdrop-blur-sm"
            >
                <div className="w-16 h-16 bg-white rounded-full group-hover:scale-95 transition-transform shadow-inner"></div>
            </button>
        </div>
      )}
    </div>
  );
};

export default MealScanner;
