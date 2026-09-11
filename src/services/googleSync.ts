import {
  AppData,
  Member,
  getDayDate,
  getDayName,
  getPlaceholderName,
  getWeekDateRange,
  getWeekKey,
  getWeekOffsetFromKey,
  isPlaceholder,
} from '../types';

export interface ScheduleHistoryRow {
  weekKey: string;
  weekRange: string;
  dayNumber: number;
  dayName: string;
  dateStr: string;
  conductorName: string;
  passengerName: string;
  notes: string;
}

export const APPS_SCRIPT_TEMPLATE = `function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No payload data received.");
    }

    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (!ss) {
      throw new Error("Could not access active spreadsheet. Please open Apps Script directly from your Google Sheet via Extensions > Apps Script.");
    }

    var sheetName = "Train History";
    var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);

    // Clear existing data
    sheet.clear();

    // Set Header
    var headers = ["Week Range", "Date", "Day", "Conductor", "Passenger", "Notes"];
    sheet.appendRow(headers);

    // Format Header Row
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#3b82f6");
    headerRange.setFontColor("#ffffff");

    // Insert Rows
    if (data.rows && data.rows.length > 0) {
      var rowValues = data.rows.map(function(r) {
        return [
          r.weekRange || "",
          r.dateStr || "",
          r.dayName || "",
          r.conductorName || "",
          r.passengerName || "",
          r.notes || ""
        ];
      });
      sheet.getRange(2, 1, rowValues.length, headers.length).setValues(rowValues);
    }

    // Immediately commit changes to Google Sheets
    SpreadsheetApp.flush();

    try {
      sheet.autoResizeColumns(1, headers.length);
    } catch (resizeErr) {
      // Ignore resize errors
    }

    return ContentService.createTextOutput(
      JSON.stringify({ result: "success", rows: data.rows ? data.rows.length : 0 })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    Logger.log("Train Scheduler Error: " + err.toString());
    return ContentService.createTextOutput(
      JSON.stringify({ result: "error", error: err.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}`;

export function getRecent4WeeksHistory(data: AppData): ScheduleHistoryRow[] {
  const memberMap = new Map<string, Member>(data.members.map((m) => [m.id, m]));

  const activeOffset = getWeekOffsetFromKey(data.activeWeekKey) ?? 1;
  // Calculate offsets for the active week and preceding 3 weeks (total 4 weeks)
  const offsets = [activeOffset, activeOffset - 1, activeOffset - 2, activeOffset - 3];

  const rows: ScheduleHistoryRow[] = [];

  for (const offset of offsets) {
    const weekKey = getWeekKey(offset);
    const schedule = data.scheduleHistory[weekKey];
    if (!schedule) continue;

    const { formattedRange } = getWeekDateRange(offset);

    for (let dayNum = 1; dayNum <= 7; dayNum++) {
      const dayData = schedule.find((s) => s.dayNumber === dayNum);
      const dayDate = getDayDate(dayNum, offset);
      const dateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(
        dayDate.getDate()
      ).padStart(2, '0')}`;
      const dayName = getDayName(dayNum);

      let conductorName = '';
      if (dayData?.conductorId) {
        conductorName = memberMap.get(dayData.conductorId)?.name || '';
      }

      let passengerName = '';
      if (dayData?.passengerId) {
        if (isPlaceholder(dayData.passengerId)) {
          passengerName = getPlaceholderName(dayData.passengerId) || '';
        } else {
          passengerName = memberMap.get(dayData.passengerId)?.name || '';
        }
      }

      rows.push({
        weekKey,
        weekRange: formattedRange,
        dayNumber: dayNum,
        dayName,
        dateStr,
        conductorName,
        passengerName,
        notes: dayData?.notes || '',
      });
    }
  }

  // Sort rows chronologically by date descending (most recent first)
  rows.sort((a, b) => b.dateStr.localeCompare(a.dateStr));

  return rows;
}

export function generateHistoryCSV(rows: ScheduleHistoryRow[]): string {
  const headers = ['Week Range', 'Date', 'Day', 'Conductor', 'Passenger', 'Notes'];
  const escapeCsv = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csvLines = [headers.join(',')];

  for (const row of rows) {
    const line = [
      escapeCsv(row.weekRange),
      escapeCsv(row.dateStr),
      escapeCsv(row.dayName),
      escapeCsv(row.conductorName),
      escapeCsv(row.passengerName),
      escapeCsv(row.notes),
    ].join(',');
    csvLines.push(line);
  }

  return csvLines.join('\n');
}

export function downloadHistoryCSV(data: AppData): void {
  const rows = getRecent4WeeksHistory(data);
  const csvContent = generateHistoryCSV(rows);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `train-schedule-4week-history-${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function syncToGoogleSheets(
  webhookUrl: string,
  data: AppData
): Promise<{ success: boolean; message: string }> {
  if (!webhookUrl || !webhookUrl.trim().startsWith('http')) {
    return { success: false, message: 'Please provide a valid Google Apps Script Web App URL.' };
  }

  const rows = getRecent4WeeksHistory(data);
  const payload = {
    updatedAt: new Date().toISOString(),
    totalRows: rows.length,
    rows,
  };

  try {
    // Note: Google Apps Script Web Apps redirect across domains.
    // Using mode: 'no-cors' prevents browser CORS preflight and redirect blocking.
    await fetch(webhookUrl.trim(), {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      message: `Successfully synced ${rows.length} schedule entries (last 4 weeks) to Google Sheets! Check your Google Sheet to view the updated "Train History" tab.`,
    };
  } catch (err) {
    console.error('Google Sheets sync error:', err);
    return {
      success: false,
      message: `Failed to connect to Google Sheets: ${String(err)}. Make sure your Google Apps Script Web App is deployed with "Who has access" set to "Anyone".`,
    };
  }
}
