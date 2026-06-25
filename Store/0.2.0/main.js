const { app, BrowserWindow, ipcMain, screen, shell, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');

let dbManager;

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { error } = require('console');

let startWidth = 1000;
let startHeight = 800;

let mainWindow;
let skippedVersion = null;

const store_path = path.join(os.homedir(), 'nvxstdo', 'store');
const studio_path = path.join(os.homedir(), 'nvxstdo');
const skippedVersionFilePath = path.join(store_path, 'skippedVersion.txt'); ;

function checkApplicationUpdates() {
    const isWindows = process.platform === 'win32';
    const isAppImage = process.platform === 'linux' && !!process.env.APPIMAGE;
    const isLinuxPackage = process.platform === 'linux' && !process.env.APPIMAGE;

    if (isWindows || isAppImage) {
        autoUpdater.autoDownload = false;

        autoUpdater.on('update-available', (info) => {
            if (skippedVersion === info.version) return;

            dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Update Available',
                message: `Version ${info.version} is available. Would you like to download it now?`,
                buttons: ['Download Now', 'Later', 'Skip This Version'],
                cancelId: 1
            }).then((result) => {
                if (result.response === 0) {
                    autoUpdater.downloadUpdate();
                } else if (result.response === 2) {
                    skippedVersion = info.version;
                    saveSkippedVersion();
                }
            });
        });

        autoUpdater.on('update-downloaded', (info) => {
            dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Update Ready',
                message: `Version ${info.version} has been downloaded. Restart the application to install?`,
                buttons: ['Install Now', 'Later'],
                cancelId: 1
            }).then((result) => {
                if (result.response === 0) {
                    if (isAppImage) {
                        process.env.APPIMAGE_SILENT_INSTALL = 'true';
                    }
                    autoUpdater.quitAndInstall();
                }
            });
        });

        autoUpdater.checkForUpdates();
    } else if (isLinuxPackage) {
        autoUpdater.autoDownload = false;

        autoUpdater.on('update-available', (info) => {
            if (skippedVersion === info.version) return;

            dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Update Available',
                message: `Version ${info.version} is available. Please update via your system package manager or download the new release online.`,
                buttons: ['Go to Downloads', 'Later', 'Don\'t Show Again'],
                cancelId: 1
            }).then((result) => {
                if (result.response === 0) {
                    shell.openExternal('https://nivixtech.com/studio');
                } else if (result.response === 2) {
                    skippedVersion = info.version;
                    saveSkippedVersion();
                }
            });
        });

        autoUpdater.checkForUpdates();
    }
}

async function saveSkippedVersion() {
    try {
        await fs.writeFile(skippedVersionFilePath, skippedVersion, { encoding: 'utf-8' });
    } catch(err) {
        console.error(`Failed to save skipped version: ${err}`);
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: startWidth,
        height: startHeight,
        minWidth: 800,
        minHeight: 600,
        icon: path.join(__dirname, 'assets', 'favicon.png'),
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.js')
        }
    });
    
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        const allowedPrefixes = [
            'https://github.com/',
            'https://nivixtech.com/',
            'http://127.0.0.1',
            'http://localhost'
        ];
        
        const isAllowed = allowedPrefixes.some(prefix => url.startsWith(prefix));
        
        if (isAllowed) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });
    
    mainWindow.loadFile('index.html');

    mainWindow.webContents.on('did-finish-load', () => {
        checkApplicationUpdates();
    });
}

app.on('window-all-closed', () => {
    app.quit();
});

app.whenReady().then(async () => {
    await init_sandbox();
    try {
        skippedVersion = await fs.readFile(skippedVersionFilePath, { encoding: 'utf-8' });
    } catch (err) {
        console.error(`Failed to load skippde version: ${err}`);
    }
    dbManager = require('./dbManager');
    const primaryScreen = screen.getPrimaryDisplay();
    const { width, height } = primaryScreen.size;
    if (width < startWidth) {
        startWidth = 800;
    }
    if (height < startHeight) {
        startHeight = 600;
    }
    createWindow();
});

async function init_sandbox() {
    try {
        await fs.mkdir(store_path, { recursive: true });
    } catch (err) {
        throw new Error(`Failed to initialize sandbox: ${err}`)
    }
}

const oldFormats = {
    "0.1.0-hub": path.join('appdata', 'store', 'inventory.ndjson'),
    "0.1.0": path.join('store', 'inventory.ndjson')
}

ipcMain.handle('check-for-old-inventory', async () => {
    try {
        const expectedOldInventoryPath = path.join(studio_path, oldFormats['0.1.0-hub']);
        await fs.access(expectedOldInventoryPath);
        return "0.1.0-hub";
    } catch (err) {
        console.log("0.1.0-hub inventory not found, checking next version...");
    }

    try {
        const expectedOldInventoryPath = path.join(studio_path, oldFormats['0.1.0']);
        await fs.access(expectedOldInventoryPath);
        return "0.1.0";
    } catch (err) {
        console.log("0.1.0 inventory not found.");
    }

    return false; 
});

const preferencesPath = path.join(os.homedir(), 'nvxstdo', 'store', 'preferences.json');

ipcMain.handle('get-preferences', async () => {
    try {
        const preferencesContents = await fs.readFile(preferencesPath, 'utf-8');
        return JSON.parse(preferencesContents);
    } catch {
        return {};
    }
});

ipcMain.handle('set-preferences', async (_event, preferences) => {
    try {
        const data = JSON.stringify(preferences, null, 2);
        await fs.writeFile(preferencesPath, data);
    } catch (err) {
        throw new Error(err);
    }
});

ipcMain.handle('create-space', async (_event, name) => {
    return dbManager.createSpace(name);
});

ipcMain.handle('list-spaces', async () => {
    return dbManager.listSpaces();
});

ipcMain.handle('delete-space', async (_event, id) => {
    return dbManager.deleteSpace(id);
});

ipcMain.handle('create-category', async (_event, name, space, category = null, fields = []) => {
    return dbManager.createCategory(name, space, category, fields);
});

ipcMain.handle('list-categories', async (_event, space) => {
    return dbManager.listSpaces(space);
});

ipcMain.handle('delete-category', async (_event, category) => {
    return dbManager.deleteCategory(category);
});

ipcMain.handle('create-item', async (_event, name, quantity = 0, category, attributes = {}) => {
    return dbManager.createItem(name, quantity, category, attributes);
});

ipcMain.handle('delete-item', async (_event, id) => {
    return dbManager.deleteItem(id);
});

ipcMain.handle('update-item', async (_event, id, updates = {}) => {
    return dbManager.updateItem(id, updates);
});

ipcMain.handle('list-items-by-category', async (_event, category) => {
    return dbManager.listItemsByCategory(category);
});

ipcMain.handle('get-item-by-id', async (_event, id) => {
    return dbManager.getItemById(id);
});

ipcMain.handle('query-items', async (_event, {category = null, rules = [], logicalOp = 'AND'} = {}) => {
    return dbManager.queryItemsUnified({ categoryId: category, rules, logicalOp });
});

ipcMain.handle('rebuild-search-index', async (_event) => {
    return dbManager.rebuildSearchIndex();
});

ipcMain.handle('convert', async (_event, version, space) => {
    return dbManager.convert(version, space);
});