import React, { useRef } from 'react';
import { Train, RefreshCw, Sparkles, Download, Upload, FileSpreadsheet } from 'lucide-react';

interface HeaderProps {
  onLoadSampleData: () => void;
  onResetAllData: () => void;
  onExportData: () => void;
  onImportData: (file: File) => void;
  onOpenGoogleSync: () => void;
  memberCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onLoadSampleData,
  onResetAllData,
  onExportData,
  onImportData,
  onOpenGoogleSync,
  memberCount,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportData(file);
    }
    // Reset input value so same file can be re-selected if desired
    e.target.value = '';
  };

  return (
    <header className="bg-slate-900/90 border-b border-slate-800 px-6 py-3.5 backdrop-blur shadow-md flex items-center justify-between gap-6">
      {/* Left side: Brand Title & Description */}
      <div className="flex items-start gap-3.5 flex-1 min-w-0 pr-4">
        <div className="bg-gradient-to-tr from-amber-500 to-orange-500 p-2 rounded-xl text-slate-950 shadow-md shadow-amber-500/20 shrink-0 mt-0.5">
          <Train className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-black text-white tracking-wide flex items-center gap-2">
            ALLIANCE TRAIN SCHEDULER
          </h1>
          <p className="text-xs text-slate-400 font-medium leading-relaxed mt-0.5">
            Fill all 7 days with one Conductor(R4/R5) and 1 Member(R1-R3) or placeholder for each day. Once filled, click "Generate Train Schedule" to create a schedule for the week. It will automatically save your schedule to your clipboard.
          </p>
        </div>
      </div>

      {/* Right side: Right-justified Action Buttons */}
      <div className="flex items-center justify-end gap-2.5 shrink-0 ml-auto">
        {memberCount === 0 && (
          <button
            type="button"
            onClick={onLoadSampleData}
            className="flex items-center gap-1.5 text-xs bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg transition font-medium"
            title="Load sample roster with R1-R5 members"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Sample Alliance Roster</span>
          </button>
        )}

        {/* Hidden JSON file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Export JSON Button */}
        <button
          type="button"
          onClick={onExportData}
          disabled={memberCount === 0}
          className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700/80 px-3 py-1.5 rounded-lg transition font-medium cursor-pointer"
          title="Export roster and schedule to a JSON file"
        >
          <Download className="w-3.5 h-3.5 text-indigo-400" />
          <span>Export</span>
        </button>

        {/* Import JSON Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 px-3 py-1.5 rounded-lg transition font-medium cursor-pointer"
          title="Import roster and schedule from a JSON file"
        >
          <Upload className="w-3.5 h-3.5 text-emerald-400" />
          <span>Import</span>
        </button>

        {/* Google Sheets Sync Button */}
        <button
          type="button"
          onClick={onOpenGoogleSync}
          className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 px-3 py-1.5 rounded-lg transition font-medium cursor-pointer"
          title="Sync 4-week train history to Google Sheets or export CSV"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          <span>Google Sheets</span>
        </button>

        {/* Reset Button */}
        <button
          type="button"
          onClick={() => {
            if (confirm('Reset all members, bookmarks, and schedule?')) {
              onResetAllData();
            }
          }}
          className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-300 border border-slate-700/80 px-2.5 py-1.5 rounded-lg transition"
          title="Reset all data"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>
    </header>
  );
};
