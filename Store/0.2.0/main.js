const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { error } = require('console');

let mainWindow;
let skippedVersion = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
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

app.whenReady().then(createWindow);

const sandbox_path = path.join(os.homedir(), 'nvxstdo', 'store');

ipcMain.handle('init-sandbox', async () => {
    try {
        await fs.mkdir(sandbox_path, { recursive: true });
    } catch (err) {
        throw new Error(`Failed to initialize sandbox: ${err}`)
    }
});

const oldFormats = {
    "0.1.0": "inventory.ndjson"
}

ipcMain.handle('check-for-old-inventory', async () => {
    // Check if an old inventory exists for version 0.1.0
    try {
        let expectedOldInventoryPath = path.join(os.homedir(), 'nvxstdo', 'store', oldFormats['0.1.0']);
        const inventory = await fs.readFile(expectedOldInventoryPath, 'utf-8');
        
        if (!inventory || inventory.trim() === '') {
            return false;
        }
        return "0.1.0";
    } catch(err) {
        if (err.code === "ENOENT") {
            return false;
        }
        const errorMsg = `Failed to get old inventory for 0.1.0: ${err.message}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
    }
});