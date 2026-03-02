import { app, BrowserWindow } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 500,
        minHeight: 575,
        icon: path.join(__dirname, 'favicon.ico'),
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true
        }
    });

    mainWindow.loadFile('index.html');
}

app.on('window-all-closed', () => {
    app.quit();
})

app.whenReady().then(createWindow);