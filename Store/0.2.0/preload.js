const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('storeAPI', {
    // App Configuration / System
    needsConversion: () => ipcRenderer.invoke('check-for-old-inventory'),
    getPreferences: () => ipcRenderer.invoke('get-preferences'),
    setPreferences: (preferences) => ipcRenderer.invoke('set-preferences', preferences),

    // Spaces
    createSpace: (name) => ipcRenderer.invoke('create-space', name),
    listSpaces: () => ipcRenderer.invoke('list-spaces'),
    deleteSpace: (spaceId) => ipcRenderer.invoke('delete-space', spaceId),
    
    // Categories
    createCategory: (name, space, category, fields) => ipcRenderer.invoke('create-category', name, space, category, fields),
    listCategories: (space) => ipcRenderer.invoke('list-categories', space),
    deleteCategory: (category) => ipcRenderer.invoke('delete-category', category),
    
    // Items
    createItem: (name, quantity, category, attributes) => ipcRenderer.invoke('create-item', name, quantity, category, attributes),
    updateItem: (id, updates) => ipcRenderer.invoke('update-item', id, updates),
    deleteItem: (id) => ipcRenderer.invoke('delete-item', id),
    getItemById: (id) => ipcRenderer.invoke('get-item-by-id', id),
    queryItems: (queryPayload) => ipcRenderer.invoke('query-items', queryPayload),
    
    // Utilities / Maintenance
    rebuildSearchIndex: () => ipcRenderer.invoke('rebuild-search-index'),
    convert: (version, space) => ipcRenderer.invoke('convert', version, space)
});