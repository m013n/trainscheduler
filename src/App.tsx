import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Member,
  MemberLevel,
  Bookmarks,
  DaySchedule,
  AppData,
  ListCategory,
  ScheduleHistory,
  getWeekKey,
  getWeekOffsetFromKey,
} from './types';
import { loadAppData, saveAppData, DEFAULT_SCHEDULE, exportAppDataToFile, mergeImportedData } from './services/storage';
import { Header } from './components/Header';
import { MemberToolbar } from './components/MemberToolbar';
import { MemberListBoxes } from './components/MemberListBoxes';
import { ScheduleGrid } from './components/ScheduleGrid';
import { ScheduleGenerator } from './components/ScheduleGenerator';
import { PriorWeeksPreview } from './components/PriorWeeksPreview';
import { MemberHistoryPopover } from './components/MemberHistoryPopover';
import { GoogleSyncModal } from './components/GoogleSyncModal';
import { ChevronDown, ChevronUp } from 'lucide-react';

const SAMPLE_MEMBERS: Array<{ name: string; level: MemberLevel }> = [
  { name: 'Arthur Pendragon', level: 'r5' },
  { name: 'Valkyrie', level: 'r4' },
  { name: 'Shadowblade', level: 'r4' },
  { name: 'IronClad', level: 'r4' },
  { name: 'StormBringer', level: 'r4' },
  { name: 'Aegis', level: 'r3' },
  { name: 'Blaze', level: 'r3' },
  { name: 'Cipher', level: 'r3' },
  { name: 'Echo', level: 'r3' },
  { name: 'Frost', level: 'r3' },
  { name: 'Ghost', level: 'r2' },
  { name: 'Hawk', level: 'r2' },
  { name: 'Ignis', level: 'r2' },
  { name: 'Jester', level: 'r2' },
  { name: 'Kodiak', level: 'r1' },
  { name: 'Luna', level: 'r1' },
  { name: 'Mystic', level: 'r1' },
  { name: 'Nova', level: 'r1' },
];

export const App: React.FC = () => {
  const [dataLoaded, setDataLoaded] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [conductorOrder, setConductorOrder] = useState<string[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmarks>({
    conductors: null,
    r3: null,
    r2: null,
    r1: null,
  });
  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE);
  const [scheduleHistory, setScheduleHistory] = useState<ScheduleHistory>({});
  const [activeWeekKey, setActiveWeekKey] = useState(getWeekKey(1));
  const [googleWebhookUrl, setGoogleWebhookUrl] = useState<string>('');
  
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1);
  const [weekOffset, setWeekOffset] = useState<number>(1); // Default to future / next week
  const [showPriorWeeks, setShowPriorWeeks] = useState(false);
  const [showGoogleSyncModal, setShowGoogleSyncModal] = useState(false);
  const [historyPopup, setHistoryPopup] = useState<{ memberId: string; anchorRect: DOMRect } | null>(null);

  // Load initial data
  useEffect(() => {
    loadAppData().then((data) => {
      setMembers(data.members);
      setConductorOrder(data.conductorOrder);
      setBookmarks(data.bookmarks);
      setSchedule(data.schedule);
      setScheduleHistory(data.scheduleHistory);
      setActiveWeekKey(data.activeWeekKey);
      setGoogleWebhookUrl(data.googleWebhookUrl || '');
      setWeekOffset(getWeekOffsetFromKey(data.activeWeekKey) ?? 1);
      setDataLoaded(true);
    });
  }, []);

  // Auto-save whenever data changes after initial load
  useEffect(() => {
    if (!dataLoaded) return;
    const currentData: AppData = {
      members,
      conductorOrder,
      bookmarks,
      schedule,
      scheduleHistory,
      activeWeekKey,
      googleWebhookUrl,
    };
    saveAppData(currentData);
  }, [members, conductorOrder, bookmarks, schedule, scheduleHistory, activeWeekKey, googleWebhookUrl, dataLoaded]);

  const updateActiveSchedule = (updater: (previous: DaySchedule[]) => DaySchedule[]) => {
    setSchedule((previous) => {
      const updated = updater(previous);
      setScheduleHistory((history) => ({ ...history, [activeWeekKey]: updated }));
      return updated;
    });
  };

  const handleWeekOffsetChange = (offset: number) => {
    const nextWeekKey = getWeekKey(offset);
    setWeekOffset(offset);
    setActiveWeekKey(nextWeekKey);
    setSchedule(scheduleHistory[nextWeekKey] || DEFAULT_SCHEDULE);
    setScheduleHistory((history) => history[nextWeekKey]
      ? history
      : { ...history, [nextWeekKey]: DEFAULT_SCHEDULE });
  };

  // Map for fast lookups
  const membersMap = useMemo(() => {
    return new Map(members.map((m) => [m.id, m]));
  }, [members]);

  const selectedMember = useMemo(() => {
    return selectedMemberId ? membersMap.get(selectedMemberId) || null : null;
  }, [selectedMemberId, membersMap]);

  // Helper to sync conductorOrder whenever members change
  const syncConductorOrder = (newMembers: Member[], existingOrder: string[]): string[] => {
    const conductorIds = new Set(
      newMembers.filter((m) => m.level === 'r4' || m.level === 'r5').map((m) => m.id)
    );
    const newOrder: string[] = [];
    for (const id of existingOrder) {
      if (conductorIds.has(id) && !newOrder.includes(id)) {
        newOrder.push(id);
      }
    }
    for (const id of conductorIds) {
      if (!newOrder.includes(id)) {
        newOrder.push(id);
      }
    }
    return newOrder;
  };

  // Add Member
  const handleAddMember = (name: string, level: MemberLevel) => {
    const newMember: Member = {
      id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      level,
      createdAt: Date.now(),
    };

    const updatedMembers = [...members, newMember];
    setMembers(updatedMembers);

    if (level === 'r4' || level === 'r5') {
      setConductorOrder((prev) => [...prev, newMember.id]);
    }

    setSelectedMemberId(newMember.id);
  };

  // Update Member Level (Promote / Demote)
  const handleUpdateLevel = (memberId: string, newLevel: MemberLevel) => {
    const currentMember = membersMap.get(memberId);
    if (!currentMember || currentMember.level === newLevel) return;

    const oldLevel = currentMember.level;
    const wasConductor = oldLevel === 'r4' || oldLevel === 'r5';
    const willBeConductor = newLevel === 'r4' || newLevel === 'r5';

    const updatedMembers = members.map((m) =>
      m.id === memberId ? { ...m, level: newLevel } : m
    );
    setMembers(updatedMembers);

    // Sync conductor order
    setConductorOrder((prev) => syncConductorOrder(updatedMembers, prev));

    // Check if bookmark needs cleanup
    setBookmarks((prev) => {
      const updatedBookmarks = { ...prev };
      if (wasConductor && !willBeConductor && updatedBookmarks.conductors === memberId) {
        updatedBookmarks.conductors = null;
      }
      if (oldLevel === 'r3' && newLevel !== 'r3' && updatedBookmarks.r3 === memberId) {
        updatedBookmarks.r3 = null;
      }
      if (oldLevel === 'r2' && newLevel !== 'r2' && updatedBookmarks.r2 === memberId) {
        updatedBookmarks.r2 = null;
      }
      if (oldLevel === 'r1' && newLevel !== 'r1' && updatedBookmarks.r1 === memberId) {
        updatedBookmarks.r1 = null;
      }
      return updatedBookmarks;
    });
  };

  // Update Member Name
  const handleUpdateName = (memberId: string, newName: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, name: newName.trim() } : m))
    );
  };

  // Delete Member
  const handleDeleteMember = (memberId: string) => {
    const updatedMembers = members.filter((m) => m.id !== memberId);
    setMembers(updatedMembers);
    setConductorOrder((prev) => prev.filter((id) => id !== memberId));

    // Clear from bookmarks if present
    setBookmarks((prev) => {
      const updated = { ...prev };
      if (updated.conductors === memberId) updated.conductors = null;
      if (updated.r3 === memberId) updated.r3 = null;
      if (updated.r2 === memberId) updated.r2 = null;
      if (updated.r1 === memberId) updated.r1 = null;
      return updated;
    });

    // Clear from schedule if present
    setScheduleHistory((history) => Object.fromEntries(
      Object.entries(history).map(([weekKey, weeklySchedule]) => [
        weekKey,
        weeklySchedule.map((day) => ({
          ...day,
          conductorId: day.conductorId === memberId ? null : day.conductorId,
          passengerId: day.passengerId === memberId ? null : day.passengerId,
        })),
      ])
    ));
    setSchedule((prev) => prev.map((day) => ({
      ...day,
      conductorId: day.conductorId === memberId ? null : day.conductorId,
      passengerId: day.passengerId === memberId ? null : day.passengerId,
    })));

    if (selectedMemberId === memberId) {
      setSelectedMemberId(null);
    }
  };

  // Move Conductor Up or Down
  const handleMoveConductor = useCallback((memberId: string, direction: 'up' | 'down') => {
    setConductorOrder((prev) => {
      // Get all conductors in current effective order
      const conductorMembers = members.filter((m) => m.level === 'r4' || m.level === 'r5');
      const conductorIds = new Set(conductorMembers.map((m) => m.id));
      
      const fullOrder = syncConductorOrder(conductorMembers, prev);
      const index = fullOrder.indexOf(memberId);
      if (index === -1) return prev;

      if (direction === 'up' && index > 0) {
        const nextOrder = [...fullOrder];
        const temp = nextOrder[index - 1];
        nextOrder[index - 1] = nextOrder[index];
        nextOrder[index] = temp;
        return nextOrder.filter((id) => conductorIds.has(id));
      }

      if (direction === 'down' && index < fullOrder.length - 1) {
        const nextOrder = [...fullOrder];
        const temp = nextOrder[index + 1];
        nextOrder[index + 1] = nextOrder[index];
        nextOrder[index] = temp;
        return nextOrder.filter((id) => conductorIds.has(id));
      }

      return prev;
    });
  }, [members]);

  // Toggle Bookmark for Category
  const handleToggleBookmark = (category: ListCategory, memberId: string) => {
    setBookmarks((prev) => {
      const currentBookmarked = prev[category];
      return {
        ...prev,
        [category]: currentBookmarked === memberId ? null : memberId,
      };
    });
  };

  // "All aboard!" Action
  const handleAllAboard = () => {
    if (!selectedMember) return;

    const isConductor = selectedMember.level === 'r4' || selectedMember.level === 'r5';

    updateActiveSchedule((prev) =>
      prev.map((day) => {
        if (day.dayNumber === selectedDayNumber) {
          if (isConductor) {
            return { ...day, conductorId: selectedMember.id };
          } else {
            return { ...day, passengerId: selectedMember.id };
          }
        }
        return day;
      })
    );

    // Auto-advance target day to next day or next incomplete day if convenient
    const nextDay = selectedDayNumber < 7 ? selectedDayNumber + 1 : 1;
    setSelectedDayNumber(nextDay);
  };

  // Set placeholder for passenger slot
  const handleSetPlaceholder = (placeholderType: string) => {
    updateActiveSchedule((prev) =>
      prev.map((day) => {
        if (day.dayNumber === selectedDayNumber) {
          return { ...day, passengerId: placeholderType };
        }
        return day;
      })
    );

    // Auto-advance target day
    const nextDay = selectedDayNumber < 7 ? selectedDayNumber + 1 : 1;
    setSelectedDayNumber(nextDay);
  };

  // Remove single slot
  const handleRemoveSlot = (dayNumber: number, slotType: 'conductor' | 'passenger') => {
    updateActiveSchedule((prev) =>
      prev.map((day) => {
        if (day.dayNumber === dayNumber) {
          return {
            ...day,
            [slotType === 'conductor' ? 'conductorId' : 'passengerId']: null,
          };
        }
        return day;
      })
    );
  };

  // Update day notes
  const handleUpdateNotes = (dayNumber: number, notes: string) => {
    updateActiveSchedule((prev) =>
      prev.map((day) =>
        day.dayNumber === dayNumber
          ? { ...day, notes }
          : day
      )
    );
  };

  // Clear single day
  const handleClearDay = (dayNumber: number) => {
    updateActiveSchedule((prev) =>
      prev.map((day) =>
        day.dayNumber === dayNumber
          ? { ...day, conductorId: null, passengerId: null, notes: '' }
          : day
      )
    );
  };

  // Clear entire schedule
  const handleClearAllSchedule = () => {
    updateActiveSchedule(() => DEFAULT_SCHEDULE);
  };

  // Load sample roster
  const handleLoadSampleData = () => {
    const loadedMembers: Member[] = SAMPLE_MEMBERS.map((item, idx) => ({
      id: `sample_${idx}_${Date.now()}`,
      name: item.name,
      level: item.level,
      createdAt: Date.now() + idx,
    }));

    const sampleConductorOrder = loadedMembers
      .filter((m) => m.level === 'r4' || m.level === 'r5')
      .map((m) => m.id);

    setMembers(loadedMembers);
    setConductorOrder(sampleConductorOrder);
    setBookmarks({
      conductors: sampleConductorOrder[0] || null,
      r3: loadedMembers.find((m) => m.level === 'r3')?.id || null,
      r2: loadedMembers.find((m) => m.level === 'r2')?.id || null,
      r1: loadedMembers.find((m) => m.level === 'r1')?.id || null,
    });
    updateActiveSchedule(() => DEFAULT_SCHEDULE);
  };

  // Reset all
  const handleResetAllData = () => {
    setMembers([]);
    setConductorOrder([]);
    setBookmarks({
      conductors: null,
      r3: null,
      r2: null,
      r1: null,
    });
    setSchedule(DEFAULT_SCHEDULE);
    setScheduleHistory({ [activeWeekKey]: DEFAULT_SCHEDULE });
    setSelectedMemberId(null);
  };

  // Export data to JSON file
  const handleExportData = () => {
    const currentData: AppData = {
      members,
      conductorOrder,
      bookmarks,
      schedule,
      scheduleHistory,
      activeWeekKey,
      googleWebhookUrl,
    };
    exportAppDataToFile(currentData);
  };

  // Import data from JSON file with confirmation and deduplication
  const handleImportData = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);

        const memberCountInFile = Array.isArray(parsed?.members) ? parsed.members.length : 0;
        const confirmMsg = `Are you sure you want to import "${file.name}"?\n\n• Members in file: ${memberCountInFile}\n• Duplicate protection: Members with matching names will be safely updated without creating duplicate entries.\n\nDo you want to proceed?`;

        if (!confirm(confirmMsg)) {
          return;
        }

        const currentData: AppData = {
          members,
          conductorOrder,
          bookmarks,
          schedule,
          scheduleHistory,
          activeWeekKey,
          googleWebhookUrl,
        };

        const result = mergeImportedData(currentData, parsed);
        if (result.success && result.appData) {
          setMembers(result.appData.members);
          setConductorOrder(result.appData.conductorOrder);
          setBookmarks(result.appData.bookmarks);
          setSchedule(result.appData.schedule);
          setScheduleHistory(result.appData.scheduleHistory);
          setActiveWeekKey(result.appData.activeWeekKey);
          setGoogleWebhookUrl(result.appData.googleWebhookUrl || '');
          setWeekOffset(getWeekOffsetFromKey(result.appData.activeWeekKey) ?? 1);
          alert(
            `Import successful!\n• ${result.stats?.added ?? 0} new member(s) added\n• ${result.stats?.updated ?? 0} member rank(s) updated\n• Total members: ${result.stats?.total ?? result.appData.members.length}`
          );
        } else {
          alert(`Import failed: ${result.error || 'Unknown error'}`);
        }
      } catch (err) {
        alert(`Failed to read or parse the JSON file: ${String(err)}`);
      }
    };
    reader.readAsText(file);
  };

  const currentAppData: AppData = useMemo(() => ({
    members,
    conductorOrder,
    bookmarks,
    schedule,
    scheduleHistory,
    activeWeekKey,
    googleWebhookUrl,
  }), [members, conductorOrder, bookmarks, schedule, scheduleHistory, activeWeekKey, googleWebhookUrl]);

  return (
    <div className="flex flex-col min-h-screen bg-[#090d16] text-slate-100">
      {/* App Header */}
      <Header
        onLoadSampleData={handleLoadSampleData}
        onResetAllData={handleResetAllData}
        onExportData={handleExportData}
        onImportData={handleImportData}
        onOpenGoogleSync={() => setShowGoogleSyncModal(true)}
        memberCount={members.length}
      />

      {/* Main Container */}
      <main className="flex-1 p-5 max-w-[1600px] w-full mx-auto flex flex-col gap-5">
        {/* Member Action Toolbar */}
        <MemberToolbar
          selectedMember={selectedMember}
          onAddMember={handleAddMember}
          onUpdateLevel={handleUpdateLevel}
          onUpdateName={handleUpdateName}
          onDeleteMember={handleDeleteMember}
        />

        {/* 4 Group List Boxes */}
        <MemberListBoxes
          members={members}
          conductorOrder={conductorOrder}
          bookmarks={bookmarks}
          selectedMember={selectedMember}
          onSelectMember={(m) => setSelectedMemberId(m.id)}
          onToggleBookmark={handleToggleBookmark}
          onShowHistory={(m, rect) => setHistoryPopup({ memberId: m.id, anchorRect: rect })}
          onMoveConductor={handleMoveConductor}
        />

        {/* "All aboard!" Action & Generator Bar */}
        <ScheduleGenerator
          schedule={schedule}
          membersMap={membersMap}
          selectedMember={selectedMember}
          selectedDayNumber={selectedDayNumber}
          weekOffset={weekOffset}
          onWeekOffsetChange={handleWeekOffsetChange}
          onAllAboard={handleAllAboard}
          onSetPlaceholder={handleSetPlaceholder}
          onSelectDay={setSelectedDayNumber}
        />

        {/* 7-Day Schedule Grid */}
        <ScheduleGrid
          schedule={schedule}
          membersMap={membersMap}
          selectedDayNumber={selectedDayNumber}
          weekOffset={weekOffset}
          onSelectDay={setSelectedDayNumber}
          onRemoveSlot={handleRemoveSlot}
          onClearDay={handleClearDay}
          onClearAll={handleClearAllSchedule}
          onUpdateNotes={handleUpdateNotes}
        />

        {/* Previous Weeks Toggle & Preview */}
        <button
          type="button"
          onClick={() => setShowPriorWeeks((prev) => !prev)}
          className="self-start flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
        >
          {showPriorWeeks ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {showPriorWeeks ? 'Hide previous weeks' : 'Show previous weeks'}
        </button>
        {showPriorWeeks && (
          <PriorWeeksPreview
            weekOffset={weekOffset}
            scheduleHistory={scheduleHistory}
            membersMap={membersMap}
          />
        )}

        {/* Member Train History Popover */}
        {historyPopup && membersMap.get(historyPopup.memberId) && (
          <MemberHistoryPopover
            member={membersMap.get(historyPopup.memberId)!}
            scheduleHistory={scheduleHistory}
            anchorRect={historyPopup.anchorRect}
            onClose={() => setHistoryPopup(null)}
          />
        )}

        {/* Google Sheets Sync & Export Modal */}
        <GoogleSyncModal
          isOpen={showGoogleSyncModal}
          onClose={() => setShowGoogleSyncModal(false)}
          appData={currentAppData}
          onSaveWebhookUrl={setGoogleWebhookUrl}
        />
      </main>
    </div>
  );
};

export default App;
