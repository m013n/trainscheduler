import React from 'react';
import {
  DaySchedule,
  Member,
  ScheduleHistory,
  isPlaceholder,
  getPlaceholderName,
  getDayShortName,
  getDayDateString,
  getWeekDateRange,
  getWeekKey,
} from '../types';
import { DEFAULT_SCHEDULE } from '../services/storage';
import { Dices, Award } from 'lucide-react';
import clsx from 'clsx';

interface PriorWeeksPreviewProps {
  weekOffset: number;
  scheduleHistory: ScheduleHistory;
  membersMap: Map<string, Member>;
}

const RANK_BADGES: Record<string, string> = {
  r5: 'bg-amber-500 text-slate-950',
  r4: 'bg-amber-600/90 text-white',
  r3: 'bg-blue-600 text-white',
  r2: 'bg-emerald-600 text-white',
  r1: 'bg-purple-600 text-white',
};

const PriorWeekRow: React.FC<{
  offset: number;
  schedule: DaySchedule[];
  membersMap: Map<string, Member>;
}> = ({ offset, schedule, membersMap }) => {
  const weekInfo = getWeekDateRange(offset);
  const filledSlotsCount = schedule.reduce((acc, day) => {
    return acc + (day.conductorId ? 1 : 0) + (day.passengerId ? 1 : 0);
  }, 0);

  return (
    <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-300">{weekInfo.label}</span>
        <span className={clsx(
          'text-[10px] font-semibold px-1.5 py-0.5 rounded-full border',
          filledSlotsCount === 14
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            : 'bg-slate-800 text-slate-400 border-slate-700'
        )}>
          {filledSlotsCount} / 14
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {schedule.map((day) => {
          const conductor = day.conductorId ? membersMap.get(day.conductorId) : null;
          const passenger = day.passengerId ? membersMap.get(day.passengerId) : null;

          return (
            <div key={day.dayNumber} className="flex flex-col rounded-lg border border-slate-800 bg-slate-900/60 p-1.5 gap-1">
              <div className="flex items-baseline justify-between">
                <span className="text-[9px] font-bold uppercase text-slate-400">
                  {getDayShortName(day.dayNumber)}
                </span>
                <span className="text-[8px] text-slate-500 font-mono">
                  {getDayDateString(day.dayNumber, offset)}
                </span>
              </div>

              {conductor ? (
                <div className="flex items-center gap-1 bg-amber-950/20 border border-amber-500/30 rounded px-1 py-0.5 min-w-0">
                  <span className={clsx('text-[7px] font-black uppercase px-0.5 rounded shrink-0', RANK_BADGES[conductor.level])}>
                    {conductor.level}
                  </span>
                  <span className="text-[9px] font-semibold text-amber-200 truncate">{conductor.name}</span>
                </div>
              ) : (
                <div className="border border-dashed border-slate-700/60 rounded px-1 py-0.5 text-[8px] text-slate-600 text-center italic">
                  Empty
                </div>
              )}

              {passenger ? (
                <div className="flex items-center gap-1 bg-blue-950/20 border border-blue-500/30 rounded px-1 py-0.5 min-w-0">
                  <span className={clsx('text-[7px] font-black uppercase px-0.5 rounded shrink-0', RANK_BADGES[passenger.level])}>
                    {passenger.level}
                  </span>
                  <span className="text-[9px] font-semibold text-blue-200 truncate">{passenger.name}</span>
                </div>
              ) : isPlaceholder(day.passengerId) ? (
                <div className="flex items-center gap-1 bg-violet-950/30 border border-violet-500/40 rounded px-1 py-0.5 min-w-0">
                  {day.passengerId === '__PLACEHOLDER_ROLL_THE_DICE__' ? (
                    <Dices className="w-2.5 h-2.5 text-pink-400 shrink-0" />
                  ) : (
                    <Award className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                  )}
                  <span className="text-[9px] font-semibold text-violet-200 truncate italic">
                    {getPlaceholderName(day.passengerId)}
                  </span>
                </div>
              ) : (
                <div className="border border-dashed border-slate-700/60 rounded px-1 py-0.5 text-[8px] text-slate-600 text-center italic">
                  Empty
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const PriorWeeksPreview: React.FC<PriorWeeksPreviewProps> = ({
  weekOffset,
  scheduleHistory,
  membersMap,
}) => {
  const priorOffsets = [weekOffset - 1, weekOffset - 2, weekOffset - 3];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col gap-3">
      <h3 className="text-sm font-bold text-slate-300 tracking-wide">Previous 3 Weeks</h3>
      <div className="flex flex-col gap-2.5">
        {priorOffsets.map((offset) => (
          <PriorWeekRow
            key={offset}
            offset={offset}
            schedule={scheduleHistory[getWeekKey(offset)] || DEFAULT_SCHEDULE}
            membersMap={membersMap}
          />
        ))}
      </div>
    </div>
  );
};
