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