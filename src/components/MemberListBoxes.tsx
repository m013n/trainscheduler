import React, { useMemo } from 'react';
import { Member, Bookmarks, ListCategory } from '../types';
import { ListBox } from './ListBox';

interface MemberListBoxesProps {
  members: Member[];
  conductorOrder: string[];
  bookmarks: Bookmarks;
  selectedMember: Member | null;
  onSelectMember: (member: Member) => void;
  onToggleBookmark: (category: ListCategory, memberId: string) => void;
  onShowHistory?: (member: Member, anchorRect: DOMRect) => void;
  onMoveConductor: (memberId: string, direction: 'up' | 'down') => void;
}

export const MemberListBoxes: React.FC<MemberListBoxesProps> = ({
  members,
  conductorOrder,
  bookmarks,
  selectedMember,
  onSelectMember,
  onToggleBookmark,
  onShowHistory,
  onMoveConductor,
}) => {
  // 1. Train Conductors (R4 + R5) sorted according to conductorOrder
  const conductorsList = useMemo(() => {
    const conductorMembers = members.filter((m) => m.level === 'r4' || m.level === 'r5');
    const memberMap = new Map(conductorMembers.map((m) => [m.id, m]));
    
    const result: Member[] = [];
    // First, add members in custom saved order
    for (const id of conductorOrder) {
      const member = memberMap.get(id);
      if (member) {
        result.push(member);
        memberMap.delete(id);
      }
    }
    // Append any remaining conductors not in conductorOrder yet
    for (const member of memberMap.values()) {
      result.push(member);
    }
    return result;
  }, [members, conductorOrder]);

  // 2. R3 Members sorted alphabetically (case-insensitive A-Z)
  const r3List = useMemo(() => {
    return members
      .filter((m) => m.level === 'r3')
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [members]);

  // 3. R2 Members sorted alphabetically (case-insensitive A-Z)
  const r2List = useMemo(() => {
    return members
      .filter((m) => m.level === 'r2')
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [members]);

  // 4. R1 Members sorted alphabetically (case-insensitive A-Z)
  const r1List = useMemo(() => {
    return members
      .filter((m) => m.level === 'r1')
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [members]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
      {/* 1. Train Conductors Box */}
      <ListBox
        category="conductors"
        title="Train Conductors"
        subtitle="R4 & R5 (Custom Order)"
        members={conductorsList}
        selectedMemberId={selectedMember?.id || null}
        bookmarkedMemberId={bookmarks.conductors || null}
        onSelectMember={onSelectMember}
        onToggleBookmark={onToggleBookmark}
        onShowHistory={onShowHistory}
        onMoveUp={(id) => onMoveConductor(id, 'up')}
        onMoveDown={(id) => onMoveConductor(id, 'down')}
      />

      {/* 2. R3 Box */}
      <ListBox
        category="r3"
        title="R3 Members"
        subtitle="Alphabetical (A - Z)"
        members={r3List}
        selectedMemberId={selectedMember?.id || null}
        bookmarkedMemberId={bookmarks.r3 || null}
        onSelectMember={onSelectMember}
        onToggleBookmark={onToggleBookmark}
        onShowHistory={onShowHistory}
      />

      {/* 3. R2 Box */}
      <ListBox
        category="r2"
        title="R2 Members"
        subtitle="Alphabetical (A - Z)"
        members={r2List}
        selectedMemberId={selectedMember?.id || null}
        bookmarkedMemberId={bookmarks.r2 || null}
        onSelectMember={onSelectMember}
        onToggleBookmark={onToggleBookmark}
        onShowHistory={onShowHistory}
      />

      {/* 4. R1 Box */}
      <ListBox
        category="r1"
        title="R1 Members"
        subtitle="Alphabetical (A - Z)"
        members={r1List}
        selectedMemberId={selectedMember?.id || null}
        bookmarkedMemberId={bookmarks.r1 || null}
        onSelectMember={onSelectMember}
        onToggleBookmark={onToggleBookmark}
        onShowHistory={onShowHistory}
      />
    </div>
  );
};
