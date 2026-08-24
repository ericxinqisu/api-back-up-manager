'use strict';
const { app, BrowserWindow, ipcMain, dialog, clipboard, Menu, powerMonitor } = require('electron');
const path = require('path');
const crypto = require('./crypto');
const Store = require('./store');

// Consistent app name (and thus userData path) in dev and packaged builds.
app.setName('Vault');

// Smoke-test / screenshot / design-check / probe mode: throwaway data dir.
if (process.env.VAULT_SMOKE || process.env.VAULT_SHOT || process.env.VAULT_CHECK || process.env.VAULT_PROBE) {
  const fs = require('fs');
  const os = require('os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-smoke-'));
  app.setPath('userData', tmp);
}

let win = null;
let store = null;

// Plaintext vault lives only in main-process memory while unlocked.
let session = null; // { password, vault }

let lastActivity = Date.now();
let autoLockTimer = null;
let settings = { autoLockMinutes: 5 };
let importedPayload = null; // pending payload read during import

function emptyVault() {
  return {
    version: 1,
    tags: [],
    items: [],
    meta: { createdAt: Date.now(), updatedAt: Date.now() },
  };
}

function loadSettings() {
  settings = { ...settings, ...store.readSettings() };
  settings.autoLockMinutes = Math.max(0, Number(settings.autoLockMinutes) || 0);
}

function persistSettings() {
  store.writeSettings(settings);
}

function isUnlocked() {
  return !!session;
}

function requireUnlocked() {
  if (!isUnlocked()) throw new Error('Vault is locked');
}

function startAutoLockTimer() {
  stopAutoLockTimer();
  if (!settings.autoLockMinutes) return;
  autoLockTimer = setInterval(() => {
    if (!isUnlocked()) return;
    if (Date.now() - lastActivity > settings.autoLockMinutes * 60 * 1000) {
      lockVault('auto');
      if (win && !win.isDestroyed()) {
        win.webContents.send('auto-lock');
      }
    }
  }, 30 * 1000);
}

function stopAutoLockTimer() {
  if (autoLockTimer) {
    clearInterval(autoLockTimer);
    autoLockTimer = null;
  }
}

function lockVault(reason) {
  session = null;
  importedPayload = null;
  lastActivity = Date.now();
  if (reason === 'auto') startAutoLockTimer(); // re-arm after auto-lock
}

function touch() {
  lastActivity = Date.now();
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 920,
    minHeight: 620,
    title: 'Vault',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    vibrancy: 'sidebar',
    visualEffectState: 'active',
    backgroundColor: '#00000000',
    roundedCorners: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  win.once('ready-to-show', () => win.show());

  // Optional automated smoke test / screenshot / design check (dev only).
  if (process.env.VAULT_SMOKE || process.env.VAULT_SHOT || process.env.VAULT_CHECK) {
    win.webContents.on('console-message', (_e, level, message) => {
      if (process.env.VAULT_SMOKE) console.log(`[renderer:${level}] ${message}`);
    });
    win.webContents.once('did-finish-load', () => {
      if (process.env.VAULT_SMOKE) {
        const smoke = require('./smoke');
        smoke.run(win);
      } else if (process.env.VAULT_SHOT) {
        const screenshot = require('./screenshot');
        screenshot.run(win);
      } else if (process.env.VAULT_CHECK) {
        const designcheck = require('./designcheck');
        designcheck.run(win);
      }
    });
  } else if (process.env.VAULT_ICON) {
    win.webContents.once('did-finish-load', () => {
      const icon = require('./icon');
      icon.run();
    });
  }

  // Lock the window down: no external navigation, no popups.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.on('closed', () => {
    win = null;
  });
}

function buildMenu() {
  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about', label: 'About Vault' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit', label: 'Quit Vault' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'front' }],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function registerIpc() {
  ipcMain.handle('vault:status', () => ({ created: store.exists() }));

  ipcMain.handle('vault:setup', (_e, password) => {
    if (store.exists()) throw new Error('A vault already exists');
    if (typeof password !== 'string' || password.length < 8) {
      throw new Error('Master password must be at least 8 characters');
    }
    const vault = emptyVault();
    const payload = crypto.encryptVault(JSON.stringify(vault), password);
    store.writeRaw(JSON.stringify(payload));
    session = { password, vault };
    touch();
    startAutoLockTimer();
    return { ok: true };
  });

  ipcMain.handle('vault:unlock', (_e, password) => {
    if (typeof password !== 'string' || !password) throw new Error('Enter your password');
    const raw = store.readRaw();
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (_) {
      throw new Error('Vault file is corrupted');
    }
    let plain;
    try {
      plain = crypto.decryptVault(payload, password);
    } catch (_) {
      throw new Error('Incorrect master password');
    }
    let vault;
    try {
      vault = JSON.parse(plain);
    } catch (_) {
      throw new Error('Vault file is corrupted');
    }
    session = { password, vault };
    touch();
    startAutoLockTimer();
    return { ok: true, vault };
  });

  ipcMain.handle('vault:lock', () => {
    lockVault('manual');
    return { ok: true };
  });

  ipcMain.handle('vault:save', (_e, vaultJson) => {
    requireUnlocked();
    if (typeof vaultJson !== 'string') throw new Error('Bad payload');
    const vault = JSON.parse(vaultJson);
    session.vault = vault;
    vault.meta = { ...vault.meta, updatedAt: Date.now() };
    const payload = crypto.encryptVault(JSON.stringify(vault), session.password);
    store.writeRaw(JSON.stringify(payload));
    return { ok: true };
  });

  ipcMain.handle('vault:changePassword', (_e, oldPassword, newPassword) => {
    requireUnlocked();
    if (oldPassword !== session.password) throw new Error('Current password is incorrect');
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters');
    }
    const payload = crypto.encryptVault(JSON.stringify(session.vault), newPassword);
    store.writeRaw(JSON.stringify(payload));
    session.password = newPassword;
    return { ok: true };
  });

  ipcMain.handle('vault:export', async () => {
    requireUnlocked();
    const payload = crypto.encryptVault(JSON.stringify(session.vault), session.password);
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Export Vault Backup',
      defaultPath: path.join(app.getPath('documents'), `Vault Backup ${dateStamp()}.vault`),
      filters: [
        { name: 'Vault Backup', extensions: ['vault'] },
        { name: 'JSON', extensions: ['json'] },
      ],
    });
    if (canceled || !filePath) return { canceled: true };
    require('fs').writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
    return { canceled: false, path: filePath };
  });

  ipcMain.handle('vault:import', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Import Vault Backup',
      properties: ['openFile'],
      filters: [
        { name: 'Vault Backup', extensions: ['vault', 'json'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (canceled || !filePaths.length) return { canceled: true };
    let raw;
    try {
      raw = require('fs').readFileSync(filePaths[0], 'utf8');
    } catch (_) {
      return { canceled: false, error: 'Could not read the selected file' };
    }
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (_) {
      return { canceled: false, error: 'That file is not a valid Vault backup' };
    }
    if (
      !payload ||
      payload.version !== 1 ||
      !payload.kdf ||
      !payload.salt ||
      !payload.iv ||
      !payload.authTag ||
      !payload.ciphertext
    ) {
      return { canceled: false, error: 'That file is not a valid Vault backup' };
    }
    importedPayload = payload;
    return { canceled: false, needsPassword: true, path: filePaths[0] };
  });

  ipcMain.handle('vault:importWithPassword', (_e, password) => {
    if (!importedPayload) throw new Error('Choose a backup file first');
    let plain;
    try {
      plain = crypto.decryptVault(importedPayload, password);
    } catch (_) {
      throw new Error('Incorrect password for this backup');
    }
    let vault;
    try {
      vault = JSON.parse(plain);
    } catch (_) {
      throw new Error('This backup file is corrupted');
    }
    store.writeRaw(JSON.stringify(importedPayload));
    importedPayload = null;
    session = { password, vault };
    touch();
    startAutoLockTimer();
    return { ok: true, vault };
  });

  ipcMain.handle('clipboard:write', (_e, text) => {
    clipboard.writeText(String(text == null ? '' : text));
    return { ok: true };
  });

  ipcMain.handle('app:getSettings', () => settings);
  ipcMain.handle('app:setSettings', (_e, patch) => {
    settings = { ...settings, ...patch };
    settings.autoLockMinutes = Math.max(0, Number(settings.autoLockMinutes) || 0);
    persistSettings();
    startAutoLockTimer();
    return settings;
  });

  ipcMain.handle('activity', () => {
    touch();
    return { ok: true };
  });
}

function dateStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

app.whenReady().then(() => {
  store = new Store(app.getPath('userData'));
  loadSettings();
  registerIpc();
  buildMenu();
  createWindow();

  // Lock when the machine sleeps or the screen locks.
  powerMonitor.on('suspend', () => {
    if (isUnlocked()) {
      lockVault('sleep');
      if (win && !win.isDestroyed()) win.webContents.send('auto-lock');
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  stopAutoLockTimer();
  lockVault('quit');
});
