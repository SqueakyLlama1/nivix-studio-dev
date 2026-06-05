const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('storeAPI', {
    initSandbox: () => ipcRenderer.invoke('init-sandbox'),
    needsConversion: () => ipcRenderer.invoke('check-for-old-inventory')
});