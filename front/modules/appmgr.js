let installedApps = [];
let availableApps = [];

// ======================
// Install App Logic
// ======================

async function installApp(appId, installBtn, version = "latest") {
    studio.log.new("log", `[App Installer] Starting installation for: ${appId}`);
    let preContent = installBtn.textContent;
    
    try {
        installBtn.disabled = true;
        installBtn.textContent = `Installing...`;
        studio.log.new("log", `[App Installer] Button disabled and label updated`);
        
        const listExists = await window.ndutil.fileExists(['temp', 'list.json']);
        if (!listExists) await window.ndutil.cacheFile('https://www.nivixtech.com/studio/list.json');
        studio.log.new("log", `[App Installer] Reading list file at: ${['temp', 'list.json']}`);
        const list = await window.ndutil.readJSON(['temp', 'list.json']);
        
        studio.log.new("log", `[App Installer] Reading studio pkg.json`);
        const studioPkg = await window.ndutil.readJSON('pkg.json');
        
        const updates = list.updates || {};
        const appMeta = updates[appId];
        if (!appMeta) {
            studio.log.new("warn", `[App Installer] No update info found for app: ${appId}`);
            throw new Error("No update info for app");
        }

        // Process version
        let computedVersion = null;
        if (version == "latest") {
            computedVersion = appMeta.version;
        } else {
            computedVersion = version;
        }

        studio.log.new("log", `[App Installer] Version to install: ${computedVersion}`);
        
        const historyMetaCache = await window.ndutil.cacheFile(`https://www.nivixtech.com/studio/${appId}/${appId}-history.json`);
        const historyMeta = await window.ndutil.readJSON(historyMetaCache.path);

        studio.log.new("log", `[App Installer] Installed version for app ${pretty(appId)} is ${appMeta.version}`);
        
        studio.log.new("log", `[App Installer] Version ${historyMeta.history[computedVersion]} requires one of these studio versions: ${historyMeta.history[computedVersion].requires} - Running studio version is ${studio.sessionVersion}`);
        
        if (!historyMeta.history[computedVersion].requires.includes(studioPkg.version)) {
            studio.log.new("warn", `[App Installer] App requires one of these studio versions: ${historyMeta.history[computedVersion].requires.join(', ')}, have ${studioPkg.version}`);
            noti(`This app version is not supported by your studio version.`);
            installBtn.disabled = false;
            installBtn.textContent = preContent;
            return;
        }
        
        const zipUrl = `https://www.nivixtech.com/studio/${appId}/${appId}-${computedVersion}.zip`;
        studio.log.new("log", `[App Installer] Downloading app zip from: ${zipUrl}`);
        const cacheRes = await window.ndutil.cacheFile(zipUrl);
        
        if (!cacheRes.success) {
            studio.log.new("error", `[App Installer] Failed to download app zip: ${zipUrl}`);
            throw new Error("Failed to download app zip");
        }
        
        studio.log.new("log", `[App Installer] Downloaded zip successfully. Extracting to apps/${appId}`);
        studio.log.new("log", ['apps', appId]);
        studio.log.new("log", cacheRes.path);
        await window.ndutil.unzip(cacheRes.path, ['apps', appId]);
        
        studio.log.new("log", `[App Installer] Extraction complete. Refreshing section content...`);
        
        installBtn.textContent = `Installed!`;
        if (prefs?.loaded.appInstNoti) noti(`${pretty(appId)} installed successfully`);
        studio.log.new("log", `[App Installer] ${appId} installed successfully!`);

        await refreshDashboard();
    } catch (err) {
        studio.log.new("error", `[App Installer] Install failed for ${appId}:`, err);
        installBtn.textContent = "Failed";
        noti("Installation failed!");
        setTimeout(() => {
            installBtn.textContent = "Installed!";
            installBtn.disabled = false;
        }, 2000);
    }
}

async function uninstallApp(app, data) {
    const prettyName = pretty(app);
    
    // Remove app folder
    try {
        await window.ndutil.deleteFile(['apps', app]);
        studio.log.new("log", `Uninstalled ${app}`);
    } catch (err) {
        if (prefs?.loaded.appUnstNoti) noti(`Failed to uninstall ${prettyName}!`);
        studio.log.new("error", `[unApp Installer] App error for "${app}":`, err);
        return;
    }
    
    // Remove corresponding apps data (if requested)
    if (data) {
        try {
            await window.ndutil.deleteFile(['appdata', app]);
            studio.log.new("log", `Deleted ${app} data`);
        } catch (err) {
            noti(`Failed to delete appdata for ${prettyName}.`);
            studio.log.new("error", `[unApp Installer] Appdata error for "${app}":`, err);
        }
    }
    
    // Success
    noti(`Uninstalled ${prettyName}`);
    studio.log.new("log", `Uninstalled ${app}`);
    await refreshDashboard();
}