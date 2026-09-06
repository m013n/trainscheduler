import {
  AppData,
  DaySchedule,
  Member,
  ScheduleHistory,
  getWeekKey,
  PLACEHOLDER_NOMINATION,
  PLACEHOLDER_ROLL_DICE,
} from '../types';

const STORAGE_KEY = 'alliance_train_scheduler_data';

export const DEFAULT_SCHEDULE: DaySchedule[] = Array.from({ length: 7 }, (_, i) => ({
  dayNumber: i + 1,
  conductorId: null,
  passengerId: null,
  notes: '',
}));

export const DEFAULT_APP_DATA: AppData = {
  members: [],
  conductorOrder: [],
  bookmarks: {
    conductors: null,
    r3: null,
    r2: null,
    r1: null,
  },
  schedule: DEFAULT_SCHEDULE,
  scheduleHistory: {
    [getWeekKey(1)]: DEFAULT_SCHEDULE,
  },
  activeWeekKey: getWeekKey(1),
};

export async function loadAppData(): Promise<AppData> {
  if (window.electronAPI) {
    try {
      const data = await window.electronAPI.loadData();
      if (data && typeof data === 'object') {
        return normalizeAppData(data as Partial<AppData>);
      }
    } catch (err) {
      console.error('Error loading data from Electron:', err);
    }
  } else {
    try {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        return normalizeAppData(parsed);
      }
    } catch (err) {
      console.error('Error loading data from localStorage:', err);
    }
  }

  return DEFAULT_APP_DATA;
}

export async function saveAppData(data: AppData): Promise<void> {
  if (window.electronAPI) {
    try {
      await window.electronAPI.saveData(data);
    } catch (err) {
      console.error('Error saving data to Electron:', err);
    }
  } else {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('Error saving data to localStorage:', err);
    }
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (window.electronAPI) {
    try {
      return await window.electronAPI.copyToClipboard(text);
    } catch (err) {
      console.error('Error copying via Electron API:', err);
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Error copying via navigator.clipboard:', err);
    return false;
  }
}

export function exportAppDataToFile(data: AppData): void {
  try {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `alliance-train-schedule-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to export data to file:', err);
  }
}

export function mergeImportedData(currentData: AppData, rawImported: unknown): {
  success: boolean;
  appData?: AppData;
  error?: string;
  stats?: { added: number; updated: number; total: number };
} {
  try {
    if (!rawImported || typeof rawImported !== 'object') {
      return { success: false, error: 'Invalid JSON data format.' };
    }

    const importedObj = rawImported as Partial<AppData>;
    if (!Array.isArray(importedObj.members)) {
      return { success: false, error: 'Imported file does not contain a valid members list.' };
    }

    // Map existing members by lowercase trimmed name
    const existingByName = new Map<string, Member>();
    for (const m of currentData.members) {
      existingByName.set(m.name.trim().toLowerCase(), m);
    }

    // ID remap table (from incoming ID to canonical ID)
    const idRemap = new Map<string, string>();
    const mergedMembers: Member[] = [...currentData.members];
    let addedCount = 0;
    let updatedCount = 0;

    for (const rawMember of importedObj.members) {
      if (!rawMember || typeof rawMember.name !== 'string') continue;
      const cleanName = rawMember.name.trim();
      if (!cleanName) continue;
      const key = cleanName.toLowerCase();
      const validLevel = (['r1', 'r2', 'r3', 'r4', 'r5'].includes(rawMember.level) ? rawMember.level : 'r1') as Member['level'];

      if (existingByName.has(key)) {
        // Member already exists -> avoid duplicate, update level if imported has level
        const existing = existingByName.get(key)!;
        idRemap.set(rawMember.id, existing.id);
        if (existing.level !== validLevel) {
          existing.level = validLevel;
          updatedCount++;
        }
      } else {
        // New member -> create with unique id
        const newMember: Member = {
          id: rawMember.id || `m_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: cleanName,
          level: validLevel,
          createdAt: typeof rawMember.createdAt === 'number' ? rawMember.createdAt : Date.now(),
        };
        existingByName.set(key, newMember);
        idRemap.set(rawMember.id, newMember.id);
        mergedMembers.push(newMember);
        addedCount++;
      }
    }

    // Map for fast lookup of merged members
    const mergedMemberMap = new Map(mergedMembers.map((m) => [m.id, m]));
    const conductorIds = new Set(
      mergedMembers.filter((m) => m.level === 'r4' || m.level === 'r5').map((m) => m.id)
    );

    // Merge conductorOrder without duplicates
    const incomingConductorOrder = Array.isArray(importedObj.conductorOrder) ? importedObj.conductorOrder : [];
    const mergedConductorOrder: string[] = [];

    // Prioritize imported order (remapped)
    for (const rawId of incomingConductorOrder) {
      const canonicalId = idRemap.get(rawId) || rawId;
      if (conductorIds.has(canonicalId) && !mergedConductorOrder.includes(canonicalId)) {
        mergedConductorOrder.push(canonicalId);
      }
    }

    // Append existing conductor order
    for (const canonicalId of currentData.conductorOrder) {
      if (conductorIds.has(canonicalId) && !mergedConductorOrder.includes(canonicalId)) {
        mergedConductorOrder.push(canonicalId);
      }
    }

    // Append any remaining conductors not in list
    for (const id of conductorIds) {
      if (!mergedConductorOrder.includes(id)) {
        mergedConductorOrder.push(id);
      }
    }

    // Bookmarks: prefer imported if valid, else keep current
    const importedBookmarks = importedObj.bookmarks || {};
    const remapBookmark = (rawId: string | null | undefined, expectedCategory: string): string | null => {
      if (!rawId) return null;
      const canonicalId = idRemap.get(rawId) || rawId;
      const member = mergedMemberMap.get(canonicalId);
      if (!member) return null;
      if (expectedCategory === 'conductors' && (member.level === 'r4' || member.level === 'r5')) return canonicalId;
      if (expectedCategory === member.level) return canonicalId;
      return null;
    };

    const mergedBookmarks = {
      conductors: remapBookmark(importedBookmarks.conductors, 'conductors') || currentData.bookmarks.conductors || null,
      r3: remapBookmark(importedBookmarks.r3, 'r3') || currentData.bookmarks.r3 || null,
      r2: remapBookmark(importedBookmarks.r2, 'r2') || currentData.bookmarks.r2 || null,
      r1: remapBookmark(importedBookmarks.r1, 'r1') || currentData.bookmarks.r1 || null,
    };

    const remapSchedule = (rawSchedule: unknown, fallbackSchedule: DaySchedule[]): DaySchedule[] => {
      return Array.from({ length: 7 }, (_, i) => {
        const dayNum = i + 1;
        const importedDay = Array.isArray(rawSchedule)
          ? rawSchedule.find((s): s is DaySchedule => !!s && typeof s === 'object' && s.dayNumber === dayNum)
          : null;
        const currentDay = fallbackSchedule.find((s) => s.dayNumber === dayNum);

        let conductorId: string | null = null;
        let passengerId: string | null = null;

        const rawC = importedDay?.conductorId || currentDay?.conductorId || null;
        if (rawC) {
          const canonicalC = idRemap.get(rawC) || rawC;
          const member = mergedMemberMap.get(canonicalC);
          if (member && (member.level === 'r4' || member.level === 'r5')) {
            conductorId = canonicalC;
          }
        }

        const rawP = importedDay?.passengerId || currentDay?.passengerId || null;
        if (rawP) {
          if (rawP === PLACEHOLDER_ROLL_DICE || rawP === PLACEHOLDER_NOMINATION) {
            passengerId = rawP;
          } else {
            const canonicalP = idRemap.get(rawP) || rawP;
            const member = mergedMemberMap.get(canonicalP);
            if (member && ['r1', 'r2', 'r3'].includes(member.level)) {
              passengerId = canonicalP;
            }
          }
        }

        const rawNotes = importedDay?.notes !== undefined ? importedDay.notes : (currentDay?.notes || '');

        return {
          dayNumber: dayNum,
          conductorId,
          passengerId,
          notes: typeof rawNotes === 'string' ? rawNotes : '',
        };
      });
    };

    // Imported schedules replace matching weeks and remap member IDs to canonical IDs.
    let finalSchedule: DaySchedule[] = currentData.schedule;
    if (Array.isArray(importedObj.schedule) && importedObj.schedule.length > 0) {
      finalSchedule = remapSchedule(importedObj.schedule, currentData.schedule);
    }

    const mergedHistory: ScheduleHistory = { ...currentData.scheduleHistory };
    if (importedObj.scheduleHistory && typeof importedObj.scheduleHistory === 'object') {
      for (const [weekKey, rawSchedule] of Object.entries(importedObj.scheduleHistory)) {
        const fallbackSchedule = currentData.scheduleHistory[weekKey] || DEFAULT_SCHEDULE;
        mergedHistory[weekKey] = remapSchedule(rawSchedule, fallbackSchedule);
      }
    } else if (Array.isArray(importedObj.schedule) && importedObj.schedule.length > 0) {
      mergedHistory[currentData.activeWeekKey] = finalSchedule;
    }

    const normalizedData = normalizeAppData({
      members: mergedMembers,
      conductorOrder: mergedConductorOrder,
      bookmarks: mergedBookmarks,
      schedule: finalSchedule,
      scheduleHistory: mergedHistory,
      activeWeekKey: typeof importedObj.activeWeekKey === 'string'
        ? importedObj.activeWeekKey
        : currentData.activeWeekKey,
    });

    return {
      success: true,
      appData: normalizedData,
      stats: {
        added: addedCount,
        updated: updatedCount,
        total: normalizedData.members.length,
      },
    };
  } catch (err) {
    return { success: false, error: `Failed to parse data: ${String(err)}` };
  }
}

export function normalizeAppData(data: Partial<AppData>): AppData {
  const members: Member[] = Array.isArray(data.members) ? data.members : [];
  
  // Normalize conductorOrder
  const conductorIds = new Set(members.filter(m => m.level === 'r4' || m.level === 'r5').map(m => m.id));
  const rawConductorOrder = Array.isArray(data.conductorOrder) ? data.conductorOrder : [];
  // Keep existing order for valid conductors, then append any new conductors not in the list
  const orderedConductors: string[] = [];
  for (const id of rawConductorOrder) {
    if (conductorIds.has(id) && !orderedConductors.includes(id)) {
      orderedConductors.push(id);
    }
  }
  for (const id of conductorIds) {
    if (!orderedConductors.includes(id)) {
      orderedConductors.push(id);
    }
  }

  // Normalize bookmarks: ensure bookmarked IDs still exist in the corresponding categories
  const memberMap = new Map(members.map(m => [m.id, m]));
  const bookmarks = data.bookmarks || {};

  const validConductorBookmark = (bookmarks.conductors && memberMap.get(bookmarks.conductors)?.level && ['r4', 'r5'].includes(memberMap.get(bookmarks.conductors)!.level))
    ? bookmarks.conductors
    : null;

  const validR3Bookmark = (bookmarks.r3 && memberMap.get(bookmarks.r3)?.level === 'r3')
    ? bookmarks.r3
    : null;

  const validR2Bookmark = (bookmarks.r2 && memberMap.get(bookmarks.r2)?.level === 'r2')
    ? bookmarks.r2
    : null;

  const validR1Bookmark = (bookmarks.r1 && memberMap.get(bookmarks.r1)?.level === 'r1')
    ? bookmarks.r1
    : null;

  const normalizeSchedule = (rawSchedule: unknown): DaySchedule[] => Array.from({ length: 7 }, (_, i) => {
    const dayNum = i + 1;
    const existingDay = Array.isArray(rawSchedule)
      ? rawSchedule.find((s): s is DaySchedule => !!s && typeof s === 'object' && s.dayNumber === dayNum)
      : null;
    let conductorId = existingDay?.conductorId || null;
    let passengerId = existingDay?.passengerId || null;

    // Validate assigned conductor
    if (conductorId) {
      const c = memberMap.get(conductorId);
      if (!c || (c.level !== 'r4' && c.level !== 'r5')) {
        conductorId = null;
      }
    }

    // Validate assigned passenger
    if (passengerId) {
      if (passengerId === PLACEHOLDER_ROLL_DICE || passengerId === PLACEHOLDER_NOMINATION) {
        // Keep valid placeholder
      } else {
        const p = memberMap.get(passengerId);
        if (!p || (p.level !== 'r1' && p.level !== 'r2' && p.level !== 'r3')) {
          passengerId = null;
        }
      }
    }

    return {
      dayNumber: dayNum,
      conductorId,
      passengerId,
      notes: typeof existingDay?.notes === 'string' ? existingDay.notes : '',
    };
  });

  const legacySchedule = normalizeSchedule(data.schedule);
  const rawHistory = data.scheduleHistory && typeof data.scheduleHistory === 'object'
    ? data.scheduleHistory
    : {};
  const activeWeekKey = typeof data.activeWeekKey === 'string' && data.activeWeekKey
    ? data.activeWeekKey
    : getWeekKey(1);
  const scheduleHistory: ScheduleHistory = {};

  for (const [weekKey, rawSchedule] of Object.entries(rawHistory)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(weekKey)) {
      scheduleHistory[weekKey] = normalizeSchedule(rawSchedule);
    }
  }

  if (!scheduleHistory[activeWeekKey]) {
    scheduleHistory[activeWeekKey] = legacySchedule;
  }

  const schedule = scheduleHistory[activeWeekKey];

  return {
    members,
    conductorOrder: orderedConductors,
    bookmarks: {
      conductors: validConductorBookmark,
      r3: validR3Bookmark,
      r2: validR2Bookmark,
      r1: validR1Bookmark,
    },
    schedule,
    scheduleHistory,
    activeWeekKey,
  };
}
