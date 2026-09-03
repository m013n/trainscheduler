export type MemberLevel = 'r1' | 'r2' | 'r3' | 'r4' | 'r5';

export const PLACEHOLDER_ROLL_DICE = '__PLACEHOLDER_ROLL_THE_DICE__';
export const PLACEHOLDER_NOMINATION = '__PLACEHOLDER_NOMINATION__';

export const PLACEHOLDER_NAMES: Record<string, string> = {
  [PLACEHOLDER_ROLL_DICE]: 'Roll the dice',
  [PLACEHOLDER_NOMINATION]: 'Nomination',
};

export function isPlaceholder(id: string | null | undefined): boolean {
  return id === PLACEHOLDER_ROLL_DICE || id === PLACEHOLDER_NOMINATION;
}

export function getPlaceholderName(id: string | null | undefined): string | null {
  if (id === PLACEHOLDER_ROLL_DICE) return 'Roll the dice';
  if (id === PLACEHOLDER_NOMINATION) return 'Nomination';
  return null;
}

export const DAY_NAMES: string[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const DAY_SHORT_NAMES: string[] = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
];

export function getDayName(dayNumber: number): string {
  return DAY_NAMES[dayNumber - 1] || `Day ${dayNumber}`;
}

export function getDayShortName(dayNumber: number): string {
  return DAY_SHORT_NAMES[dayNumber - 1] || `D${dayNumber}`;
}

export function getMondayOfWeek(weekOffset: number = 1): Date {
  const now = new Date();
  const currentDayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  const distToThisMonday = (currentDayOfWeek + 6) % 7;
  
  const monday = new Date(now);
  monday.setDate(now.getDate() - distToThisMonday + (weekOffset * 7));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function getDayDate(dayNumber: number, weekOffset: number = 1): Date {
  const monday = getMondayOfWeek(weekOffset);
  const targetDate = new Date(monday);
  targetDate.setDate(monday.getDate() + (dayNumber - 1));
  return targetDate;
}

export function getDayDateString(dayNumber: number, weekOffset: number = 1): string {
  const d = getDayDate(dayNumber, weekOffset);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function getWeekDateRange(weekOffset: number = 1): {
  formattedRange: string;
  startDate: Date;
  endDate: Date;
  label: string;
} {
  const monday = getMondayOfWeek(weekOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const startMonth = monday.getMonth() + 1;
  const startDateNum = monday.getDate();
  const endMonth = sunday.getMonth() + 1;
  const endDateNum = sunday.getDate();
  
  const formattedRange = `${startMonth}/${startDateNum} - ${endMonth}/${endDateNum}`;
  
  let label = formattedRange;
  if (weekOffset === 0) label += ' (Current Week)';
  else if (weekOffset === 1) label += ' (Next Week)';
  else if (weekOffset > 1) label += ` (+${weekOffset} wks)`;
  else if (weekOffset === -1) label += ' (Last Week)';
  else label += ` (${weekOffset} wks)`;

  return {
    formattedRange,
    startDate: monday,
    endDate: sunday,
    label,
  };
}

export function getCurrentWeekDateRange(): string {
  return getWeekDateRange(1).formattedRange;
}

export interface Member {
  id: string;
  name: string;
  level: MemberLevel;
  createdAt: number;
}

export type ListCategory = 'conductors' | 'r3' | 'r2' | 'r1';

export interface Bookmarks {
  conductors?: string | null;
  r3?: string | null;
  r2?: string | null;
  r1?: string | null;
}

export interface DaySchedule {
  dayNumber: number; // 1 to 7
  conductorId: string | null;
  passengerId: string | null;
}

export interface AppData {
  members: Member[];
  conductorOrder: string[]; // member IDs in custom order
  bookmarks: Bookmarks;
  schedule: DaySchedule[];
}

export interface ElectronAPI {
  loadData: () => Promise<AppData | null>;
  saveData: (data: AppData) => Promise<{ success: boolean; error?: string }>;
  copyToClipboard: (text: string) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
