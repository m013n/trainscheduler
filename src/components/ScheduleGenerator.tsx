import React, { useState } from 'react';
import {
  DaySchedule,
  Member,
  PLACEHOLDER_ROLL_DICE,
  PLACEHOLDER_NOMINATION,
  isPlaceholder,
  getPlaceholderName,
  getDayName,
  getDayShortName,
  getWeekDateRange,
} from '../types';
import { copyToClipboard } from '../services/storage';
import { Copy, Check, Sparkles, AlertCircle, Train, Dices, Award, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import clsx from 'clsx';

interface ScheduleGeneratorProps {
  schedule: DaySchedule[];
  membersMap: Map<string, Member>;
  selectedMember: Member | null;
  selectedDayNumber: number;
  weekOffset: number;
  onWeekOffsetChange: (offset: number) => void;
  onAllAboard: () => void;
  onSetPlaceholder: (placeholderType: string) => void;
  onSelectDay: (day: number) => void;
}

export const ScheduleGenerator: React.FC<ScheduleGeneratorProps> = ({
  schedule,
  membersMap,
  selectedMember,
  selectedDayNumber,
  weekOffset,
  onWeekOffsetChange,
  onAllAboard,
  onSetPlaceholder,
  onSelectDay,
}) => {
  const [copied, setCopied] = useState(false);
  const [previewText, setPreviewText] = useState<string | null>(null);

  // Check if all 14 slots are populated
  const isComplete = schedule.every(
    (day) => day.conductorId !== null && day.passengerId !== null
  );

  const filledCount = schedule.reduce(
    (acc, day) => acc + (day.conductorId ? 1 : 0) + (day.passengerId ? 1 : 0),
    0
  );

  const currentWeekInfo = getWeekDateRange(weekOffset);

  // Generate plain text formatted string with selected week date range header
  const generateScheduleText = (): string => {
    const header = `Train Schedule ${currentWeekInfo.formattedRange}\n`;
    const lines = schedule.map((day) => {
      const conductor = day.conductorId ? membersMap.get(day.conductorId) : null;
      let passengerName = 'None';
      if (day.passengerId) {
        if (isPlaceholder(day.passengerId)) {
          passengerName = getPlaceholderName(day.passengerId) || 'None';
        } else {
          const passenger = membersMap.get(day.passengerId);
          passengerName = passenger ? passenger.name : 'None';
        }
      }
      const conductorName = conductor ? conductor.name : 'None';
      const dayName = getDayName(day.dayNumber);
      const noteSuffix = day.notes?.trim() ? ` (${day.notes.trim()})` : '';
      return `${dayName}: ${conductorName} - ${passengerName}${noteSuffix}`;
    });

    return `${header}${lines.join('\n')}`;
  };

  const handleGenerate = async () => {
    if (!isComplete) return;
    const text = generateScheduleText();
    setPreviewText(text);
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // Determine what role the selected member will fill
  const isConductor = selectedMember ? (selectedMember.level === 'r4' || selectedMember.level === 'r5') : false;
  const roleLabel = isConductor ? 'Conductor Slot' : 'Passenger Slot';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col gap-4">
      {/* Top Bar: Week Selector & Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        {/* Week Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span className="text-xs text-slate-400 font-semibold uppercase">Schedule Week:</span>
            
            <div className="flex items-center gap-1 ml-1">
              <button
                type="button"
                onClick={() => onWeekOffsetChange(weekOffset - 1)}
                title="Previous Week"
                className="p-1 rounded bg-slate-700/80 hover:bg-slate-600 text-slate-300 hover:text-white transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="text-xs font-bold text-indigo-200 px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-500/30">
                {currentWeekInfo.label}
              </span>

              <button
                type="button"
                onClick={() => onWeekOffsetChange(weekOffset + 1)}
                title="Next Week"
                className="p-1 rounded bg-slate-700/80 hover:bg-slate-600 text-slate-300 hover:text-white transition"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {weekOffset !== 1 && (
            <button
              type="button"
              onClick={() => onWeekOffsetChange(1)}
              className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium"
            >
              Reset to Next Week
            </button>
          )}
        </div>

        {/* Generate Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!isComplete}
            className={clsx(
              'flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition shadow-lg',
              isComplete
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 active:scale-95 cursor-pointer animate-pulse'
                : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed'
            )}
          >
            {copied ? (
              <>
                <Check className="w-5 h-5 text-emerald-200" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Generate Train Schedule</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Action Bar: Target Day + All Aboard! + Placeholders */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Target Day selector + All Aboard! + Placeholders */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            <span className="text-xs text-slate-400 font-semibold uppercase">Target Day:</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => onSelectDay(num)}
                  title={getDayName(num)}
                  className={clsx(
                    'px-2 py-1 rounded text-xs font-bold transition flex items-center justify-center min-w-[34px]',
                    selectedDayNumber === num
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/50'
                      : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700 hover:text-white'
                  )}
                >
                  {getDayShortName(num)}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onAllAboard}
            disabled={!selectedMember}
            className={clsx(
              'flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition shadow-md',
              selectedMember
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/20 active:scale-95 cursor-pointer'
                : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60'
            )}
          >
            <Train className="w-5 h-5" />
            {selectedMember ? (
              <span>Add {selectedMember?.name} to {getDayName(selectedDayNumber)}</span>
            ) : (
              <span>Select a member to add to {getDayName(selectedDayNumber)}</span>
            )}
          </button>

          {/* Placeholders for Passenger Spots */}
          <div className="flex items-center gap-1.5 bg-slate-800/60 p-1 rounded-lg border border-slate-700/80">
            <span className="text-[11px] text-slate-400 font-medium px-1.5">Placeholders:</span>
            <button
              type="button"
              onClick={() => onSetPlaceholder(PLACEHOLDER_ROLL_DICE)}
              title={`Put "Roll the dice" in ${getDayName(selectedDayNumber)} passenger slot`}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-pink-950/60 text-pink-300 hover:text-pink-200 border border-pink-500/30 hover:border-pink-500/60 px-2.5 py-1.5 rounded-md text-xs font-semibold transition active:scale-95 cursor-pointer"
            >
              <Dices className="w-3.5 h-3.5 text-pink-400" />
              <span>Roll the dice</span>
            </button>
            <button
              type="button"
              onClick={() => onSetPlaceholder(PLACEHOLDER_NOMINATION)}
              title={`Put "Nomination" in ${getDayName(selectedDayNumber)} passenger slot`}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-cyan-950/60 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 hover:border-cyan-500/60 px-2.5 py-1.5 rounded-md text-xs font-semibold transition active:scale-95 cursor-pointer"
            >
              <Award className="w-3.5 h-3.5 text-cyan-400" />
              <span>Nomination</span>
            </button>
          </div>

          {selectedMember ? (
            <span className="text-xs text-slate-300">
              Put <strong className="text-amber-300 font-semibold">{selectedMember.name}</strong> into {getDayName(selectedDayNumber)} <span className="text-indigo-400 font-medium">({roleLabel})</span>
            </span>
          ) : (
            <span className="text-xs text-slate-500 italic">
              Select a member or placeholder for {getDayName(selectedDayNumber)}
            </span>
          )}
        </div>
      </div>

      {/* Completion Status Alert / Guidance */}
      {!isComplete ? (
        <div className="flex items-center gap-2 text-xs text-amber-400/90 bg-amber-950/20 border border-amber-500/20 px-3.5 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            Fill all 14 schedule slots (1 Conductor and 1 Passenger for each day) to enable schedule generation. Currently: <strong>{filledCount} / 14 filled</strong>.
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-500/30 px-3.5 py-2 rounded-lg">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 flex-shrink-0 text-emerald-300" />
            <span>
              All 7 days for <strong>{currentWeekInfo.formattedRange}</strong> are complete! Click <strong>"Generate Train Schedule"</strong> to copy to clipboard.
            </span>
          </div>
          {copied && (
            <span className="bg-emerald-500 text-slate-950 px-2 py-0.5 rounded text-[11px] font-bold">
              COPIED TO CLIPBOARD
            </span>
          )}
        </div>
      )}

      {/* Text Preview Modal / Accordion if generated */}
      {previewText && (
        <div className="mt-2 bg-slate-950 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
            <span className="text-xs font-semibold text-slate-400">Generated Plain Text Output ({currentWeekInfo.formattedRange}):</span>
            <button
              onClick={handleGenerate}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Again</span>
            </button>
          </div>
          <pre className="text-xs font-mono text-emerald-300 bg-slate-900/90 p-3 rounded border border-slate-800 overflow-x-auto whitespace-pre">
            {previewText}
          </pre>
        </div>
      )}
    </div>
  );
};
