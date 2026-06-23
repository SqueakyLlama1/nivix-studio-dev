const { app, BrowserWindow, ipcMain, screen } = require('electron');
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
    
    mainWindow.loadFile('index.html');
}

// Close app when all windows are closed (Windows/Linux)
app.on('window-all-closed', () => {
    app.quit();
});

app.whenReady().then(async () => {
    await init_sandbox();
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

const store_path = path.join(os.homedir(), 'nvxstdo', 'store');
const studio_path = path.join(os.homedir(), 'nvxstdo');

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
    // Check if an old inventory exists for the hub version of 0.1.0 - 0.1.1
    try {
        const expectedOldInventoryPath = path.join(studio_path, oldFormats['0.1.0-hub']);
        await fs.access(expectedOldInventoryPath);
        return "0.1.0-hub";
    } catch (err) {
        console.log("0.1.0-hub inventory not found, checking next version...");
    }

    // Check if an old inventory exists for version 0.1.0
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

/* ===========================================
Inventory API & Frontend Hook
=========================================== */