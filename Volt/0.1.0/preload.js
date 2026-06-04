const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('voltAPI', {
    initSandbox: () => ipcRenderer.invoke('init-sandbox')
});