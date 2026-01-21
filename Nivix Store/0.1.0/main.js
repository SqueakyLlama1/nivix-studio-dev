const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    // Create the browser window.
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        icon: path.join(__dirname, 'favicon.png'),
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true
        }
    });
    
    // Load your HTML file
    win.loadFile('index.html');
}

// Open the window when Electron is ready
app.whenReady().then(createWindow);

// Handle Closing (Specific to Windows/Linux)
app.on('window-all-closed', () => {
    // On Windows/Linux, apps usually quit when the window is closed
    app.quit();
});