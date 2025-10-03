// src/bridge/windowBridge.js
const { ipcMain, shell } = require('electron');

// Bridge는 단순히 IPC 핸들러를 등록하는 역할만 함 (비즈니스 로직 없음)
module.exports = {
  initialize() {
    // initialize 시점에 windowManager를 require하여 circular dependency 문제 해결
    const windowManager = require('../window/windowManager');
    
    // 기존 IPC 핸들러들
    ipcMain.handle('toggle-content-protection', () => windowManager.toggleContentProtection());
    ipcMain.handle('get-content-protection-status', () => windowManager.getContentProtectionStatus());
    ipcMain.on('show-settings-window', () => windowManager.showSettingsWindow());
    ipcMain.on('hide-settings-window', () => windowManager.hideSettingsWindow());
    ipcMain.on('cancel-hide-settings-window', () => windowManager.cancelHideSettingsWindow());

    ipcMain.handle('open-login-page', () => windowManager.openLoginPage());
    ipcMain.handle('open-personalize-page', () => windowManager.openLoginPage());
    ipcMain.handle('move-window-step', (event, direction) => windowManager.moveWindowStep(direction));
    ipcMain.handle('open-external', (event, url) => shell.openExternal(url));

    // Newly moved handlers from windowManager
    ipcMain.on('header-state-changed', (event, state) => windowManager.handleHeaderStateChanged(state));
    ipcMain.on('header-animation-finished', (event, state) => windowManager.handleHeaderAnimationFinished(state));
    ipcMain.handle('get-header-position', () => windowManager.getHeaderPosition());
    ipcMain.handle('move-header-to', (event, newX, newY) => windowManager.moveHeaderTo(newX, newY));
    ipcMain.handle('adjust-window-height', (event, { winName, height }) => windowManager.adjustWindowHeight(winName, height));
    
    const { screen } = require('electron');
    ipcMain.handle('get-work-area-height', () => {
      return screen.getPrimaryDisplay().workArea.height;
    });

    // New handlers for sidebar collapse
    ipcMain.handle('resize-header-window', (event, { width, height }) => {
      return windowManager.resizeHeaderWindow({ width, height });
    });
    
    ipcMain.handle('set-sidebar-collapsed', (event, { isCollapsed }) => {
      const internalBridge = require('../bridge/internalBridge');
      internalBridge.emit('window:setSidebarCollapsed', { isCollapsed });
      return Promise.resolve();
    });
  },

  async toggleResearchView() {
    const windowManager = require('../window/windowManager');
    return await windowManager.toggleResearchView();
  },

  notifyFocusChange(win, isFocused) {
    win.webContents.send('window:focus-change', isFocused);
  }
};