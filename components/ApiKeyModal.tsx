import React, { useState, useEffect } from 'react';
import { getStoredApiKey, setStoredApiKey, removeStoredApiKey, validateApiKey } from '../services/geminiService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: (key: string) => void;
  title?: string;
  description?: string;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onKeySaved,
  title = "Gemini AI Engine",
  description = "To keep Hyprova completely free and privacy-focused with zero subscription fees, advanced AI features run directly through your own Google Gemini API key. Google provides generous free quotas, setup takes 30 seconds, and your key remains securely stored only on your device."
}) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [storedKey, setStoredKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      const existing = getStoredApiKey();
      setStoredKey(existing);
      setApiKey(existing);
      setStatus(null);
      setShowKey(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const maskKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return `${key.slice(0, 6)}••••••••${key.slice(-4)}`;
  };

  const handleSave = async (skipTest = false) => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setStatus({ type: 'error', message: 'Please enter a valid Gemini API key.' });
      return;
    }

    if (!skipTest) {
      setIsValidating(true);
      setStatus({ type: 'info', message: 'Verifying API key with Google Gemini...' });
      const testResult = await validateApiKey(trimmed);
      setIsValidating(false);

      if (!testResult.valid) {
        setStatus({
          type: 'error',
          message: `Verification failed: ${testResult.error || 'Invalid API key. Please check the key and try again.'}`
        });
        return;
      }
    }

    setStoredApiKey(trimmed);
    setStoredKey(trimmed);
    setStatus({ type: 'success', message: 'API key successfully saved and verified!' });

    if (onKeySaved) {
      onKeySaved(trimmed);
    }

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleRemove = () => {
    removeStoredApiKey();
    setStoredKey('');
    setApiKey('');
    setStatus({ type: 'info', message: 'Gemini API key has been removed.' });
    if (onKeySaved) {
      onKeySaved('');
    }
  };

  return (
    <div
      id="gemini-api-key-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#131B2E] w-full max-w-lg rounded-[28px] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col animate-scale-up">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl font-bold shadow-sm">
              🔑
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Google AI Studio Integration
              </p>
            </div>
          </div>
          <button
            id="close-api-key-modal-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {description}
          </p>

          {/* Current Status */}
          {storedKey ? (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <div>
                  <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    API Key Active
                  </div>
                  <div className="text-[11px] font-mono text-emerald-700/80 dark:text-emerald-400/80">
                    {maskKey(storedKey)}
                  </div>
                </div>
              </div>
              <button
                id="remove-api-key-btn"
                onClick={handleRemove}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 px-2.5 py-1 rounded-lg hover:bg-rose-100/60 dark:hover:bg-rose-950/40 transition-colors"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 flex items-center gap-3 text-xs text-indigo-900 dark:text-indigo-200 font-medium">
              <span className="text-base">💡</span>
              <span>Connect your free Google Gemini API key below to unlock instant AI health insights, chat, and scanning.</span>
            </div>
          )}

          {/* Key Input Field */}
          <div className="space-y-2">
            <label
              htmlFor="gemini-api-key-input"
              className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300"
            >
              Enter API Key
            </label>
            <div className="relative">
              <input
                id="gemini-api-key-input"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  if (status) setStatus(null);
                }}
                placeholder="AIzaSy..."
                className="w-full px-4 py-3 pr-20 text-sm font-mono rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {apiKey && (
                  <button
                    type="button"
                    onClick={() => setApiKey('')}
                    className="p-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Clear"
                  >
                    ✕
                  </button>
                )}
                <button
                  id="toggle-key-visibility-btn"
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="px-2 py-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded"
                  title={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          </div>

          {/* Help & Links */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>💡</span> How to get a free Gemini API key:
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-500 dark:text-slate-400 pl-1 leading-relaxed">
              <li>Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 font-bold underline hover:text-indigo-700">Google AI Studio (aistudio.google.com)</a></li>
              <li>Sign in with your Google account.</li>
              <li>Click <strong>&quot;Create API Key&quot;</strong>.</li>
              <li>Copy and paste your key into the field above.</li>
            </ol>
          </div>

          {/* Status Message */}
          {status && (
            <div
              id="api-key-status-msg"
              className={`p-3.5 rounded-2xl text-xs font-medium flex items-start gap-2.5 ${
                status.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                  : status.type === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50'
                  : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50'
              }`}
            >
              <span className="text-sm">
                {status.type === 'success' ? '✓' : status.type === 'error' ? '✕' : 'ℹ'}
              </span>
              <span className="leading-tight">{status.message}</span>
            </div>
          )}

          <div className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight flex items-center gap-1.5">
            <span>🔒</span>
            <span>Your key is kept only in your device&apos;s browser LocalStorage and never sent to external servers.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-3">
          <button
            id="cancel-api-key-btn"
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
          >
            {storedKey ? 'Close' : 'Cancel'}
          </button>

          <div className="flex items-center gap-2">
            <button
              id="save-api-key-btn"
              type="button"
              disabled={isValidating || !apiKey.trim()}
              onClick={() => handleSave(false)}
              className="px-6 py-2.5 rounded-2xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2"
            >
              {isValidating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Save & Activate</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
