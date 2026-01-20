let installedApps = [];
let availableApps = [];

// ======================
// Install App Logic
// ======================

async function installApp(appId, installBtn, version = "latest") {
    console.log(`[installApp] Starting installation for: ${appId}`);
    let preContent = installBtn.textContent;
    
    try {
        installBtn.disabled = true;
        installBtn.textContent = `Installing...`;
        console.log(`[installApp] Button disabled and label updated`);
        
        const listPath = await window.ndutil.pathjoin(['temp', 'list.json']);
        const listExists = await window.ndutil.fileExists(listPath);
        if (!listExists.exists) await window.ndutil.cacheFile('https://www.nivixtech.com/studio/list.json');
        console.log(`[installApp] Reading list file at: ${listPath}`);
        const list = await window.ndutil.readJSON(listPath);
        
        console.log(`[installApp] Reading studio pkg.json`);
        const studioPkg = await window.ndutil.readJSON('pkg.json');
        
        const updates = list.updates || {};
        const appMeta = updates[appId];
        if (!appMeta) {
            console.warn(`[installApp] No update info found for app: ${appId}`);
            throw new Error("No update info for app");
        }

        // Process version
        let computedVersion = null;
        if (version == "latest") {
            computedVersion = appMeta.version;
        } else {
            computedVersion = version;
        }
        
        const historyMetaCache = await window.ndutil.cacheFile(`https://www.nivixtech.com/studio/${appId}/${appId}-history.json`);
        const historyMeta = await window.ndutil.readJSON(historyMetaCache.path);
        
        console.log(`[installApp] Found app metadata: version=${appMeta.version}, requires=${historyMeta.history[computedVersion].requires}`);
        
        if (!appMeta.requires.includes(studioPkg.version)) {
            console.warn(`[installApp] App requires one of these studio versions: ${historyMeta.history[computedVersion].requires.join(', ')}, have ${studioPkg.version}`);
            noti(`This app version is not supported by your studio version.`);
            installBtn.disabled = false;
            installBtn.textContent = preContent;
            return;
        }
        
        const zipUrl = `https://www.nivixtech.com/studio/${appId}/${appId}-${computedVersion}.zip`;
        console.log(`[installApp] Downloading app zip from: ${zipUrl}`);
        const cacheRes = await window.ndutil.cacheFile(zipUrl);
        
        if (!cacheRes.success) {
            console.error(`[installApp] Failed to download app zip: ${zipUrl}`);
            throw new Error("Failed to download app zip");
        }
        
        console.log(`[installApp] Downloaded zip successfully. Extracting to apps/${appId}`);
        const targetPath = await window.ndutil.pathjoin(['apps', appId]);
        console.log(targetPath);
        console.log(cacheRes.path);
        await window.ndutil.unzip(cacheRes.path, targetPath);
        
        console.log(`[installApp] Extraction complete. Refreshing section content...`);
        await refreshDashboard();
        
        installBtn.textContent = `Installed!`;
        noti(`${pretty(appId)} installed successfully`);
        console.log(`[installApp] ${appId} installed successfully!`);
    } catch (err) {
        console.error(`[installApp] Install failed for ${appId}:`, err);
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
        const appPath = await window.ndutil.pathjoin(['apps', app]);
        await window.ndutil.deleteFile(appPath);
        console.log(`Deleted ${app}`);
    } catch (err) {
        noti(`Failed to uninstall ${prettyName}!`);
        console.error(`[uninstallApp] App error for "${app}":`, err);
        return;
    }
    
    // Remove appdata folder (if requested)
    if (data) {
        try {
            const dataPath = await window.ndutil.pathjoin(['appdata', app]);
            await window.ndutil.deleteFile(dataPath);
            console.log(`Deleted ${app} data`);
        } catch (err) {
            noti(`Failed to delete appdata for ${prettyName}.`);
            console.error(`[uninstallApp] Appdata error for "${app}":`, err);
        }
    }
    
    // Success
    noti(`Uninstalled ${prettyName}`);
    console.log(`Uninstalled ${app}`);
    await refreshDashboard();
}