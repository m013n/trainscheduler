import React from 'react';
import { Member, ListCategory } from '../types';
import { Bookmark, ArrowUp, ArrowDown, Shield, Users } from 'lucide-react';
import clsx from 'clsx';

interface ListBoxProps {
  category: ListCategory;
  title: string;
  subtitle?: string;
  members: Member[];
  selectedMemberId: string | null;
  bookmarkedMemberId: string | null;
  onSelectMember: (member: Member) => void;
  onToggleBookmark: (category: ListCategory, memberId: string) => void;
  onMoveUp?: (memberId: string) => void;
  onMoveDown?: (memberId: string) => void;
}

const CATEGORY_STYLES: Record<ListCategory, {
  border: string;
  badge: string;
  headerBg: string;
  accent: string;
  rankColor: Record<string, string>;
}> = {
  conductors: {
    border: 'border-amber-500/40 focus-within:border-amber-500',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    headerBg: 'bg-gradient-to-r from-amber-950/40 to-slate-900',
    accent: 'text-amber-400',
    rankColor: {
      r5: 'bg-amber-500 text-slate-950 font-black',
      r4: 'bg-amber-600/80 text-amber-100 font-bold',
    },
  },
  r3: {
    border: 'border-blue-500/40 focus-within:border-blue-500',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    headerBg: 'bg-gradient-to-r from-blue-950/40 to-slate-900',
    accent: 'text-blue-400',
    rankColor: {
      r3: 'bg-blue-600 text-white font-bold',
    },
  },
  r2: {
    border: 'border-emerald-500/40 focus-within:border-emerald-500',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    headerBg: 'bg-gradient-to-r from-emerald-950/40 to-slate-900',
    accent: 'text-emerald-400',
    rankColor: {
      r2: 'bg-emerald-600 text-white font-bold',
    },
  },
  r1: {
    border: 'border-purple-500/40 focus-within:border-purple-500',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    headerBg: 'bg-gradient-to-r from-purple-950/40 to-slate-900',
    accent: 'text-purple-400',
    rankColor: {
      r1: 'bg-purple-600 text-white font-bold',
    },
  },
};

export const ListBox: React.FC<ListBoxProps> = ({
  category,
  title,
  subtitle,
  members,
  selectedMemberId,
  bookmarkedMemberId,
  onSelectMember,
  onToggleBookmark,
  onMoveUp,
  onMoveDown,
}) => {
  const styles = CATEGORY_STYLES[category];
  const isConductorBox = category === 'conductors';

  // Find index of selected member if in this list
  const selectedIndex = members.findIndex((m) => m.id === selectedMemberId);
  const isSelectedInThisList = selectedIndex !== -1;
  const canMoveUp = isConductorBox && isSelectedInThisList && selectedIndex > 0;
  const canMoveDown = isConductorBox && isSelectedInThisList && selectedIndex < members.length - 1;

  return (
    <div className={clsx(
      'flex flex-col h-[460px] rounded-xl bg-slate-900/90 border shadow-md transition overflow-hidden',
      styles.border
    )}>
      {/* Box Header */}
      <div className={clsx('px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between rounded-t-xl shrink-0', styles.headerBg)}>
        <div className="flex items-center gap-2">
          {isConductorBox ? (
            <span className="text-lg" role="img" aria-label="train">🚂</span>
          ) : (
            <Shield className={clsx('w-4 h-4', styles.accent)} />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-100 tracking-wide">{title}</h3>
              <span className={clsx('text-[11px] font-semibold px-1.5 py-0.5 rounded border', styles.badge)}>
                {members.length}
              </span>
            </div>
            {subtitle && (
              <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Reorder Buttons for Train Conductors */}
        {isConductorBox && (
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60">
            <button
              type="button"
              onClick={() => selectedMemberId && onMoveUp?.(selectedMemberId)}
              disabled={!canMoveUp}
              title={canMoveUp ? 'Move Selected Up' : 'Select a conductor to move up'}
              className="p-1 rounded text-amber-400 hover:text-amber-300 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => selectedMemberId && onMoveDown?.(selectedMemberId)}
              disabled={!canMoveDown}
              title={canMoveDown ? 'Move Selected Down' : 'Select a conductor to move down'}
              className="p-1 rounded text-amber-400 hover:text-amber-300 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Member List Container (Locked to fit 10 members without expanding or shrinking) */}
      <div className="p-2 space-y-1.5 flex-1 min-h-0 overflow-y-auto">
        {members.length === 0 ? (
          <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-slate-500 text-xs py-8">
            <Users className="w-7 h-7 mb-2 opacity-40" />
            <span>No members in this rank</span>
          </div>
        ) : (
          members.map((member, index) => {
            const isSelected = member.id === selectedMemberId;
            const isBookmarked = member.id === bookmarkedMemberId;
            const rankBadgeClass = styles.rankColor[member.level] || 'bg-slate-700 text-slate-200';

            return (
              <div
                key={member.id}
                onClick={() => onSelectMember(member)}
                className={clsx(
                  'group relative flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition text-xs select-none border',
                  isSelected
                    ? 'bg-indigo-950/60 border-indigo-500 shadow-sm'
                    : isBookmarked
                    ? 'bg-slate-800/80 border-amber-500/50 hover:bg-slate-800'
                    : 'bg-slate-800/40 border-slate-800/80 hover:bg-slate-800/80 hover:border-slate-700'
                )}
              >
                {/* Left: Index (if conductors), Rank Badge, Name */}
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  {isConductorBox && (
                    <span className="text-[10px] text-slate-500 font-mono w-4 text-right flex-shrink-0">
                      {index + 1}.
                    </span>
                  )}
                  <span
                    className={clsx(
                      'text-[10px] uppercase px-1.5 py-0.5 rounded tracking-wider flex-shrink-0',
                      rankBadgeClass
                    )}
                  >
                    {member.level}
                  </span>
                  <span
                    className={clsx(
                      'font-medium truncate',
                      isSelected ? 'text-indigo-200 font-semibold' : 'text-slate-200'
                    )}
                  >
                    {member.name}
                  </span>
                </div>

                {/* Right: Bookmark Button & Active Bookmark Indicator */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleBookmark(category, member.id);
                    }}
                    title={isBookmarked ? 'Remove bookmark' : 'Set as list bookmark'}
                    className={clsx(
                      'p-1 rounded transition',
                      isBookmarked
                        ? 'text-amber-400 bg-amber-500/20 hover:bg-amber-500/30'
                        : 'text-slate-500 opacity-0 group-hover:opacity-100 hover:text-amber-300 hover:bg-slate-700'
                    )}
                  >
                    <Bookmark
                      className={clsx('w-3.5 h-3.5', isBookmarked && 'fill-amber-400')}
                    />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
