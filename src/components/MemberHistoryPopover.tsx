import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Member,
  ScheduleHistory,
  getWeekKey,
  getDayShortName,
} from '../types';
import { X, TrainFront } from 'lucide-react';
import clsx from 'clsx';

interface MemberHistoryPopoverProps {
  member: Member;
  scheduleHistory: ScheduleHistory;
  anchorRect: DOMRect;
  onClose: () => void;
}

interface RideEntry {
  weekKey: string;
  date: Date;
  role: 'Conductor' | 'Passenger';
  notes?: string;
}

const RANK_BADGES: Record<string, string> = {
  r5: 'bg-amber-500 text-slate-950',
  r4: 'bg-amber-600/90 text-white',
  r3: 'bg-blue-600 text-white',
  r2: 'bg-emerald-600 text-white',
  r1: 'bg-purple-600 text-white',
};

const POPOVER_WIDTH = 264; // w-64
const POPOVER_MAX_HEIGHT = 320;
const POPOVER_MARGIN = 8;

function formatRideDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}/${String(date.getFullYear()).slice(-2)}`;
}

export const MemberHistoryPopover: React.FC<MemberHistoryPopoverProps> = ({
  member,
  scheduleHistory,
  anchorRect,
  onClose,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  // Collect past + current-week rides for this member, most recent first
  const rides = useMemo<RideEntry[]>(() => {
    const currentWeekKey = getWeekKey(0);
    const result: RideEntry[] = [];

    for (const [weekKey, days] of Object.entries(scheduleHistory)) {
      if (weekKey > currentWeekKey) continue; // Skip future weeks
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(weekKey);
      if (!match) continue;
      const monday = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      if (Number.isNaN(monday.getTime())) continue;

      for (const day of days) {
        let role: RideEntry['role'] | null = null;
        if (day.conductorId === member.id) role = 'Conductor';
        else if (day.passengerId === member.id) role = 'Passenger';
        if (!role) continue;

        const date = new Date(monday);
        date.setDate(monday.getDate() + (day.dayNumber - 1));
        result.push({ weekKey, date, role, notes: day.notes?.trim() || undefined });
      }
    }

    return result.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [scheduleHistory, member.id]);

  const conductorCount = useMemo(() => rides.filter((r) => r.role === 'Conductor').length, [rides]);
  const passengerCount = rides.length - conductorCount;

  // Position: prefer right of anchor, flip left if needed, clamp vertically
  useEffect(() => {
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const measuredHeight = popoverRef.current?.offsetHeight ?? 0;
    const height = Math.min(measuredHeight || POPOVER_MAX_HEIGHT, POPOVER_MAX_HEIGHT);

    let left = anchorRect.right + POPOVER_MARGIN;
    if (left + POPOVER_WIDTH > viewportW - POPOVER_MARGIN) {
      left = anchorRect.left - POPOVER_WIDTH - POPOVER_MARGIN;
    }
    left = Math.max(POPOVER_MARGIN, Math.min(left, viewportW - POPOVER_WIDTH - POPOVER_MARGIN));

    let top = anchorRect.top;
    if (top + height > viewportH - POPOVER_MARGIN) {
      top = viewportH - height - POPOVER_MARGIN;
    }
    top = Math.max(POPOVER_MARGIN, top);

    setPosition({ top, left });
  }, [anchorRect, rides.length]);

  // Dismissal: Escape, outside click, scroll, resize.
  // Guard against the same click event that opened the popover (mousedown fires before click).
  const openedAtRef = useRef<number>(Date.now());
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClickOutside = (e: MouseEvent) => {
      // Ignore clicks within the same event loop tick that opened the popover
      if (Date.now() - openedAtRef.current < 10) return;
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleScrollOrResize = () => onClose();

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [onClose]);

  return (
    <div
      ref={popoverRef}
      style={{
        top: position?.top ?? anchorRect.top,
        left: position?.left ?? anchorRect.right + POPOVER_MARGIN,
        visibility: position ? 'visible' : 'hidden',
      }}
      className="fixed z-50 w-64 max-h-[320px] flex flex-col bg-slate-900 border border-slate-700 rounded-xl shadow-2xl text-xs overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-slate-800 bg-gradient-to-r from-indigo-950/50 to-slate-900 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <TrainFront className="w-4 h-4 text-indigo-400 shrink-0" />
          <span
            className={clsx(
              'text-[9px] uppercase px-1.5 py-0.5 rounded tracking-wider font-bold shrink-0',
              RANK_BADGES[member.level] || 'bg-slate-700 text-slate-200'
            )}
          >
            {member.level}
          </span>
          <span className="font-bold text-slate-100 truncate">{member.name}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Close"
          className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-700 transition shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Ride list */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
        {rides.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-slate-500 py-6 gap-1.5">
            <TrainFront className="w-6 h-6 opacity-40" />
            <span className="italic">No past train rides recorded.</span>
          </div>
        ) : (
          rides.map((ride, idx) => (
            <div
              key={`${ride.weekKey}-${ride.date.getTime()}-${idx}`}
              className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-slate-800/50 border border-slate-800"
            >
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-slate-200">
                  {getDayShortName(ride.date.getDay() === 0 ? 7 : ride.date.getDay())} · {formatRideDate(ride.date)}
                </span>
                {ride.notes && (
                  <span className="text-[10px] text-slate-500 italic truncate" title={ride.notes}>
                    {ride.notes}
                  </span>
                )}
              </div>
              <span
                className={clsx(
                  'text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0',
                  ride.role === 'Conductor'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                )}
              >
                {ride.role}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Footer summary */}
      {rides.length > 0 && (
        <div className="px-3 py-1.5 border-t border-slate-800 text-[10px] text-slate-400 font-medium shrink-0">
          {rides.length} ride{rides.length === 1 ? '' : 's'} · {conductorCount}× Conductor · {passengerCount}× Passenger
        </div>
      )}
    </div>
  );
};
