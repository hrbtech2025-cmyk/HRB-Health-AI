
import React, { useState, useMemo } from 'react';
import { LogEntry } from '../types';

interface CycleTrackerProps {
  logs: LogEntry[];
  onClose: () => void;
  onSaveLog: (entry: any) => void;
}

const CycleTracker: React.FC<CycleTrackerProps> = ({ logs, onClose, onSaveLog }) => {
  const [viewDate, setViewDate] = useState(new Date()); // The month being viewed
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date()); // Default to today for phase info

  // Constants for calculation (Standardizing for MVP)
  const AVG_CYCLE = 28;
  const AVG_DURATION = 5;

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const currentMonth = viewDate.getMonth();
  const currentYear = viewDate.getFullYear();
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  // --- Cycle Analysis Logic ---
  
  // 1. Get confirmed logged dates
  const periodDays = useMemo(() => {
    const daySet = new Set<string>();
    logs.filter(l => l.menstruation && l.menstruation.flow).forEach(l => {
      daySet.add(new Date(l.timestamp).toDateString());
    });
    return daySet;
  }, [logs]);

  // 2. Find the start date of the MOST RECENT cycle
  const lastCycleStart = useMemo(() => {
    const periodLogs = logs
        .filter(l => l.menstruation && l.menstruation.flow)
        .sort((a,b) => b.timestamp - a.timestamp); // Newest first

    if (periodLogs.length === 0) return null;

    // We assume the newest log is part of the current/latest cycle.
    // To find the START of this block, we look for a gap > 7 days.
    let currentStart = periodLogs[0];
    
    // Iterate backwards through logs to find the "start" of this cluster
    for (let i = 0; i < periodLogs.length - 1; i++) {
        const current = periodLogs[i];
        const nextOlder = periodLogs[i+1];
        const diffDays = (current.timestamp - nextOlder.timestamp) / (1000 * 60 * 60 * 24);
        
        if (diffDays <= 7) {
            // They are part of the same cycle, keep going back
            currentStart = nextOlder;
        } else {
            // Gap found, currentStart is indeed the start of the latest cycle
            break;
        }
    }
    return new Date(currentStart.timestamp);
  }, [logs]);

  // 3. Generate Predicted Dates for the next 3 months
  const predictedDays = useMemo(() => {
    if (!lastCycleStart) return new Set<string>();
    
    const predictions = new Set<string>();
    let predictionStart = new Date(lastCycleStart);
    
    // Project 3 cycles into the future
    for (let cycle = 1; cycle <= 3; cycle++) {
        // Move to next cycle start
        predictionStart.setDate(predictionStart.getDate() + AVG_CYCLE);
        
        // Add duration days
        for (let d = 0; d < AVG_DURATION; d++) {
            const pDay = new Date(predictionStart);
            pDay.setDate(pDay.getDate() + d);
            predictions.add(pDay.toDateString());
        }
    }
    return predictions;
  }, [lastCycleStart]);

  // 4. Calculate Phase for Selected Date
  const cycleInfo = useMemo(() => {
      // Use selected date or fallback to today
      const targetDate = selectedDate || new Date();
      
      if (!lastCycleStart) return { day: 0, phase: 'Track Cycle', description: 'Log your last period to start tracking.', icon: '📅' };

      const diffTime = targetDate.getTime() - lastCycleStart.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return { day: 0, phase: 'History', description: 'Past cycle data', icon: '📝' };

      const cycleDay = (diffDays % AVG_CYCLE) + 1; // 1-based index

      let phase = '';
      let description = '';
      let icon = '';

      if (cycleDay >= 1 && cycleDay <= 5) {
          phase = 'Menstruation';
          description = 'Energy may be low. Prioritize rest and hydration.';
          icon = '🩸';
      } else if (cycleDay >= 6 && cycleDay <= 11) {
          phase = 'Follicular';
          description = 'Energy rising. Good time for strength training.';
          icon = '🌱';
      } else if (cycleDay >= 12 && cycleDay <= 16) {
          phase = 'Ovulation';
          description = 'Peak energy and confidence. Socialize and move.';
          icon = '✨';
      } else {
          phase = 'Luteal';
          description = 'Winding down. You may feel PMS symptoms.';
          icon = '🌙';
      }

      return { day: cycleDay, phase, description, icon };
  }, [selectedDate, lastCycleStart]);


  const handleSave = () => {
    if (selectedDate && onSaveLog) {
      onSaveLog({
        timestamp: selectedDate.getTime(),
        mood: 3,
        energyLevel: 5,
        stressLevel: 5,
        sleepHours: 0,
        hydrationCups: 0,
        symptoms: [],
        tags: ['Period'],
        menstruation: { flow: 'Medium' }, 
      });
      onClose(); // Close modal immediately to confirm action
    }
  };

  const renderCalendar = () => {
    const days = [];
    const today = new Date().toDateString();

    // Empty cells
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10"></div>);
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dateString = date.toDateString();
      const isToday = dateString === today;
      const isSelected = selectedDate?.toDateString() === dateString;
      
      const isLoggedPeriod = periodDays.has(dateString);
      const isPredicted = predictedDays.has(dateString);

      days.push(
        <button
          key={day}
          onClick={() => setSelectedDate(date)}
          className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all relative
            ${isSelected 
              ? 'bg-slate-900 text-white shadow-lg scale-110 z-20' 
              : isLoggedPeriod 
                ? 'bg-pink-500 text-white shadow-md shadow-pink-500/30' 
                : isPredicted
                    ? 'border-2 border-dashed border-pink-300 text-pink-400 bg-pink-50'
                    : 'text-slate-700 hover:bg-slate-100'
            }
            ${isToday && !isSelected && !isLoggedPeriod ? 'border border-slate-300 bg-slate-50' : ''}
          `}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl animate-slide-up relative overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Decorative Background */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-pink-500 to-rose-600 opacity-10 pointer-events-none"></div>
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-pink-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex-1 overflow-y-auto hide-scrollbar">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-900">Cycle Calendar</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">✕</button>
          </div>

          {/* Month Nav */}
          <div className="flex justify-between items-center mb-6 px-2">
            <button onClick={handlePrevMonth} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">←</button>
            <span className="text-lg font-bold text-slate-800">
              {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={handleNextMonth} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">→</button>
          </div>

          {/* Calendar Grid */}
          <div className="mb-4">
            <div className="grid grid-cols-7 text-center mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                <div key={d} className="text-[10px] font-bold text-slate-400 uppercase">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-2 justify-items-center">
              {renderCalendar()}
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex justify-center gap-4 mb-6">
             <div className="flex items-center gap-1.5">
                 <div className="w-2.5 h-2.5 rounded-full bg-pink-500"></div>
                 <span className="text-[10px] font-bold text-slate-500 uppercase">Logged</span>
             </div>
             <div className="flex items-center gap-1.5">
                 <div className="w-2.5 h-2.5 rounded-full border-2 border-dashed border-pink-300 bg-pink-50"></div>
                 <span className="text-[10px] font-bold text-slate-500 uppercase">Predicted</span>
             </div>
          </div>

          {/* Phase Card */}
          {cycleInfo && (
              <div className="mb-6 p-5 bg-gradient-to-br from-slate-50 to-white border border-pink-100 rounded-2xl shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-pink-500/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                  
                  <div className="flex justify-between items-start mb-2 relative z-10">
                      <div>
                          <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                             {selectedDate?.toDateString() === new Date().toDateString() ? 'Today' : selectedDate?.toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                          </p>
                          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                             {cycleInfo.phase} <span className="text-lg">{cycleInfo.icon}</span>
                          </h3>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                          <span className="text-sm font-black text-pink-500">{cycleInfo.day > 0 ? cycleInfo.day : '?'}</span>
                      </div>
                  </div>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed relative z-10">
                      {cycleInfo.description}
                  </p>
              </div>
          )}

          {/* Action */}
          <div className="space-y-3">
             <button 
                onClick={handleSave}
                disabled={!selectedDate}
                className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl shadow-slate-900/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none hover:bg-slate-800"
             >
                {selectedDate ? `Log Period for ${selectedDate.toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}` : 'Select a Date'}
             </button>
             <p className="text-[10px] text-center text-slate-400 font-medium">
               This will update your cycle predictions immediately.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CycleTracker;
