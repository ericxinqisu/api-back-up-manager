'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vaultAPI', {
  // Vault lifecycle
  status: () => ipcRenderer.invoke('vault:status'),
  setup: (password) => ipcRenderer.invoke('vault:setup', password),
  unlock: (password) => ipcRenderer.invoke('vault:unlock', password),
  unlockWithTouchId: () => ipcRenderer.invoke('vault:unlockTouchId'),
  lock: () => ipcRenderer.invoke('vault:lock'),
  save: (vaultJson) => ipcRenderer.invoke('vault:save', vaultJson),
  changePassword: (oldPassword, newPassword) =>
    ipcRenderer.invoke('vault:changePassword', oldPassword, newPassword),
  exportVault: () => ipcRenderer.invoke('vault:export'),
  importVault: () => ipcRenderer.invoke('vault:import'),
  importWithPassword: (password) => ipcRenderer.invoke('vault:importWithPassword', password),

  // Utilities
  copyText: (text) => ipcRenderer.invoke('clipboard:write', text),
  getSettings: () => ipcRenderer.invoke('app:getSettings'),
  setSettings: (patch) => ipcRenderer.invoke('app:setSettings', patch),
  touchIdStatus: () => ipcRenderer.invoke('app:touchIdStatus'),
  activity: () => ipcRenderer.invoke('activity'),

  // Events from main
  onAutoLock: (callback) => {
    ipcRenderer.on('auto-lock', () => callback());
  },
});
