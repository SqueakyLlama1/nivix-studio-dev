var updatesAvailable = [];
var notSupported = [];

async function loadSectionContent() {
    studio.log.new("log", "[SectionLoader] Loading section content...");
    const installed = getEBD('IS_PHC');
    const download = getEBD('DS_PHC');
    const listPath = "https://www.nivixtech.com/studio/list.json";
    
    installedApps = [];
    let listJSON = null;
    let remoteConnected = false;
    
    // Step 1: Try to load cached remote list
    try {
        studio.log.new("log", "[SectionLoader] Attempting to load remote list...");
        const cacheRes = await window.ndutil.cacheFile(listPath);
        
        if (cacheRes.success && cacheRes.path !== "undefined") {
            try {
                const tempJSON = await window.ndutil.readJSON(cacheRes.path);
                if (tempJSON && typeof tempJSON === 'object' && Array.isArray(tempJSON.apps)) {
                    listJSON = tempJSON;
                    remoteConnected = true;
                    studio.log.new("log", "[SectionLoader] Remote list loaded successfully");
                } else {
                    studio.log.new("warn", "[SectionLoader] Invalid remote list structure");
                }
            } catch (err) {
                studio.log.new("warn", "[SectionLoader] Error parsing remote JSON:", err.message);
            }
        } else {
            studio.log.new("warn", "[SectionLoader] Remote cache failed");
        }
    } catch (err) {
        studio.log.new("warn", "[SectionLoader] Unable to read remote app list:", err.message);
    }
    
    // Step 2: Read installed apps
    try {
        studio.log.new("log", "[SectionLoader] Reading installed apps...");
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
                if (hasIndex && hasPkg) installedApps.push(folder);
            }
            studio.log.new("log", `[SectionLoader] Installed apps found: ${installedApps.length}`);
        }
    } catch (err) {
        studio.log.new("warn", "[SectionLoader] Error reading installed apps:", err.message);
    }
    
    // Step 3: Populate Installed Section
    installed.innerHTML = installedApps.length ? "" : `<p>No apps installed</p>`;
    for (const app of installedApps) {
        const appContainer = newEl('div');
        appContainer.classList.add('app');
        appContainer.addEventListener('click', () => openAppPopup(app));
        
        // Compatibility layer for 0.1.0
        // 0.2.0 changes from using favicon.png to using ${app}.png
        // Must be removed in 1.0.0
        let appImgFormat;
        const imgFormat1 = await window.ndutil.fileExists(['apps', app, `${app}.png`]);
        if (imgFormat1) {
            appImgFormat = app;
        } else {
            appImgFormat = "favicon";
        }
        appContainer.innerHTML = `
            <img alt="${app} icon" src="apps/${app}/${appImgFormat}.png">
            ${pretty(app)}
        `;
        
        try {
            const pkgPath = await window.ndutil.pathjoin(['apps', app, 'pkg.json']);
            const pkg = await window.ndutil.readJSON(pkgPath);
            const localVersion = pkg.version?.trim();
            
            if (remoteConnected && listJSON?.updates?.[app]?.version) {
                const remoteVersion = listJSON.updates[app].version.trim();
                if (util.needsUpdate(localVersion, remoteVersion)) {
                    updatesAvailable.push(app);
                    studio.log.new("log", `[SectionLoader] ${app} update available: ${localVersion} → ${remoteVersion}`);
                    const updSpan = newEl('span');
                    updSpan.classList.add('upd');
                    appContainer.appendChild(updSpan);
                }
            }

            const historyCache = await window.ndutil.cacheFile(`https://www.nivixtech.com/studio/${app}/${app}-history.json`);
            let historyJSON;
            if (historyCache.path) {
                historyJSON = await window.ndutil.readJSON(historyCache.path);
            }

            if (remoteConnected && historyJSON?.history[localVersion].requires) {
                if (!historyJSON.history[localVersion].requires.includes(studio.sessionVersion)) {
                    notSupported.push(app);
                    studio.log.new("warn", `[Dashboard] App ${app} not supported by this, Studio ${studio.sessionVersion}`);
                    appContainer.querySelectorAll('.upd').forEach(span => span.remove());
                    const noSpan = newEl('span');
                    noSpan.classList.add('ns');
                    appContainer.appendChild(noSpan);
                }
            }
        } catch (err) {
            studio.log.new("warn", `[SectionLoader] Failed to check version for ${app}: ${err}`);
        }
        
        installed.appendChild(appContainer);
    }
    
    // Step 4: Populate Download Section
    studio.log.new("log", "[SectionLoader] Populating download section...");
    download.innerHTML = "";
    
    let availableApps = [];
    if (remoteConnected && listJSON?.apps) {
        availableApps = listJSON.apps.filter(a => !installedApps.includes(a));
    }
    
    if (!remoteConnected || !listJSON || availableApps.length === 0) {
        studio.log.new("warn", "[SectionLoader] No connection or no available apps");
        download.innerHTML = `<p>No connection or apps available</p>`;
    } else {
        studio.log.new("log", `[SectionLoader] Available apps found: ${availableApps.length}`);
        for (const app of availableApps) {
            const appContainer = newEl('div');
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
        if (prefs.loaded.appUpdNoti) noti("App updates available");
    }
    
    studio.log.new("log", `[SectionLoader] Done. Remote connected: ${remoteConnected}, Installed: ${installedApps.length}, Available: ${availableApps.length}`);
}

async function refreshDashboard() {
    // Reset Values
    studio.log.new("log", "=================[DASHBOARD REFRESH]=================");
    clearInterval(ticks.timeTickInterval);
    ticks.timeTickInterval = null;
    getEBD('DS_PHC').innerHTML = `<div class="loader"></div>`;
    getEBD('IS_PHC').innerHTML = `<div class="loader"></div>`;
    getEBD('timeDisplay').innerHTML = "TI:ME AM";
    getEBD('dateDisplay').innerHTML = "MMM DD, YYYY";
    updatesAvailable = [];
    notSupported = [];
    
    // Re-initialize
    await wait(50); // To assure the user it reloaded
    ticks.start.timeTick();
    await initFs();
    await loadSectionContent();
    studio.log.new("log", '[INFO] Dashboard refresh finished');
}