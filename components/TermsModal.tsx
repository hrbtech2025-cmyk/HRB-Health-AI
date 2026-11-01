import React, { useState } from 'react';

interface TermsModalProps {
  isOpen: boolean;
  initialTab?: 'terms' | 'privacy' | 'help';
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, initialTab = 'terms', onClose }) => {
  const [tab, setTab] = useState<'terms' | 'privacy' | 'help'>(initialTab);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#131B2E] w-full max-w-lg rounded-[28px] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📜</span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Legal & Support
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-5 pt-3 pb-2 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5 flex gap-2">
          <button
            onClick={() => setTab('terms')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'terms'
                ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Terms of Service
          </button>
          <button
            onClick={() => setTab('privacy')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'privacy'
                ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Privacy Policy
          </button>
          <button
            onClick={() => setTab('help')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'help'
                ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Help Center
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {tab === 'terms' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl text-amber-800 dark:text-amber-300 font-medium">
                <strong>Medical Disclaimer:</strong> Hyprova Health is an AI-powered lifestyle and wellbeing platform intended for informational, educational, and performance tracking purposes only. It does not provide medical diagnoses, treatment plans, or clinical advice.
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">1. Acceptance of Terms</h3>
                <p>By accessing or utilizing Hyprova Health, you agree to comply with and be bound by these Terms of Service. If you disagree with any portion of these terms, please discontinue use immediately.</p>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">2. AI Predictions & Insights</h3>
                <p>Insights, vitality scores, workout routines, and nutrition estimates are generated probabilistically using large language models and computer vision. Variations occur; never substitute AI output for consultation with certified healthcare or fitness professionals.</p>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">3. User Responsibility & Safety</h3>
                <p>You assume full responsibility for your physical exercise, dietary changes, and health practices. Immediately stop any physical movement that causes sharp pain, dizziness, or abnormal distress.</p>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">4. API Key & Client Security</h3>
                <p>When you provide a personal Gemini API key, it is kept exclusively in your client-side browser storage (LocalStorage). You maintain control of your API key and quotas.</p>
              </div>
            </div>
          )}

          {tab === 'privacy' && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-emerald-800 dark:text-emerald-300 font-medium">
                <strong>Privacy First:</strong> Hyprova stores your logs, demographic profile, and preferences on your own device.
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">Data Storage</h3>
                <p>All personal metrics, health records, symptoms, notes, and cycle data remain securely stored in your browser LocalStorage. No tracking pixels or telemetry sell your health records.</p>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">Live Privacy Policy Link</h3>
                <p className="mb-2">View our complete, legally audited Privacy Policy documentation hosted online:</p>
                <a
                  href="https://www.privacypolicies.com/live/6d622d76-3373-4eee-82af-b0216a837577"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl hover:underline"
                >
                  <span>Open Official Privacy Policy</span>
                  <span>↗</span>
                </a>
              </div>
            </div>
          )}

          {tab === 'help' && (
            <div className="space-y-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 rounded-xl text-indigo-800 dark:text-indigo-300 font-medium">
                Need assistance, troubleshooting, or want to explore our guides?
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Help Center Online</h3>
                <p>Access our knowledge base, frequently asked questions, and bio-tracking documentation:</p>
                <a
                  href="https://hyprova-research-in-biotechnologies.lovable.app/help-center"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-sm transition-all"
                >
                  <span>Visit Hyprova Help Center</span>
                  <span>↗</span>
                </a>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">Quick Tips</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-500 dark:text-slate-400">
                  <li>Keep camera lens clean for optimal nutrition macro estimations.</li>
                  <li>Log consistency directly elevates your Vitality algorithm score.</li>
                  <li>Use the delay timer in form coach & physique scan to position properly.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;
