
import React, { useState } from 'react';
import { UserProfile, CustomGoal } from '../types';
import { getStoredApiKey, hasApiKey } from '../services/geminiService';
import { TermsModal } from './TermsModal';
import { requestNotificationPermission, testNotification } from '../services/notificationService';

interface SettingsPageProps {
  userProfile: UserProfile;
  settings: {
    darkMode: boolean;
    notifications: boolean;
    units: string;
  };
  logsCount: number;
  onToggleSetting: (key: string) => void;
  onUpdateSetting: (key: string, value: any) => void;
  onEditProfile: () => void;
  onUpdateProfile: (profile: UserProfile) => void;
  onExportData: (format: 'pdf' | 'csv') => void;
  onResetApp: () => void;
  onOpenApiKeyModal: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({
  userProfile,
  settings,
  logsCount,
  onToggleSetting,
  onUpdateSetting,
  onEditProfile,
  onUpdateProfile,
  onExportData,
  onResetApp,
  onOpenApiKeyModal
}) => {
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoal, setNewGoal] = useState<Partial<CustomGoal>>({ type: 'hydration', target: 8, unit: 'cups' });
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'terms' | 'privacy' | 'help' | null>(null);
  const [testingNotification, setTestingNotification] = useState(false);

  const isKeyActive = hasApiKey();
  const currentKey = getStoredApiKey();

  const maskKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return `${key.slice(0, 6)}••••••••${key.slice(-4)}`;
  };

  const handleToggleNotifications = async () => {
    if (!settings.notifications) {
      await requestNotificationPermission();
    }
    onToggleSetting('notifications');
  };

  const handleTestNotification = async () => {
    setTestingNotification(true);
    await testNotification();
    setTimeout(() => setTestingNotification(false), 1500);
  };

  const handleAddGoal = () => {
      if (!newGoal.type || !newGoal.target) return;
      
      const labelMap: Record<string, string> = {
          'hydration': `Drink ${newGoal.target} ${newGoal.unit}`,
          'sleep': `Sleep ${newGoal.target} hours`,
          'workout': `Exercise ${newGoal.target}x`,
          'mindfulness': `Meditate ${newGoal.target} min`
      };

      const goal: CustomGoal = {
          id: Date.now().toString(),
          type: newGoal.type as any,
          target: Number(newGoal.target),
          unit: newGoal.unit || '',
          label: labelMap[newGoal.type] || 'Custom Goal',
          isActive: true
      };

      const updatedGoals = [...(userProfile.customGoals || []), goal];
      onUpdateProfile({ ...userProfile, customGoals: updatedGoals });
      setShowAddGoal(false);
      setNewGoal({ type: 'hydration', target: 8, unit: 'cups' });
  };

  const handleRemoveGoal = (id: string) => {
      const updatedGoals = userProfile.customGoals?.filter(g => g.id !== id) || [];
      onUpdateProfile({ ...userProfile, customGoals: updatedGoals });
  };

  const sections = [
    {
      title: "App Preferences",
      items: [
        {
          id: 'darkMode',
          icon: '🌙',
          label: 'Dark Mode',
          desc: 'Default dark obsidian theme for eye comfort',
          type: 'toggle',
          value: settings.darkMode,
          action: () => onToggleSetting('darkMode')
        },
        {
          id: 'notifications',
          icon: '🔔',
          label: 'Daily Reminders',
          desc: 'Morning vitality & evening reflection prompts',
          type: 'toggle',
          value: settings.notifications,
          action: handleToggleNotifications,
          extraAction: (
            <button
              onClick={handleTestNotification}
              disabled={testingNotification}
              className="mt-2 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              {testingNotification ? 'Sent! Check banner/notification' : '⚡ Send Test Reminder'}
            </button>
          )
        },
        {
          id: 'units',
          icon: '📏',
          label: 'Units',
          desc: 'Measurement system',
          type: 'select',
          value: settings.units,
          options: ['Metric', 'Imperial'],
          action: (val: string) => onUpdateSetting('units', val)
        }
      ]
    },
    {
      title: "Data & Storage",
      items: [
        {
          id: 'export_pdf',
          icon: '📄',
          label: 'Export PDF Report',
          desc: 'Detailed printable summary',
          type: 'button',
          action: () => onExportData('pdf'),
          btnLabel: 'Download PDF'
        },
        {
          id: 'export_csv',
          icon: '📊',
          label: 'Export CSV Data',
          desc: 'Raw data for spreadsheets',
          type: 'button',
          action: () => onExportData('csv'),
          btnLabel: 'Download CSV'
        },
        {
          id: 'reset',
          icon: '🗑️',
          label: 'Reset Application',
          desc: 'Permanently delete all data',
          type: 'button',
          danger: true,
          action: () => setShowResetConfirm(true),
          btnLabel: 'Reset All'
        }
      ]
    }
  ];

  return (
    <div className="p-6 pt-12 animate-fade-in pb-40">
      
      {/* Header */}
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Settings</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Manage your profile and preferences</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white dark:bg-[#161E2E] rounded-[32px] p-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-white/5 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10 flex items-center gap-5">
           <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
              {userProfile.name.charAt(0).toUpperCase()}
           </div>
           <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white truncate">{userProfile.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{userProfile.age}yo • {userProfile.gender}</p>
              <div className="flex gap-2">
                 <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-white/10 text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">{logsCount} Logs</span>
              </div>
           </div>
        </div>
        <button 
          onClick={onEditProfile}
          className="w-full mt-6 py-3 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-200 font-bold rounded-2xl text-sm hover:bg-slate-100 dark:hover:bg-white/10 transition-colors border border-slate-200 dark:border-white/5"
        >
          Edit Profile Details
        </button>
      </div>

      {/* Goals Section */}
      <div className="mb-8">
          <div className="flex justify-between items-center mb-4 ml-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Health Goals</h4>
              <button onClick={() => setShowAddGoal(!showAddGoal)} className="text-xs font-bold text-indigo-500 hover:text-indigo-600 transition-colors">
                  {showAddGoal ? 'Cancel' : '+ Add Goal'}
              </button>
          </div>
          
          {showAddGoal && (
              <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-[24px] mb-4 border border-slate-100 dark:border-white/10 animate-fade-in">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Type</label>
                          <select 
                            value={newGoal.type} 
                            onChange={(e) => {
                                const t = e.target.value;
                                let u = 'cups';
                                if (t === 'sleep') u = 'hours';
                                if (t === 'workout') u = 'times';
                                if (t === 'mindfulness') u = 'mins';
                                setNewGoal({...newGoal, type: t as any, unit: u});
                            }}
                            className="w-full p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold border border-slate-200 dark:border-white/10 outline-none"
                          >
                              <option value="hydration">Hydration</option>
                              <option value="sleep">Sleep</option>
                              <option value="workout">Exercise</option>
                              <option value="mindfulness">Mindfulness</option>
                          </select>
                      </div>
                      <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Target</label>
                          <div className="flex gap-2">
                              <input 
                                type="number" 
                                value={newGoal.target} 
                                onChange={(e) => setNewGoal({...newGoal, target: Number(e.target.value)})}
                                className="w-full p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold border border-slate-200 dark:border-white/10 outline-none"
                              />
                              <span className="self-center text-xs font-bold text-slate-400">{newGoal.unit}</span>
                          </div>
                      </div>
                  </div>
                  <button onClick={handleAddGoal} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl text-sm shadow-lg hover:bg-indigo-500 transition-colors">Save Goal</button>
              </div>
          )}

          <div className="space-y-3">
              {userProfile.customGoals && userProfile.customGoals.length > 0 ? (
                  userProfile.customGoals.map(goal => (
                      <div key={goal.id} className="bg-white dark:bg-[#161E2E] p-4 rounded-[20px] border border-slate-100 dark:border-white/5 flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                                  goal.type === 'hydration' ? 'bg-blue-100 text-blue-500 dark:bg-blue-900/30' :
                                  goal.type === 'sleep' ? 'bg-indigo-100 text-indigo-500 dark:bg-indigo-900/30' :
                                  goal.type === 'workout' ? 'bg-orange-100 text-orange-500 dark:bg-orange-900/30' :
                                  'bg-emerald-100 text-emerald-500 dark:bg-emerald-900/30'
                              }`}>
                                  {goal.type === 'hydration' ? '💧' : goal.type === 'sleep' ? '😴' : goal.type === 'workout' ? '💪' : '🧘'}
                              </div>
                              <div>
                                  <h5 className="font-bold text-sm text-slate-900 dark:text-white">{goal.label}</h5>
                                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Daily Target</p>
                              </div>
                          </div>
                          <button onClick={() => handleRemoveGoal(goal.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-2">✕</button>
                      </div>
                  ))
              ) : (
                  <div className="text-center p-6 bg-slate-50 dark:bg-white/5 rounded-[24px] border border-dashed border-slate-200 dark:border-white/10">
                      <p className="text-sm text-slate-400 font-medium">No specific goals set yet.</p>
                  </div>
              )}
          </div>
      </div>

      {/* AI & Gemini API Configuration */}
      <div className="mb-8">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 ml-2">AI Intelligence Engine</h4>
        <div className="bg-white dark:bg-[#161E2E] rounded-[28px] p-5 sm:p-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-white/5 space-y-4 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl shadow-sm shrink-0">
                🔑
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                  <span>Google Gemini API</span>
                  {isKeyActive ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                      Active
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                      Key Needed
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 break-all">
                  {isKeyActive
                    ? `Configured: ${maskKey(currentKey)}`
                    : 'Enter your personal key to enable AI features'}
                </p>
              </div>
            </div>

            <button
              id="settings-open-api-key-btn"
              onClick={onOpenApiKeyModal}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold transition-all text-center shrink-0 ${
                isKeyActive
                  ? 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/15'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-500/25'
              }`}
            >
              {isKeyActive ? 'Change Key' : 'Enter API Key'}
            </button>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 dark:text-slate-500">
            <span>Powers Vitality predictions, chat, and meal scanning</span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
            >
              Get free key ↗
            </a>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-8">
        {sections.map((section) => (
          <div key={section.title}>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 ml-2">{section.title}</h4>
            <div className="bg-white dark:bg-[#161E2E] rounded-[24px] border border-slate-100 dark:border-white/5 overflow-hidden shadow-sm">
              {section.items.map((item: any, idx) => (
                <div 
                  key={item.id} 
                  className={`p-4 flex items-center justify-between gap-3 transition-colors hover:bg-slate-50/50 dark:hover:bg-white/5 ${idx !== section.items.length - 1 ? 'border-b border-slate-50 dark:border-white/5' : ''}`}
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${item.danger ? 'bg-rose-50 text-rose-500 dark:bg-rose-500/10' : 'bg-slate-50 text-slate-600 dark:bg-white/5 dark:text-slate-300'}`}>
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <h5 className={`font-bold text-sm ${item.danger ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>{item.label}</h5>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">{item.desc}</p>
                      {item.extraAction}
                    </div>
                  </div>

                  {/* Controls */}
                  {item.type === 'toggle' && (
                    <button 
                      onClick={item.action}
                      className={`w-12 h-7 rounded-full transition-colors relative shrink-0 ${item.value ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-1 shadow-md transition-all duration-300 ${item.value ? 'left-6' : 'left-1'}`}></div>
                    </button>
                  )}

                  {item.type === 'button' && (
                    <button 
                      onClick={item.action}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 ${item.danger ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-white'}`}
                    >
                      {item.btnLabel}
                    </button>
                  )}
                  
                  {item.type === 'select' && (
                    <div className="flex bg-slate-100 dark:bg-black/20 rounded-lg p-1 shrink-0">
                        {item.options.map((opt: string) => (
                            <button
                                key={opt}
                                onClick={() => item.action(opt)}
                                className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${item.value === opt ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {/* About / Support */}
        <div className="text-center pt-8 pb-4">
            <div className="flex justify-center gap-6 mb-6">
                <button 
                  onClick={() => setLegalModalTab('help')}
                  className="text-xs font-bold text-slate-400 hover:text-indigo-500 transition-colors"
                >
                  Help Center
                </button>
                <button 
                  onClick={() => setLegalModalTab('privacy')}
                  className="text-xs font-bold text-slate-400 hover:text-indigo-500 transition-colors"
                >
                  Privacy Policy
                </button>
                <button 
                  onClick={() => setLegalModalTab('terms')}
                  className="text-xs font-bold text-slate-400 hover:text-indigo-500 transition-colors"
                >
                  Terms
                </button>
            </div>
            <p className="text-[10px] text-slate-300 dark:text-slate-600 uppercase tracking-widest font-bold">Hyprova Health v1.2.0</p>
        </div>
      </div>

      {/* Terms, Privacy & Help Modal */}
      <TermsModal
        isOpen={!!legalModalTab}
        initialTab={legalModalTab || 'terms'}
        onClose={() => setLegalModalTab(null)}
      />

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowResetConfirm(false)}></div>
            <div className="bg-white dark:bg-[#161E2E] rounded-[32px] p-6 max-w-sm w-full shadow-2xl border border-slate-100 dark:border-white/10 relative z-10 animate-slide-up">
                <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 rounded-full flex items-center justify-center text-3xl mb-4 mx-auto text-rose-500">
                    ⚠️
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white text-center mb-2">Reset Application?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-8 leading-relaxed">
                    This will permanently delete your profile, logs, and settings. This action cannot be undone.
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowResetConfirm(false)}
                        className="flex-1 py-4 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => {
                            setShowResetConfirm(false);
                            onResetApp();
                        }}
                        className="flex-1 py-4 bg-rose-500 text-white font-bold rounded-2xl shadow-lg shadow-rose-500/30 hover:bg-rose-600 transition-colors"
                    >
                        Yes, Reset
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default SettingsPage;
