import React from 'react';
import {
  DaySchedule,
  Member,
  isPlaceholder,
  getPlaceholderName,
  getDayName,
  getDayDateString,
  getWeekDateRange,
} from '../types';
import { Calendar, X, CheckCircle2, Dices, Award } from 'lucide-react';
import clsx from 'clsx';

interface ScheduleGridProps {
  schedule: DaySchedule[];
  membersMap: Map<string, Member>;
  selectedDayNumber: number;
  weekOffset: number;
  onSelectDay: (dayNumber: number) => void;
  onRemoveSlot: (dayNumber: number, slotType: 'conductor' | 'passenger') => void;
  onClearDay: (dayNumber: number) => void;
  onClearAll: () => void;
}

const RANK_BADGES: Record<string, string> = {
  r5: 'bg-amber-500 text-slate-950',
  r4: 'bg-amber-600/90 text-white',
  r3: 'bg-blue-600 text-white',
  r2: 'bg-emerald-600 text-white',
  r1: 'bg-purple-600 text-white',
};

export const ScheduleGrid: React.FC<ScheduleGridProps> = ({
  schedule,
  membersMap,
  selectedDayNumber,
  weekOffset,
  onSelectDay,
  onRemoveSlot,
  onClearDay,
  onClearAll,
}) => {
  const filledSlotsCount = schedule.reduce((acc, day) => {
    return acc + (day.conductorId ? 1 : 0) + (day.passengerId ? 1 : 0);
  }, 0);

  const weekInfo = getWeekDateRange(weekOffset);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col gap-3">
      {/* Schedule Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-400" />
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-100 tracking-wide">
              Weekly Train Schedule
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-500/30">
              {weekInfo.label}
            </span>
          </div>
          <span className={clsx(
            'text-xs font-semibold px-2 py-0.5 rounded-full border ml-1',
            filledSlotsCount === 14
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          )}>
            {filledSlotsCount} / 14 slots filled
          </span>
        </div>

        {filledSlotsCount > 0 && (
          <button
            onClick={() => {
              if (confirm('Clear the entire weekly schedule?')) {
                onClearAll();
              }
            }}
            className="text-xs text-slate-400 hover:text-red-400 transition"
          >
            Clear All Schedule
          </button>
        )}
      </div>

      {/* 7-Day Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {schedule.map((day) => {
          const isSelected = day.dayNumber === selectedDayNumber;
          const conductor = day.conductorId ? membersMap.get(day.conductorId) : null;
          const passenger = day.passengerId ? membersMap.get(day.passengerId) : null;
          const isPassengerFilled = !!passenger || isPlaceholder(day.passengerId);
          const isDayComplete = !!conductor && isPassengerFilled;
          const dayDateStr = getDayDateString(day.dayNumber, weekOffset);

          return (
            <div
              key={day.dayNumber}
              onClick={() => onSelectDay(day.dayNumber)}
              className={clsx(
                'flex flex-col rounded-xl border p-2.5 transition cursor-pointer relative',
                isSelected
                  ? 'bg-slate-800/95 border-indigo-500 ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-950/50'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
              )}
            >
              {/* Day Card Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className={clsx(
                      'text-xs font-bold uppercase tracking-wider',
                      isSelected ? 'text-indigo-300' : 'text-slate-200'
                    )}>
                      {getDayName(day.dayNumber)}
                    </span>
                    {isDayComplete && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium font-mono">
                    {dayDateStr}
                  </span>
                </div>

                {(conductor || passenger || isPlaceholder(day.passengerId)) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearDay(day.dayNumber);
                    }}
                    title={`Clear ${getDayName(day.dayNumber)}`}
                    className="text-slate-500 hover:text-red-400 p-0.5 rounded transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Slot 1: Conductor (R4/R5) */}
              <div className="flex flex-col gap-1 mb-2">
                <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  Conductor (R4/R5)
                </span>
                {conductor ? (
                  <div className="flex items-center justify-between bg-amber-950/20 border border-amber-500/30 rounded px-2 py-1.5">
                    <div className="flex items-center gap-1.5 min-w-0 pr-1">
                      <span className={clsx('text-[9px] font-black uppercase px-1 py-0.2 rounded', RANK_BADGES[conductor.level])}>
                        {conductor.level}
                      </span>
                      <span className="text-xs font-semibold text-amber-200 truncate">
                        {conductor.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveSlot(day.dayNumber, 'conductor');
                      }}
                      className="text-amber-400/60 hover:text-amber-300 p-0.5"
                      title="Remove conductor"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-700/80 rounded px-2 py-1.5 text-[11px] text-slate-500 text-center italic bg-slate-900/40">
                    Empty slot
                  </div>
                )}
              </div>

              {/* Slot 2: Passenger (R1/R2/R3 or Placeholder) */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  Passenger (R1-R3)
                </span>
                {passenger ? (
                  <div className="flex items-center justify-between bg-blue-950/20 border border-blue-500/30 rounded px-2 py-1.5">
                    <div className="flex items-center gap-1.5 min-w-0 pr-1">
                      <span className={clsx('text-[9px] font-black uppercase px-1 py-0.2 rounded', RANK_BADGES[passenger.level])}>
                        {passenger.level}
                      </span>
                      <span className="text-xs font-semibold text-blue-200 truncate">
                        {passenger.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveSlot(day.dayNumber, 'passenger');
                      }}
                      className="text-blue-400/60 hover:text-blue-300 p-0.5"
                      title="Remove passenger"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : isPlaceholder(day.passengerId) ? (
                  <div className="flex items-center justify-between bg-violet-950/30 border border-violet-500/40 rounded px-2 py-1.5">
                    <div className="flex items-center gap-1.5 min-w-0 pr-1">
                      {day.passengerId === '__PLACEHOLDER_ROLL_THE_DICE__' ? (
                        <Dices className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                      ) : (
                        <Award className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      )}
                      <span className="text-xs font-semibold text-violet-200 truncate italic">
                        {getPlaceholderName(day.passengerId)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveSlot(day.dayNumber, 'passenger');
                      }}
                      className="text-violet-400/60 hover:text-violet-300 p-0.5"
                      title="Remove placeholder"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-700/80 rounded px-2 py-1.5 text-[11px] text-slate-500 text-center italic bg-slate-900/40">
                    Empty slot
                  </div>
                )}
              </div>

              {/* Selection indicator pill */}
              {isSelected && (
                <div className="mt-2 text-center">
                  <span className="text-[10px] font-bold text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded-full border border-indigo-500/30">
                    Active Target Day
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
