// electron/main.js — Electron main process: creates and manages the game window.
// Dev mode: loads the Vite dev server (start it first with `npm run dev`).
// Production: loads the built files from dist/index.html.

import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Running from source (`npm run electron`) = dev: use the Vite dev server.
// Running as a packaged app = production: use the pre-built dist/ files.
const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    title: 'Life Sim',
    webPreferences: {
      // Security defaults: the renderer has no direct Node.js access.
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    // Requires the Vite dev server to be running (`npm run dev`).
    win.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  // macOS: clicking the dock icon re-creates a window if none is open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Windows/Linux: quit the app when all windows are closed.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
