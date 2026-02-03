import { app, BrowserWindow, dialog } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { autoUpdater } = require('electron-updater')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow
let skippedVersion = null

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
    })

    mainWindow.loadFile('index.html')

    mainWindow.once('ready-to-show', () => {
        checkForUpdates()
    })
}

app.on('window-all-closed', () => {
    app.quit()
})

app.whenReady().then(createWindow)

function checkForUpdates() {
    autoUpdater.autoDownload = false

    autoUpdater.on('update-available', async (info) => {
        if (skippedVersion === info.version) return

        const { response } = await dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Update Available',
            message: `Version ${info.version} is available. Do you want to download and install it now?`,
            buttons: ['Yes', 'No', 'Skip this version']
        })

        if (response === 0) {
            autoUpdater.downloadUpdate()
        } else if (response === 2) {
            skippedVersion = info.version
        }
    })

    autoUpdater.on('update-downloaded', async () => {
        const { response } = await dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Update Ready',
            message: 'Update downloaded. Install and restart now?',
            buttons: ['Yes', 'Later']
        })

        if (response === 0) {
            autoUpdater.quitAndInstall()
        }
    })

    autoUpdater.checkForUpdates()
}