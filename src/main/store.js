'use strict';
const fs = require('fs');
const path = require('path');

/**
 * Minimal atomic file store for the encrypted vault.
 * Keeps a rolling backup of the previous version alongside the live file.
 */
class Store {
  constructor(dir) {
    this.file = path.join(dir, 'vault.vlt');
    this.backupFile = path.join(dir, 'vault.vlt.bak');
    this.settingsFile = path.join(dir, 'settings.json');
    this.touchIdFile = path.join(dir, 'touchid.vlt');
  }

  exists() {
    return fs.existsSync(this.file);
  }

  readRaw() {
    return fs.readFileSync(this.file, 'utf8');
  }

  writeRaw(data) {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    // Keep the previous good version as a backup (atomic copy first).
    if (fs.existsSync(this.file)) {
      try {
        fs.copyFileSync(this.file, this.backupFile);
      } catch (_) {
        /* non-fatal */
      }
    }
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, data, 'utf8');
    fs.renameSync(tmp, this.file);
  }

  readSettings() {
    try {
      return JSON.parse(fs.readFileSync(this.settingsFile, 'utf8'));
    } catch (_) {
      return {};
    }
  }

  writeSettings(obj) {
    try {
      fs.mkdirSync(path.dirname(this.settingsFile), { recursive: true });
      fs.writeFileSync(this.settingsFile, JSON.stringify(obj, null, 2), 'utf8');
    } catch (_) {
      /* non-fatal */
    }
  }

  // ---- Touch ID unlock material ------------------------------------
  // Stores the vault encryption key, encrypted by the OS keychain via
  // Electron safeStorage. Only readable after a successful Touch ID prompt.

  hasTouchIdKey() {
    return fs.existsSync(this.touchIdFile);
  }

  readTouchIdKey() {
    try {
      return fs.readFileSync(this.touchIdFile, 'utf8');
    } catch (_) {
      return null;
    }
  }

  writeTouchIdKey(data) {
    try {
      fs.mkdirSync(path.dirname(this.touchIdFile), { recursive: true });
      const tmp = this.touchIdFile + '.tmp';
      fs.writeFileSync(tmp, data, 'utf8');
      fs.renameSync(tmp, this.touchIdFile);
      return true;
    } catch (_) {
      return false;
    }
  }

  deleteTouchIdKey() {
    try {
      fs.unlinkSync(this.touchIdFile);
    } catch (_) {
      /* already gone */
    }
  }
}

module.exports = Store;
