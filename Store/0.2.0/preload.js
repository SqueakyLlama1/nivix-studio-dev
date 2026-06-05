const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('storeAPI', {
    initSandbox: () => ipcRenderer.invoke('init-sandbox'),
    needsConversion: () => ipcRenderer.invoke('check-for-old-inventory'),
    getPreferences: () => ipcRenderer.invoke('get-preferences'),
    setPreferences: (preferences) => ipcRenderer.invoke('set-preferences', preferences)
});