import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  FileSpreadsheet,
  Download,
  ExternalLink,
  RefreshCw,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { AppData } from '../types';
import {
  APPS_SCRIPT_TEMPLATE,
  downloadHistoryCSV,
  syncToGoogleSheets,
} from '../services/googleSync';
import { copyToClipboard } from '../services/storage';

interface GoogleSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  appData: AppData;
  onSaveWebhookUrl: (url: string) => void;
}

export const GoogleSyncModal: React.FC<GoogleSyncModalProps> = ({
  isOpen,
  onClose,
  appData,
  onSaveWebhookUrl,
}) => {
  const [urlInput, setUrlInput] = useState(appData.googleWebhookUrl || '');
  const [activeTab, setActiveTab] = useState<'sync' | 'setup'>('sync');
  const [copiedScript, setCopiedScript] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    setUrlInput(appData.googleWebhookUrl || '');
  }, [appData.googleWebhookUrl, isOpen]);

  if (!isOpen) return null;

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUrlInput(val);
    onSaveWebhookUrl(val);
  };

  const handleCopyScript = async () => {
    const success = await copyToClipboard(APPS_SCRIPT_TEMPLATE);
    if (success) {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2500);
    }
  };

  const handleSyncNow = async () => {
    if (!urlInput.trim()) {
      setSyncResult({
        success: false,
        message: 'Please enter your Google Apps Script Web App URL first.',
      });
      return;
    }

    setSyncing(true);
    setSyncResult(null);

    const result = await syncToGoogleSheets(urlInput, appData);
    setSyncing(false);
    setSyncResult(result);
  };

  const handleCsvDownload = () => {
    downloadHistoryCSV(appData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Google Sheets Cloud Sync</h2>
              <p className="text-xs text-slate-400">Sync 4 weeks of train history to a Google Sheet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6">
          <button
            onClick={() => setActiveTab('sync')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'sync'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Sync & Export</span>
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'setup'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Setup Instructions & Script</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'sync' ? (
            <div className="space-y-6">
              {/* Webhook Input Section */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Google Apps Script Web App URL
                </label>
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={urlInput}
                  onChange={handleUrlChange}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
                <p className="text-xs text-slate-400">
                  Don't have a URL yet? Check the{' '}
                  <button
                    onClick={() => setActiveTab('setup')}
                    className="text-emerald-400 hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    Setup Instructions
                  </button>{' '}
                  tab to create one in 2 minutes.
                </p>
              </div>

              {/* Status Banner */}
              {syncResult && (
                <div
                  className={`p-4 rounded-xl text-sm flex items-start space-x-3 ${
                    syncResult.success
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                  }`}
                >
                  {syncResult.success ? (
                    <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-rose-400" />
                  )}
                  <div>
                    <p className="font-semibold">{syncResult.success ? 'Sync Completed' : 'Sync Failed'}</p>
                    <p className="text-xs opacity-90 mt-0.5">{syncResult.message}</p>
                  </div>
                </div>
              )}

              {/* Actions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Google Sync Button */}
                <button
                  onClick={handleSyncNow}
                  disabled={syncing}
                  className="w-full flex items-center justify-center space-x-2.5 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'Syncing...' : 'Sync 4 Weeks to Google Sheets'}</span>
                </button>

                {/* Local CSV Backup Download */}
                <button
                  onClick={handleCsvDownload}
                  className="w-full flex items-center justify-center space-x-2.5 py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium rounded-xl transition-all"
                >
                  <Download className="w-4 h-4 text-slate-400" />
                  <span>Download 4-Week CSV</span>
                </button>
              </div>

              {/* Summary Information Box */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-400 space-y-1">
                <p className="font-medium text-slate-300">What gets exported?</p>
                <p>
                  Exports 28 days of schedule data (the active schedule week + the 3 prior weeks). Each row includes the week date range, calendar date, day of week, conductor name, passenger name, and any day notes.
                </p>
              </div>
            </div>
          ) : (
            /* Setup Instructions Tab */
            <div className="space-y-6 text-sm text-slate-300">
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-100 flex items-center space-x-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                    1
                  </span>
                  <span>Create or Open a Google Sheet</span>
                </h3>
                <p className="text-xs text-slate-400 pl-7">
                  Open the shared Google Sheet where you want your 4-week train history saved.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-slate-100 flex items-center space-x-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                    2
                  </span>
                  <span>Open Apps Script & Paste Script</span>
                </h3>
                <p className="text-xs text-slate-400 pl-7">
                  In Google Sheets, go to <strong className="text-slate-200">Extensions $\rightarrow$ Apps Script</strong>. Replace any existing code with the snippet below and click <strong className="text-slate-200">Save (Ctrl+S)</strong>.
                </p>

                {/* Code Snippet Box */}
                <div className="pl-7">
                  <div className="relative bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-300 max-h-48 overflow-y-auto">
                    <button
                      onClick={handleCopyScript}
                      className="absolute top-2 right-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg flex items-center space-x-1.5 transition-colors border border-slate-700"
                    >
                      {copiedScript ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>
                    <pre className="whitespace-pre-wrap">{APPS_SCRIPT_TEMPLATE}</pre>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-slate-100 flex items-center space-x-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                    3
                  </span>
                  <span>Deploy as a Web App</span>
                </h3>
                <div className="text-xs text-slate-400 pl-7 space-y-1.5">
                  <p>In the Apps Script editor, click <strong className="text-slate-200">Deploy $\rightarrow$ New deployment</strong>.</p>
                  <p>Select type: <strong className="text-slate-200">Web app</strong>.</p>
                  <p>Execute as: <strong className="text-slate-200">Me</strong>.</p>
                  <p>Who has access: <strong className="text-slate-200">Anyone</strong> (so Train Scheduler can send updates).</p>
                  <p>Click <strong className="text-slate-200">Deploy</strong> and copy the <strong className="text-slate-200">Web App URL</strong>.</p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-slate-100 flex items-center space-x-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                    4
                  </span>
                  <span>Paste Web App URL into Train Scheduler</span>
                </h3>
                <p className="text-xs text-slate-400 pl-7">
                  Return to the <strong className="text-emerald-400">Sync & Export</strong> tab in this modal, paste your Web App URL, and click <strong className="text-slate-200">Sync 4 Weeks to Google Sheets</strong>!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/80">
          <a
            href="https://sheets.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-400 hover:text-emerald-400 inline-flex items-center gap-1 transition-colors"
          >
            <span>Open Google Sheets</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition-colors border border-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
