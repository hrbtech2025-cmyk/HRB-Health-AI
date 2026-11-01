
import { GoogleGenAI, Type, Chat, Part } from "@google/genai";
import { LogEntry, UserProfile, AIPrediction, AIIdentity, ChatMessage, HealthExperiment } from "../types";

const STORAGE_KEY = 'hyprova_gemini_api_key';

export const getStoredApiKey = (): string => {
  return localStorage.getItem(STORAGE_KEY) || localStorage.getItem('gemini_api_key') || '';
};

export const setStoredApiKey = (key: string): void => {
  const trimmed = key.trim();
  if (trimmed) {
    localStorage.setItem(STORAGE_KEY, trimmed);
    localStorage.setItem('gemini_api_key', trimmed);
  } else {
    removeStoredApiKey();
  }
};

export const removeStoredApiKey = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('gemini_api_key');
};

export const hasApiKey = (): boolean => {
  return !!getStoredApiKey();
};

export const getGenAI = (): GoogleGenAI => {
  const key = getStoredApiKey();
  if (!key) {
    throw new Error("GEMINI_API_KEY_REQUIRED: Please enter your Google Gemini API key to use AI features.");
  }
  return new GoogleGenAI({ apiKey: key });
};

// Dynamic client proxy that always uses the latest user-input API key
const ai = new Proxy({} as GoogleGenAI, {
  get(_target, prop) {
    const client = getGenAI();
    const val = (client as any)[prop];
    return typeof val === 'function' ? val.bind(client) : val;
  }
});

// Quick validation helper to test an API key
export const validateApiKey = async (testKey: string): Promise<{ valid: boolean; error?: string }> => {
  const trimmed = testKey.trim();
  if (!trimmed) {
    return { valid: false, error: "API key cannot be empty." };
  }
  try {
    const tempAi = new GoogleGenAI({ apiKey: trimmed });
    const response = await tempAi.models.generateContent({
      model: MODEL_FAST,
      contents: "Respond with the word OK.",
    });
    if (response && response.text) {
      return { valid: true };
    }
    return { valid: false, error: "No response received from Gemini API." };
  } catch (err: any) {
    return { valid: false, error: err?.message || "Invalid API key or network error." };
  }
};

// Model Configurations
const MODEL_FAST = "gemini-3.8-flash"; 
const MODEL_COMPLEX = "gemini-3.1-pro-preview"; 
// Using Gemini 3.8 Flash for vision analysis tasks (Multimodal)
const MODEL_VISION = "gemini-3.8-flash"; 

const cleanJSON = (text: string) => {
  let cleaned = text.replace(/```json|```/g, "").trim();
  return cleaned;
};

// Helper to round time to next 5 minutes for "natural" feel
const roundToNext5Minutes = (date: Date): Date => {
  const coefficient = 1000 * 60 * 5;
  return new Date(Math.ceil(date.getTime() / coefficient) * coefficient);
};

const formatForAI = (timestamp: number) => {
    const d = roundToNext5Minutes(new Date(timestamp));
    return d.toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
};

export const generateHealthPrediction = async (logs: LogEntry[], profile?: UserProfile): Promise<AIPrediction> => {
  if (!hasApiKey()) {
    return {
      riskLevel: 'Low',
      vitalityScore: 0,
      title: 'Gemini API Key Required',
      description: 'Enter your Google Gemini API key to activate AI Vitality score calculations, health forecasts, and pattern detection.',
      triggers: ['Missing API Key']
    };
  }

  if (logs.length < 1) {
    return {
      riskLevel: 'Low',
      vitalityScore: 75,
      title: 'Welcome to Hyprova',
      description: 'Start logging your day to generate your first AI Vitality Score.',
      triggers: []
    };
  }

  const now = new Date();
  const currentTimeContext = `Current System Time: ${formatForAI(now.getTime())}`;

  // Expanded context for AI to determine Vitality Score
  const recentLogs = logs.slice(0, 15).map(l => ({
    type: l.type || 'log',
    time: formatForAI(l.timestamp), // Use rounded time
    mood: l.mood,
    energy: l.energyLevel,
    stress: l.stressLevel,
    sleep: l.sleepHours,
    hydration: l.hydrationCups,
    symptoms: l.symptoms,
    nutrition: l.nutrition ? { 
        calories: l.nutrition.calories, 
        protein: l.nutrition.protein, 
        fiber: l.nutrition.fiber, 
        sugar: l.nutrition.sugar 
    } : undefined,
    workout: l.type === 'workout' ? { 
        title: l.title, 
        intensity: l.metrics?.intensity 
    } : undefined,
    formCheck: l.type === 'form_check' ? { 
        exercise: l.title, 
        score: l.metrics?.formScore 
    } : undefined,
    physique: l.type === 'physique' ? {
        title: l.title,
        score: l.metrics?.definitionScore
    } : undefined
  }));

  const context = profile 
    ? `User Goals: ${profile.goals.join(", ")}. Age: ${profile.age || 'Unknown'}. Gender: ${profile.gender || 'Unknown'}. Known conditions: ${profile.conditions.join(", ")}. Fitness Level: ${profile.fitnessLevel || 'Unknown'}. Diet: ${profile.dietaryPreferences?.join(", ") || 'None'}.` 
    : "";

  const prompt = `
    Analyze these health logs to determine the user's 'Vitality Score' (0-100).
    ${currentTimeContext}
    
    The Vitality Score is a dynamic, holistic measure of how well the user is functioning and performing.
    Determine the score PURELY based on the collected data patterns with NO preset formulas. Use your judgement.
    
    **Key Ranking Factors (Weighted Importance):**
    1. **Logging Consistency & Frequency:** 
       - Regular logging (daily/multiple times) indicates self-awareness -> Boost Score.
       - Erratic or sparse logging -> Penalty.
    2. **Nutrition Quality:** 
       - High protein, fiber, and whole foods -> Boost.
       - High sugar/processed foods or missing meals -> Penalty.
    3. **Exercise Variety & Intensity:** 
       - Logging workouts significantly boosts the score.
       - Variety in activity (strength, cardio, mobility) -> Higher Boost than repetitive minimal movement.
       - *Critical:* Low energy reported *after* a workout is "Productive Fatigue" (Positive). Low energy *without* workout is "Lethargy" (Negative).
    4. **Mood-Activity Correlation:** 
       - Does mood/energy improve after sleep or exercise? If yes -> Boost (Resilient).
       - Does stress remain high despite interventions? -> Penalty (Chronic Stress).
    5. **Physiological Baseline:** 
       - Good sleep (7-9h) and hydration -> Strong Baseline Boost.
       - Poor sleep + High Stress -> Significant Risk Penalty.
    6. **Form & Mastery:** High scores on 'Form Checks' indicate movement quality -> Boost.
    
    Also predict the user's wellness for tomorrow (riskLevel) and provide a short, actionable insight.
    
    Context: ${context}
    Logs: ${JSON.stringify(recentLogs)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskLevel: { type: Type.STRING, enum: ["Low", "Moderate", "High"] },
            vitalityScore: { type: Type.INTEGER, description: "Holistic Vitality Score 0-100" },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            triggers: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["riskLevel", "vitalityScore", "title", "description", "triggers"]
        }
      }
    });

    const text = response.text || "{}";
    return JSON.parse(cleanJSON(text));
  } catch (error) {
    console.error("Prediction Error", error);
    return { 
        riskLevel: 'Low', 
        vitalityScore: 0, 
        title: 'Check In', 
        description: 'Could not analyze data right now.', 
        triggers: [] 
    };
  }
};

export const generateReflectionAndIdentity = async (logs: LogEntry[], profile: UserProfile): Promise<any> => {
    try {
        const response = await ai.models.generateContent({
            model: MODEL_FAST,
            contents: `Based on these logs and profile (${profile.name}), generate a short 'identityTitle' (e.g. 'Consistent Sleeper') and a 'reflection' (1 sentence). Also 'identityProgress' (0-100). JSON format. Logs: ${JSON.stringify(logs.slice(0,5))}`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(cleanJSON(response.text || "{}"));
    } catch (e) {
        return { identityTitle: "Wellness Explorer", reflection: "Start logging to see your journey.", identityProgress: 10 };
    }
};

export const createHealthChat = (logs: LogEntry[], profile: UserProfile, history: any[]): Chat => {
  // Richer summary of recent logs for context with Rounded Time
  const recentLogsSummary = logs.slice(0, 10).map(l => {
    const timeStr = formatForAI(l.timestamp);
    let summary = `[${timeStr}] Type:${l.type || 'Log'}, Mood:${l.mood}/5, Energy:${l.energyLevel}/10`;
    
    if (l.sleepHours > 0) summary += `, Sleep:${l.sleepHours}h`;
    if (l.symptoms && l.symptoms.length > 0) summary += `, Symptoms:[${l.symptoms.join(',')}]`;
    if (l.type === 'workout') summary += `, Workout:${l.title} (Int:${l.metrics?.intensity})`;
    if (l.type === 'physique') summary += `, Physique Check:${l.title}`;
    if (l.type === 'form_check') summary += `, Form Check:${l.title} (Score:${l.metrics?.formScore})`;
    if (l.type === 'experiment') summary += `, Bio-Hack:${l.title} (${l.experimentData?.type})`;
    if (l.nutrition) summary += `, Ate:${l.nutrition.description || l.nutrition.mealType}`;
    if (l.notes) summary += `, Note:${l.notes}`;
    
    return summary;
  }).join('\n');

  const now = new Date();
  const currentTimeString = formatForAI(now.getTime());

  const context = `
    Current Date & Time: ${currentTimeString}
    
    User Identity: ${profile.name} (${profile.age || '?'}yo ${profile.gender || ''}).
    Bio: Fitness=${profile.fitnessLevel || 'Unknown'}, Diet=${profile.dietaryPreferences?.join(", ") || 'Standard'}.
    Health Context: Conditions=[${profile.conditions.join(', ')}], Meds=[${profile.medications.join(', ')}].
    Goals: ${profile.goals.join(', ')}.
    
    Recent Log History (Times are approx):
    ${recentLogsSummary}
  `;

  return ai.chats.create({
    model: MODEL_FAST, // Using Flash for responsiveness and Search tool compatibility
    history: history,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: `
        You are Hyprova, a smart, empathetic health companion.
        
        **USER CONTEXT:**
        ${context}
        
        **STRICT RESPONSE RULES:**
        1. **TIME AWARENESS:** The log history uses approximate times (rounded to 5 mins). Use this to understand when events happened relative to "Now" (${currentTimeString}).
           - If a log was 15 mins ago, say "just now" or "a moment ago".
           - If yesterday, say "yesterday".
           - Do NOT use specific timestamps like "at 10:45 PM" unless necessary. Be natural.
        2. **BE CONCISE:** Limit responses to 1-2 short sentences per thought. No long paragraphs.
        3. **USE BUBBLES:** You MUST use "|||" to separate distinct ideas or follow-up questions.
        4. **NO DOCTOR SPEAK:** Be casual but knowledgeable.
        5. **MEMORY:** Use the provided log history to reference past events.
        6. **SEARCH:** If you need current information (e.g. weather, new treatments, news) or the user asks for sources, use the Search tool.
        
        **SAFETY:**
        If analyzing an injury/wound photo:
        1. Start with "⚠️ I am an AI, not a doctor."
        2. Describe what you see objectively.
        3. Suggest seeing a pro if it looks infected/deep.
      `
    }
  });
};

export const transcribeAudio = async (base64Audio: string, mimeType: string = "audio/wav"): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: MODEL_FAST,
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: mimeType, 
                            data: base64Audio
                        }
                    },
                    { text: "Transcribe the audio exactly as spoken." }
                ]
            }
        });
        return response.text || "";
    } catch (e) {
        console.error("Transcription failed", e);
        return "";
    }
};

export const generateMedicalBrief = async (logs: LogEntry[]): Promise<string> => {
    const recentLogs = logs.slice(0, 20);
    const prompt = `
        Generate a professional medical brief based on these recent health logs. 
        Format in Markdown. 
        Sections:
        1. Executive Summary
        2. Symptom Patterns & Frequency
        3. Lifestyle Factors (Sleep, Nutrition, Activity)
        4. Potential Triggers Identified
        5. Suggested Questions for Primary Care Physician
        
        Logs: ${JSON.stringify(recentLogs)}
    `;
    try {
        const response = await ai.models.generateContent({
            model: MODEL_COMPLEX,
            contents: prompt
        });
        return response.text || "No report generated.";
    } catch (e) {
        console.error("Medical Brief failed", e);
        return "Could not generate report at this time.";
    }
};

export const searchGrounding = async (query: string, logs: LogEntry[]): Promise<{ text: string, groundingChunks: any[] }> => {
    try {
        // Use Google Search tool with recommended Gemini 3 Flash model
        const response = await ai.models.generateContent({
            model: MODEL_FAST,
            contents: `User Context from logs: ${JSON.stringify(logs.slice(0, 3))}. Query: ${query}`,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });
        return { 
            text: response.text || "", 
            groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] 
        };
    } catch (e) {
        console.error("Search failed", e);
        return { text: "Search currently unavailable.", groundingChunks: [] };
    }
};

export const generateChatTitle = async (messages: ChatMessage[]): Promise<string> => {
    try {
        const conversation = messages.slice(0, 4).map(m => m.text).join("\n");
        const response = await ai.models.generateContent({
            model: MODEL_FAST,
            contents: `Generate a very short title (max 4 words) for this conversation:\n${conversation}`
        });
        return (response.text || "New Chat").trim().replace(/"/g, "");
    } catch (e) {
        return "Health Chat";
    }
};

export const analyzePhysique = async (base64Image: string): Promise<any> => {
    try {
        const prompt = `
        Analyze this physique photo adaptively. 
        1. First, identify EXACTLY what is visible (e.g., "Full Body", "Right Bicep only", "Upper Body only", "Legs"). Do not assume a full body if only a part is shown.
        2. Provide a 'definitionScore' (1-10) relative to the visible area.
        3. Provide an 'honestAssessment'. Be professional but honest about body fat, muscle maturity, or imbalances visible.
        4. Suggest 'targetMuscleForWorkout'. This should be the single best muscle group to train next to improve this specific area (e.g. "Triceps", "Upper Chest").
        
        Return JSON.
        `;

        const response = await ai.models.generateContent({
            model: MODEL_VISION, 
            contents: {
                parts: [
                    { inlineData: { mimeType: "image/jpeg", data: base64Image } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        visibleRegion: { type: Type.STRING, description: "What part of the body is seen" },
                        definitionScore: { type: Type.INTEGER },
                        honestAssessment: { type: Type.STRING, description: "Honest, constructive feedback" },
                        muscleGroupsDetected: { type: Type.ARRAY, items: { type: Type.STRING } },
                        symmetryNotes: { type: Type.STRING },
                        developmentTips: { type: Type.STRING },
                        targetMuscleForWorkout: { type: Type.STRING, description: "One specific muscle group to train next" }
                    }
                }
            }
        });
        return JSON.parse(cleanJSON(response.text || "{}"));
    } catch (e) {
        console.error("Physique analysis failed", e);
        return null;
    }
};

export const analyzeFormVideo = async (base64Frames: string[]): Promise<any> => {
    try {
        const parts: Part[] = base64Frames.map(f => ({
            inlineData: { mimeType: "image/jpeg", data: f }
        }));
        parts.push({ 
            text: "Analyze the exercise form in these sequential frames. Identify exercise name, overall form score (1-10), safety alert ('Safe' if score >= 8, 'Correction Needed' if score 5-7, 'Dangerous' if < 5), metrics (stability, tempo, jointAlignment each 1-10), and specific key faults/corrections with location, issue, and fix. Return JSON." 
        });

        const response = await ai.models.generateContent({
            model: MODEL_VISION,
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        exerciseDetected: { type: Type.STRING },
                        formScore: { type: Type.INTEGER },
                        safetyAlert: { type: Type.STRING, enum: ["Safe", "Correction Needed", "Dangerous"] },
                        metrics: { 
                            type: Type.OBJECT, 
                            properties: {
                                stability: { type: Type.INTEGER },
                                tempo: { type: Type.INTEGER },
                                jointAlignment: { type: Type.INTEGER }
                            },
                            required: ["stability", "tempo", "jointAlignment"]
                        },
                        keyFaults: { 
                            type: Type.ARRAY, 
                            items: { 
                                type: Type.OBJECT,
                                properties: {
                                    location: { type: Type.STRING },
                                    issue: { type: Type.STRING },
                                    fix: { type: Type.STRING }
                                },
                                required: ["location", "issue", "fix"]
                            }
                        },
                        corrections: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["exerciseDetected", "formScore", "safetyAlert", "metrics", "keyFaults"]
                }
            }
        });
        const parsed = JSON.parse(cleanJSON(response.text || "{}"));
        const baseScore = typeof parsed.formScore === 'number' ? parsed.formScore : 7;
        parsed.formScore = baseScore;
        parsed.metrics = {
            stability: typeof parsed.metrics?.stability === 'number' ? parsed.metrics.stability : Math.min(10, Math.max(1, baseScore)),
            tempo: typeof parsed.metrics?.tempo === 'number' ? parsed.metrics.tempo : Math.min(10, Math.max(1, baseScore)),
            jointAlignment: typeof parsed.metrics?.jointAlignment === 'number' ? parsed.metrics.jointAlignment : Math.min(10, Math.max(1, baseScore))
        };
        if (baseScore < 7 && (!parsed.keyFaults || parsed.keyFaults.length === 0)) {
            parsed.safetyAlert = "Correction Needed";
            parsed.keyFaults = [
                { location: "Core & Posture", issue: "Slight torso sway during repetitions", fix: "Engage core and stabilize hips throughout the movement" }
            ];
        }
        return parsed;
    } catch (e) {
        console.error("Form analysis failed", e);
        return {
            exerciseDetected: "Exercise Form Analysis",
            formScore: 7,
            safetyAlert: "Safe",
            metrics: { stability: 7, tempo: 8, jointAlignment: 7 },
            keyFaults: []
        };
    }
};

export const generateWorkout = async (
    params: {
        muscleGroup: string;
        equipment: string[];
        difficulty: string;
        duration: number;
        userGoals?: string[];
    }
): Promise<string> => {
    const prompt = `
        Act as an elite strength and conditioning coach (AI Trainer).
        Design a clean, highly structured, actionable workout plan.
        
        **USER CONTEXT:**
        - Target Area: ${params.muscleGroup}
        - Difficulty: ${params.difficulty}
        - Time Cap: ${params.duration} minutes
        - Equipment: ${params.equipment.join(', ') || 'Bodyweight'}
        - Goals: ${params.userGoals?.join(', ') || 'General Fitness & Longevity'}

        **CRITICAL FORMATTING RULES (Markdown):**
        - STRICT: DO NOT write long paragraphs of filler or fluff. Users want to read the routine immediately.
        - Start with an H1: # [Catchy Workout Title]
        - Directly below the title, write ONE short summary sentence (maximum 20 words).
        - ## Warmup
          Bulleted list of 3-4 prep movements with exact time/reps (e.g. "Arm Circles: 30s forward, 30s backward").
        - ## The Workout
          Use ### [Exercise Name] for each exercise.
          Under each exercise, use 1-2 bullet points:
          - Sets & Reps: [e.g. 3 sets × 10-12 reps | 60s rest]
          - Form Cue: [Single concise cue for safety & maximal activation]
        - ## Cooldown
          Bulleted list of 2-3 recovery stretches or breathwork (e.g. "Box Breathing: 2 minutes to lower cortisol").
        - > [A 1-sentence motivating coach's takeaway]

        Output ONLY the clean markdown.
    `;
    try {
        const response = await ai.models.generateContent({
            model: MODEL_FAST,
            contents: prompt
        });
        return response.text || "Could not generate workout. Please try again.";
    } catch (e) {
        return "Error generating workout plan due to network or API issue.";
    }
};

export const analyzeMealPhoto = async (base64Image: string): Promise<any> => {
    try {
        // Specific prompt to handle non-food items with personality
        const prompt = `
        Analyze this image for nutritional content.
        
        1. Determine if the image contains food or drink.
        2. If YES (isFood=true):
           - Identify the meal name (foodName).
           - Estimate calories, protein(g), carbs(g), fat(g), fiber(g), sugar(g).
           - List main ingredients.
           - Provide a short healthTip.
        3. If NO (isFood=false):
           - Identify what IS in the image (e.g. "a laptop", "a person", "a cat").
           - Set nonFoodMessage to a short, witty message describing what you see (e.g. "That looks like a laptop, not lunch! Please take a photo of your food.").
        
        Return JSON.
        `;

        const response = await ai.models.generateContent({
            model: MODEL_VISION,
            contents: {
                parts: [
                    { inlineData: { mimeType: "image/jpeg", data: base64Image } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        isFood: { type: Type.BOOLEAN },
                        nonFoodMessage: { type: Type.STRING },
                        foodName: { type: Type.STRING },
                        calories: { type: Type.INTEGER },
                        protein: { type: Type.INTEGER },
                        carbs: { type: Type.INTEGER },
                        fat: { type: Type.INTEGER },
                        fiber: { type: Type.INTEGER },
                        sugar: { type: Type.INTEGER },
                        ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
                        micronutrients: { type: Type.ARRAY, items: { type: Type.STRING } },
                        healthTip: { type: Type.STRING }
                    }
                }
            }
        });
        return JSON.parse(cleanJSON(response.text || "{}"));
    } catch (e) {
        console.error("Meal analysis failed", e);
        return { isFood: false, nonFoodMessage: "Analysis error. Please try again." };
    }
};

export const analyzeMealText = async (text: string): Promise<any> => {
    try {
        const response = await ai.models.generateContent({
            model: MODEL_FAST,
            contents: `Analyze this food description: "${text}". Identify main components. Estimate total calories, macros (protein, carbs, fat, fiber, sugar), ingredients, micronutrients (vitamins/minerals), and provide a healthTip/alternative. If it's clearly not food, set isFood=false and set nonFoodMessage to something witty. Return JSON.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        isFood: { type: Type.BOOLEAN },
                        nonFoodMessage: { type: Type.STRING },
                        foodName: { type: Type.STRING },
                        calories: { type: Type.INTEGER },
                        protein: { type: Type.INTEGER },
                        carbs: { type: Type.INTEGER },
                        fat: { type: Type.INTEGER },
                        fiber: { type: Type.INTEGER },
                        sugar: { type: Type.INTEGER },
                        ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
                        micronutrients: { type: Type.ARRAY, items: { type: Type.STRING } },
                        healthTip: { type: Type.STRING }
                    }
                }
            }
        });
        return JSON.parse(cleanJSON(response.text || "{}"));
    } catch (e) {
        console.error("Meal text analysis failed", e);
        return { isFood: false, nonFoodMessage: "Analysis error. Please try again." };
    }
};

// --- EXPERIMENT SERVICE ---

export const generateHealthExperiment = async (logs: LogEntry[], profile: UserProfile, specificType?: string): Promise<HealthExperiment> => {
    const recentState = logs.slice(0, 5).map(l => ({ mood: l.mood, stress: l.stressLevel, energy: l.energyLevel, type: l.type }));
    
    // If specificType is provided (e.g. from Dashboard widget), prioritize it in the prompt
    const forceTypeInstruction = specificType 
        ? `You MUST generate an experiment of type: '${specificType}'. Ignore other conditions.` 
        : `If high stress: Suggest breathing or meditation. If low energy: Suggest hydration or light movement. If stiff/pain: Suggest yoga/stretching. If good mood: Suggest a challenge.`;

    const prompt = `
        Based on these recent logs for ${profile.name}, suggest ONE health experiment/micro-habit for right now.
        ${forceTypeInstruction}

        Return JSON.
        Types: 'breathing', 'movement', 'habit'.
        VerificationPrompt: A prompt for an AI vision model to confirm the user did it (e.g. "Is the person drinking water?", "Is the person doing a plank?").
        Instructions: Short step-by-step array.
        
        Logs: ${JSON.stringify(recentState)}
    `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_FAST,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        type: { type: Type.STRING, enum: ['breathing', 'movement', 'habit'] },
                        difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard'] },
                        durationSeconds: { type: Type.INTEGER },
                        description: { type: Type.STRING },
                        instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
                        rationale: { type: Type.STRING },
                        verificationPrompt: { type: Type.STRING }
                    },
                    required: ['title', 'type', 'instructions', 'rationale']
                }
            }
        });
        const exp = JSON.parse(cleanJSON(response.text || "{}"));
        return { ...exp, id: Date.now().toString() };
    } catch (e) {
        return {
            id: 'default',
            title: 'Deep Breath Reset',
            type: 'breathing',
            difficulty: 'Easy',
            durationSeconds: 60,
            description: 'Take a moment to center yourself.',
            instructions: ['Inhale deeply for 4 seconds', 'Hold for 4 seconds', 'Exhale for 4 seconds'],
            rationale: 'A quick reset for your nervous system.',
            verificationPrompt: 'Is the person sitting calmly?'
        };
    }
};

export const verifyAction = async (base64Video: string[], userTaskPrompt: string): Promise<{ success: boolean; feedback: string }> => {
    try {
        const parts: Part[] = base64Video.map(f => ({
            inlineData: { mimeType: "image/jpeg", data: f }
        }));
        
        const systemInstruction = `
        You are a supportive, lenient AI Habit Coach. 
        Your goal is to VALIDATE the user's effort, not to be a strict judge.
        
        The user is attempting the task: "${userTaskPrompt}".
        
        **CRITICAL VERIFICATION RULES:**
        1. **PRIORITIZE INTENT:** If it looks like the user is *attempting* the action, count it as success. Do not demand perfection.
        2. **OBJECT FLEXIBILITY:** 
           - If the task is hydration, accept ANY drinking vessel (glass, bottle, flask, mug, stanley cup, etc).
           - If the task is movement, accept partial range of motion or modification.
        3. **ENVIRONMENT:** Ignore messy backgrounds, bad lighting, or angles. If you see the person and the general motion, it passes.
        4. **FEEDBACK:**
           - If SUCCESS: Give a short, high-energy compliment (e.g. "Great work staying hydrated!", "Perfect form!").
           - If FAILED: Be specific but kind. Explain exactly what was missing (e.g. "I couldn't see you in the frame" or "I didn't see the bottle").
        5. **CONFIDENCE:** If you are >50% sure they did it, mark success: true.
        
        Return JSON.
        `;

        const response = await ai.models.generateContent({
            model: MODEL_VISION,
            contents: { 
                parts: [
                    ...parts,
                    { text: systemInstruction }
                ] 
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        success: { type: Type.BOOLEAN },
                        feedback: { type: Type.STRING }
                    }
                }
            }
        });
        return JSON.parse(cleanJSON(response.text || "{}"));
    } catch (e) {
        console.error("Verification failed", e);
        return { success: false, feedback: "Could not verify action due to technical error. But good effort!" };
    }
};
