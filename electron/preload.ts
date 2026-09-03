import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  loadData: () => Promise<unknown>;
  saveData: (data: unknown) => Promise<{ success: boolean; error?: string }>;
  copyToClipboard: (text: string) => Promise<boolean>;
}

const api: ElectronAPI = {
  loadData: () => ipcRenderer.invoke('storage:load'),
  saveData: (data: unknown) => ipcRenderer.invoke('storage:save', data),
  copyToClipboard: (text: string) => ipcRenderer.invoke('clipboard:writeText', text),
};

contextBridge.exposeInMainWorld('electronAPI', api);
