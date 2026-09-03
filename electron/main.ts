import { app, BrowserWindow, ipcMain, clipboard, Menu } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬ dist-electron
// │ ├── main.js
// │ └── preload.js
// ├─┬ dist
// │ └── index.html

process.env.APP_ROOT = path.join(__dirname, '..');

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = app.isPackaged
  ? RENDERER_DIST
  : path.join(process.env.APP_ROOT, 'public');

let win: BrowserWindow | null;

const DATA_FILE_NAME = 'train-scheduler-data.json';

function getDataFilePath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, DATA_FILE_NAME);
}

// Setup IPC handlers
function setupIpc() {
  const dataPath = getDataFilePath();
  console.log('[Alliance Train Scheduler] Data storage file:', dataPath);

  ipcMain.handle('storage:load', async () => {
    try {
      const filePath = getDataFilePath();
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return null; // File doesn't exist yet
      }
      console.error('Failed to load data file:', err);
      return null;
    }
  });

  ipcMain.handle('storage:save', async (_event, data: unknown) => {
    try {
      const filePath = getDataFilePath();
      const content = JSON.stringify(data, null, 2);
      await fs.writeFile(filePath, content, 'utf-8');
      return { success: true };
    } catch (err) {
      console.error('Failed to save data file:', err);
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('clipboard:writeText', (_event, text: string) => {
    clipboard.writeText(text);
    return true;
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#090d16',
    title: 'Alliance Train Scheduler',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.removeMenu();

  // Enable F12 and Ctrl+Shift+I shortcut to toggle DevTools
  win.webContents.on('before-input-event', (_event, input) => {
    if (input.type === 'keyDown') {
      if (
        input.key === 'F12' ||
        (input.control && input.shift && input.key.toLowerCase() === 'i')
      ) {
        win?.webContents.toggleDevTools();
      }
    }
  });

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString());
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  setupIpc();
  createWindow();
});
