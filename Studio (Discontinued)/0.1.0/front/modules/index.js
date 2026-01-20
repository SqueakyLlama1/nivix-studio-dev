const studioVersion = "0.1";

// ======================
// Tab Management
// ======================

const openTab = async id => {
    console.log(`[Tab] Opening tab: ${id}`);
    const tabs = document.querySelectorAll('.tab');
    if (!tabs) return console.warn('[Tab] No tabs found');
    
    if (window.jQuery) {
        $(tabs).fadeOut(175);
        $(`#${id}`).fadeIn(175);
    } else {
        tabs.forEach(tab => {
            tab.style.display = (tab.id === id ? 'block' : 'none');
        });
    }
};

// ======================
// Time & Tick
// ======================

let tickInterval = null;
let timeTickInterval = null;

function timeTick() {
    const now = new Date();
    const timeOutput = getEBD("timeDisplay");
    const dateOutput = getEBD("dateDisplay");
    if (!timeOutput || !dateOutput) return console.warn("[Tick] Missing time/date display elements");
    
    const hours = now.getHours() % 12 || 12;
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
    timeOutput.textContent = `${hours}:${minutes} ${ampm}`;
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    dateOutput.textContent = `${monthNames[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
}

function startTick() {
    console.log("[Tick] Starting time tick...");
    timeTickInterval = setInterval(timeTick, 1000);
}

// ======================
// Notification Handler
// ======================

const notificationQueue = [];
let notificationActive = false;

async function showNextNotification() {
    if (notificationActive || notificationQueue.length === 0) return;
    notificationActive = true;
    
    const message = notificationQueue.shift();
    
    const notiElement = getEBD('notiContainer');
    const notiMessage = getEBD('notiMessage');
    if (!notiElement || !notiMessage) return console.warn("[Notification] Missing elements");
    
    notiMessage.textContent = message;
    notiElement.style.top = "1em";
    
    await wait(3000);
    notiElement.style.top = "-5em";
    await wait(300);
    
    notificationActive = false;
    showNextNotification();
}

function noti(message) {
    notificationQueue.push(message);
    showNextNotification();
}

// ======================
// Filesystem Initialization
// ======================

async function initFs() {
    console.log("[FS] Initializing filesystem...");
    try {
        const temp = await window.ndutil.fileExists('temp');
        if (temp.exists) await window.ndutil.deleteFile('temp');
        await window.ndutil.createDirectory('temp');
        
        const appdata = await window.ndutil.fileExists('appdata');
        if (!appdata.exists) await window.ndutil.createDirectory('appdata');
        
        const pkg = await window.ndutil.fileExists('pkg.json');
        if (pkg.exists) await window.ndutil.deleteFile('pkg.json');
        await window.ndutil.writeJSON('pkg.json', { version: studioVersion });
        
        console.log("[FS] Filesystem ready");
    } catch (err) {
        console.error("[FS] Error initializing:", err);
    }
}

// ======================
// Load Section Content
// ======================

let updatesAvailable = [];

async function loadSectionContent() {
    console.log("[SectionLoader] Loading section content...");
    const installed = getEBD('installedSectionPlaceholderContent');
    const download = getEBD('downloadSectionPlaceholderContent');
    const listPath = "https://www.nivixtech.com/studio/list.json";
    
    installedApps = [];
    let listJSON = null;
    let remoteConnected = false;
    
    // Step 1: Try to load cached remote list
    try {
        console.log("[SectionLoader] Attempting to load remote list...");
        const cacheRes = await window.ndutil.cacheFile(listPath);
        
        if (cacheRes.success && cacheRes.path !== "undefined") {
            try {
                const tempJSON = await window.ndutil.readJSON(cacheRes.path);
                if (tempJSON && typeof tempJSON === 'object' && Array.isArray(tempJSON.apps)) {
                    listJSON = tempJSON;
                    remoteConnected = true;
                    console.log("[SectionLoader] Remote list loaded successfully");
                } else {
                    console.warn("[SectionLoader] Invalid remote list structure");
                }
            } catch (err) {
                console.warn("[SectionLoader] Error parsing remote JSON:", err.message);
            }
        } else {
            console.warn("[SectionLoader] Remote cache failed");
        }
    } catch (err) {
        console.warn("[SectionLoader] Unable to read remote app list:", err.message);
    }
    
    // Step 2: Read installed apps
    try {
        console.log("[SectionLoader] Reading installed apps...");
        const appFolderList = await window.ndutil.listDirectory('apps');
        let appFolders = [];
        for (const folder of appFolderList) {
            if (!folder.includes('.')) {
                appFolders.push(folder);
            }
        }
        if (appFolders && appFolders.length !== 0) {
            for (const folder of appFolders) {
                const indexPath = await window.ndutil.pathjoin(['apps', folder, 'index.html']);
                const pkgPath = await window.ndutil.pathjoin(['apps', folder, 'pkg.json']);
                const hasIndex = await window.ndutil.fileExists(indexPath);
                const hasPkg = await window.ndutil.fileExists(pkgPath);
                if (hasIndex.exists && hasPkg.exists) installedApps.push(folder);
            }
            console.log(`[SectionLoader] Installed apps found: ${installedApps.length}`);
        }
    } catch (err) {
        console.warn("[SectionLoader] Error reading installed apps:", err.message);
    }
    
    // Step 3: Populate Installed Section
    installed.innerHTML = installedApps.length ? "" : `<br><p>No apps installed</p><br>`;
    for (const app of installedApps) {
        const appContainer = document.createElement('div');
        appContainer.classList.add('app');
        appContainer.addEventListener('click', () => openAppPopup(app));
        appContainer.innerHTML = `
            <img alt="${app} icon" src="http://127.0.0.1:58000/apps/${app}/favicon.png">
            ${pretty(app)}
        `;
        
        try {
            const pkgPath = await window.ndutil.pathjoin(['apps', app, 'pkg.json']);
            const pkg = await window.ndutil.readJSON(pkgPath);
            const localVersion = pkg.version?.trim();
            
            if (remoteConnected && listJSON?.updates?.[app]?.version) {
                const remoteVersion = listJSON.updates[app].version.trim();
                if (localVersion !== remoteVersion) {
                    updatesAvailable.push(app);
                    console.log(`[SectionLoader] ${app} update available: ${localVersion} → ${remoteVersion}`);
                    const updSpan = document.createElement('span');
                    updSpan.classList.add('upd');
                    updSpan.textContent = '⇅';
                    appContainer.appendChild(updSpan);
                }
            }
        } catch (err) {
            console.warn(`[SectionLoader] Failed to check version for ${app}:`, err.message);
        }
        
        installed.appendChild(appContainer);
    }
    
    // Step 4: Populate Download Section
    console.log("[SectionLoader] Populating download section...");
    await wait(1000);
    download.innerHTML = "";
    
    let availableApps = [];
    if (remoteConnected && listJSON?.apps) {
        availableApps = listJSON.apps.filter(a => !installedApps.includes(a));
    }
    
    if (!remoteConnected || !listJSON || availableApps.length === 0) {
        console.warn("[SectionLoader] No connection or no available apps");
        download.innerHTML = `<br><p>No connection or apps available</p><br>`;
    } else {
        console.log(`[SectionLoader] Available apps found: ${availableApps.length}`);
        for (const app of availableApps) {
            const appContainer = document.createElement('div');
            appContainer.classList.add('app');
            appContainer.addEventListener('click', () => openInstallPopup(app));
            appContainer.innerHTML = `
                <img alt="${app} icon" src="https://www.nivixtech.com/studio/${app}.png">
                ${pretty(app)}
            `;
            download.appendChild(appContainer);
        }
    }
    
    if (updatesAvailable.length !== 0 && remoteConnected) {
        noti("App updates available");
    }
    
    console.log(`[SectionLoader] Done. Remote connected: ${remoteConnected}, Installed: ${installedApps.length}, Available: ${availableApps.length}`);
}

// ======================
// Script Loader
// ======================

const scripts = ['modules/popup.js', 'modules/appmgr.js', 'modules/taskmgr.js'];

async function loadScripts() {
    console.log("[Init] Loading scripts...");
    return new Promise((resolve, reject) => {
        const totalScripts = scripts.length;
        let loadedScripts = 0;
        
        scripts.forEach(src => {
            try {
                const scriptEl = document.createElement('script');
                scriptEl.src = src;
                scriptEl.onload = () => {
                    loadedScripts++;
                    console.log(`[Init] Loaded script: ${src}`);
                    if (loadedScripts === totalScripts) {
                        console.log("[Init] All scripts loaded");
                        resolve();
                    }
                };
                scriptEl.onerror = err => {
                    console.error(`[Init] Error loading script: ${src}`, err);
                    reject(`Error loading script: ${src}`);
                };
                document.body.appendChild(scriptEl);
            } catch (err) {
                reject(`Error creating script element for ${src}: ${err}`);
            }
        });
    });
}

// ======================
// Init
// ======================

window.onload = async () => {
    console.log(`[INFO] Running Nivix Studio Release ${studioVersion}`);
    console.log("[Init] Window loaded, starting app initialization...");
    try {
        await loadScripts();
        await initFs();
        startTick();
        await wait(500);
        openTab('dashboard');
        await loadSectionContent();
        console.log("[Init] Initialization complete");
    } catch (err) {
        console.error("[Init] Error during startup:", err);
    }
};

// ======================
// Restart / Shutdown
// ======================

const restartBtn = getEBD('restartBtn');
const exitBtn = getEBD('exitBtn');
const refreshBtn = getEBD('refreshBtn')
if (restartBtn) restartBtn.addEventListener('click', () => {
    console.log("[System] Restart requested");
    location.reload();
});
if (exitBtn) exitBtn.addEventListener('click', async () => {
    console.log("[System] Shutdown requested");
    try {
        await window.ndutil.deleteFile('temp');
    } catch(err) {
        console.error(`Failed to clear cache: ${err}`);
    }
    window.close();
});
if (refreshBtn) refreshBtn.addEventListener('click', refreshDashboard);

async function refreshDashboard() {
    clearInterval(timeTickInterval);
    timeTickInterval = null;
    getEBD('downloadSectionPlaceholderContent').innerHTML = `<br><div class="loader"></div><br>`;
    getEBD('installedSectionPlaceholderContent').innerHTML = `<br><div class="loader"></div><br>`;
    getEBD('timeDisplay').innerHTML = "TI:ME AM";
    getEBD('dateDisplay').innerHTML = "MMM DD, YYYY";
    updatesAvailable = [];
    await initFs();
    await wait(500);
    startTick();
    await loadSectionContent();
    console.log('[INFO] Dashboard refresh finished');
}