const { app, BrowserWindow, ipcMain, ipcRenderer } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs').promises;

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 500,
        minHeight: 575,
        icon: path.join(__dirname, 'favicon.ico'),
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
        preload: path.join(__dirname, 'preload.js')
        }
    });
    
    mainWindow.loadFile('index.html');
}

app.on('window-all-closed', () => {
    app.quit();
})

app.whenReady().then(createWindow);

const sandbox_path = path.join(os.homedir(), 'nvxstdo', 'volt');

ipcMain.handle('init-sandbox', async () => {
    try {
        await fs.mkdir(sandbox_path, { recursive: true });
        console.log('Sandbox ready!');
    } catch (err) {
        console.error('Failed to create sandbox:', err);
        throw new Error(`Main process failed to create directory: ${err.message}`);
    }
});