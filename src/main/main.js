'use strict';
const { app, BrowserWindow, ipcMain, dialog, clipboard, Menu, powerMonitor, systemPreferences, safeStorage } = require('electron');
const path = require('path');
const nodeCrypto = require('crypto');
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

// Touch ID self-test (diagnostics): launch with --touchid-self-test,
// scan (or cancel) the system prompt, then read /tmp/vault-touchid-selftest.json.
if (process.argv.includes('--touchid-self-test')) {
  const fs = require('fs');
  app.whenReady().then(async () => {
    const out = {};
    try {
      out.canPrompt = systemPreferences.canPromptTouchID();
    } catch (e) {
      out.canPrompt = 'ERR: ' + String((e && e.message) || e);
    }
    try {
      out.safeStorage = safeStorage.isEncryptionAvailable();
    } catch (e) {
      out.safeStorage = 'ERR: ' + String((e && e.message) || e);
    }
    try {
      const res = await systemPreferences.promptTouchID('Self-test Touch ID for Vault');
      // Electron 33 resolves with undefined on success, rejects on failure.
      out.promptResult = res === undefined ? 'SUCCESS' : String(res);
    } catch (e) {
      out.promptResult = 'REJECTED';
      out.promptError = String((e && e.message) || e);
    }
    out.finishedAt = Date.now();
    try {
      fs.writeFileSync('/tmp/vault-touchid-selftest.json', JSON.stringify(out, null, 2));
    } catch (e) {
      console.error('selftest write failed', e);
    }
    app.quit();
  });
}

let win = null;
let store = null;

// Plaintext vault lives only in main-process memory while unlocked.
// `key` is the derived 32-byte encryption key; `salt` is the vault's KDF
// salt (kept so password-based unlocks keep working after key-based saves).
// `password` is null when the vault was unlocked with Touch ID.
let session = null; // { password, key, salt, vault }

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

/* ---------------- Touch ID unlock material ---------------- */

// Hardware check only — must not touch the Keychain (accessing it can block
// the main process on an interactive authorization prompt).
function canUseTouchId() {
  try {
    return !!systemPreferences.canPromptTouchID();
  } catch (_) {
    return false;
  }
}

// Park the session key, OS-keychain-encrypted, so Touch ID can unlock.
// The first call may show a macOS Keychain authorization prompt, which is
// why this runs only from an explicit user action (toggling the setting on).
// Returns true when a fresh key was stored, false on any failure.
function storeTouchIdKey() {
  if (!session || !session.key) return false;
  try {
    const blob = safeStorage.encryptString(session.key.toString('hex'));
    return store.writeTouchIdKey(blob.toString('base64'));
  } catch (_) {
    return false;
  }
}

function clearTouchIdKey() {
  store.deleteTouchIdKey();
}

// After any password-based unlock/setup/import/password change, keep the
// stored Touch ID key in sync with the current vault key.
function syncTouchIdKey() {
  if (settings.touchIdEnabled) {
    if (!storeTouchIdKey()) clearTouchIdKey();
  } else {
    clearTouchIdKey();
  }
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
        const smoke = require('../../tools/smoke');
        smoke.run(win);
      } else if (process.env.VAULT_SHOT) {
        const screenshot = require('../../tools/screenshot');
        screenshot.run(win);
      } else if (process.env.VAULT_CHECK) {
        const designcheck = require('../../tools/designcheck');
        designcheck.run(win);
      }
    });
  } else if (process.env.VAULT_ICON) {
    win.webContents.once('did-finish-load', () => {
      const icon = require('../../tools/icon');
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
    const key = crypto.deriveKey(password, Buffer.from(payload.salt, 'base64'));
    session = { password, key, salt: payload.salt, vault };
    syncTouchIdKey();
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
    let key;
    let plain;
    try {
      key = crypto.deriveKey(password, Buffer.from(payload.salt, 'base64'));
      plain = crypto.decryptVaultWithKey(payload, key);
    } catch (_) {
      throw new Error('Incorrect master password');
    }
    let vault;
    try {
      vault = JSON.parse(plain);
    } catch (_) {
      throw new Error('Vault file is corrupted');
    }
    session = { password, key, salt: payload.salt, vault };
    syncTouchIdKey();
    touch();
    startAutoLockTimer();
    return { ok: true, vault };
  });

  ipcMain.handle('vault:unlockTouchId', async () => {
    if (!settings.touchIdEnabled) throw new Error('Touch ID unlock is turned off');
    if (!canUseTouchId()) throw new Error('Touch ID is not available on this Mac');
    const stored = store.readTouchIdKey();
    if (!stored) {
      throw new Error('Unlock once with your password to enable Touch ID');
    }
    if (process.env.VAULT_SMOKE_TOUCHID) {
      // Automated smoke test only: skip the real biometric prompt.
    } else {
      // Note: Electron 33's promptTouchID resolves with `undefined` on
      // success (Promise<void> + evaluateAccessControl) and REJECTS with
      // the localized description on failure — so a resolution (even
      // undefined) means the fingerprint matched. `false` is only
      // tolerated for compatibility with other Electron versions.
      let result;
      try {
        result = await systemPreferences.promptTouchID('Unlock Vault');
      } catch (err) {
        const detail = String((err && err.message) || err || '').toLowerCase();
        if (detail.includes('lock')) {
          throw new Error(
            'Touch ID is locked out after repeated failed attempts — enter your Mac password when the system asks, then try again'
          );
        }
        if (detail.includes('cancel')) {
          throw new Error('Touch ID was cancelled — unlock with your password');
        }
        throw new Error(
          'Fingerprint not recognized — try again, or unlock with your password below'
        );
      }
      if (result === false) {
        throw new Error(
          'Fingerprint not recognized — try again, or unlock with your password below'
        );
      }
    }
    let key;
    try {
      key = Buffer.from(safeStorage.decryptString(Buffer.from(stored, 'base64')), 'hex');
    } catch (_) {
      clearTouchIdKey();
      throw new Error('Touch ID unlock is unavailable — unlock with your password');
    }
    let payload;
    let vault;
    try {
      payload = JSON.parse(store.readRaw());
      vault = JSON.parse(crypto.decryptVaultWithKey(payload, key));
    } catch (_) {
      clearTouchIdKey();
      throw new Error('Touch ID unlock is out of date — unlock with your password once');
    }
    session = { password: null, key, salt: payload.salt, vault };
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
    const payload = crypto.encryptVaultWithKey(
      JSON.stringify(vault),
      session.key,
      Buffer.from(session.salt, 'base64')
    );
    store.writeRaw(JSON.stringify(payload));
    return { ok: true };
  });

  ipcMain.handle('vault:changePassword', (_e, oldPassword, newPassword) => {
    requireUnlocked();
    if (typeof oldPassword !== 'string' || !oldPassword) {
      throw new Error('Enter your current password');
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters');
    }
    // Verify the current password against the vault's salt, so this also
    // works when the vault was unlocked with Touch ID.
    let currentPayload;
    try {
      currentPayload = JSON.parse(store.readRaw());
    } catch (_) {
      throw new Error('Vault file is corrupted');
    }
    let oldKey;
    try {
      oldKey = crypto.deriveKey(oldPassword, Buffer.from(currentPayload.salt, 'base64'));
    } catch (_) {
      throw new Error('Current password is incorrect');
    }
    if (!nodeCrypto.timingSafeEqual(oldKey, session.key)) {
      throw new Error('Current password is incorrect');
    }
    const payload = crypto.encryptVault(JSON.stringify(session.vault), newPassword);
    store.writeRaw(JSON.stringify(payload));
    session.password = newPassword;
    session.key = crypto.deriveKey(newPassword, Buffer.from(payload.salt, 'base64'));
    session.salt = payload.salt;
    syncTouchIdKey();
    return { ok: true };
  });

  ipcMain.handle('vault:export', async () => {
    requireUnlocked();
    const payload = crypto.encryptVaultWithKey(
      JSON.stringify(session.vault),
      session.key,
      Buffer.from(session.salt, 'base64')
    );
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
    let key;
    let plain;
    try {
      key = crypto.deriveKey(password, Buffer.from(importedPayload.salt, 'base64'));
      plain = crypto.decryptVaultWithKey(importedPayload, key);
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
    session = { password, key, salt: importedPayload.salt, vault };
    syncTouchIdKey();
    touch();
    startAutoLockTimer();
    return { ok: true, vault };
  });

  ipcMain.handle('clipboard:write', (_e, text) => {
    clipboard.writeText(String(text == null ? '' : text));
    return { ok: true };
  });

  ipcMain.handle('app:getSettings', () => settings);
  ipcMain.handle('app:touchIdStatus', () => ({
    available: canUseTouchId(),
    enabled: !!settings.touchIdEnabled,
    ready: store.hasTouchIdKey(),
  }));
  ipcMain.handle('app:setSettings', (_e, patch) => {
    if (!patch || typeof patch !== 'object') throw new Error('Bad settings');
    if ('touchIdEnabled' in patch) {
      const wasEnabled = !!settings.touchIdEnabled;
      const wantEnabled = !!patch.touchIdEnabled;
      if (wantEnabled && !wasEnabled) {
        // Turning Touch ID on: park the current key in the OS keychain.
        // macOS may ask for Keychain authorization here.
        if (!session || !session.key) throw new Error('Unlock the vault first');
        if (!canUseTouchId()) throw new Error('Touch ID is not available on this Mac');
        if (!storeTouchIdKey()) {
          clearTouchIdKey();
          throw new Error('Could not enable Touch ID — macOS Keychain access was denied');
        }
      } else if (!wantEnabled) {
        clearTouchIdKey();
      }
      settings = { ...settings, ...patch, touchIdEnabled: wantEnabled };
    } else {
      settings = { ...settings, ...patch };
    }
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

// Closing the window fully quits the app (including on macOS).
app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', () => {
  stopAutoLockTimer();
  lockVault('quit');
});
