window.installedApps = [];
window.availableApps = [];

// ======================
// Install App Logic
// ======================

async function installApp(appId, installBtn, version = "latest", force = false) {
    console.log(`[App Installer] Starting installation for: ${appId}`);

    let preContent;
    if (installBtn) preContent = installBtn.textContent;

    try {
        if (installBtn) {
            installBtn.disabled = true;
            installBtn.textContent = `Installing...`;
        }

        const listExists = await window.ndutil.fileExists(['temp', 'list.json']);
        if (!listExists) await window.ndutil.cacheFile('https://www.nivixtech.com/studio/list.json');
        console.log(`[App Installer] Reading list file at: ${['temp', 'list.json']}`);
        const list = await window.ndutil.readJSON(['temp', 'list.json']);

        console.log(`[App Installer] Reading studio pkg.json`);
        const studioPkg = await window.ndutil.readJSON('pkg.json');

        const updates = list.updates || {};
        const appMeta = updates[appId];
        if (!appMeta) {
            console.warn(`[App Installer] No update info found for app: ${appId}`);
            throw new Error("No update info for app");
        }

        // Process version
        let computedVersion = null;
        if (version == "latest") {
            computedVersion = appMeta.version;
        } else {
            computedVersion = version;
        }

        console.log(`[App Installer] Version to install: ${computedVersion}`);

        const historyMetaCache = await window.ndutil.cacheFile(`https://www.nivixtech.com/studio/${appId}/${appId}-history.json`);
        const historyMeta = await window.ndutil.readJSON(historyMetaCache.path);

        console.log(`[App Installer] Installed version for app ${pretty(appId)} is ${appMeta.version}`);

        console.log(`[App Installer] Version ${historyMeta.history[computedVersion]} requires one of these studio versions: ${historyMeta.history[computedVersion].requires} - Running studio version is ${studio.sessionVersion}`);

        if (!force) {
            if (!historyMeta.history[computedVersion].requires.includes(studioPkg.version)) {
                console.warn(`[App Installer] App requires one of these studio versions: ${historyMeta.history[computedVersion].requires.join(', ')}, have ${studioPkg.version}`);
                noti(`This app version is not supported by your studio version.`);
                if (installBtn) {
                    installBtn.disabled = false;
                    installBtn.textContent = preContent;
                }
                return;
            }
        } else {
            console.log(`[App Installer] Force flag used, force installing ${appId}`);
        }

        const zipUrl = `https://www.nivixtech.com/studio/${appId}/${appId}-${computedVersion}.zip`;
        console.log(`[App Installer] Downloading app zip from: ${zipUrl}`);
        const cacheRes = await window.ndutil.cacheFile(zipUrl);

        if (!cacheRes.success) {
            console.error(`[App Installer] Failed to download app zip: ${zipUrl}`);
            throw new Error("Failed to download app zip");
        }

        console.log(`[App Installer] Downloaded zip successfully. Extracting to apps/${appId}`);
        console.log(['apps', appId]);
        console.log(cacheRes.path);
        await window.ndutil.unzip(cacheRes.path, ['apps', appId]);

        console.log(`[App Installer] Extraction complete. Refreshing section content...`);

        if (installBtn) installBtn.textContent = `Installed!`;
        if (prefs?.loaded.appInstNoti) noti(`${pretty(appId)} installed successfully`);
        console.log(`[App Installer] ${appId} installed successfully!`);

        deskpad.refresh();
    } catch (err) {
        console.error(`[App Installer] Install failed for ${appId}:`, err);
        if (installBtn) installBtn.textContent = "Failed";
        noti("Installation failed!");
        setTimeout(() => {
            if (installBtn) {
                installBtn.textContent = preContent;
                installBtn.disabled = false;
            }
        }, 2000);
    }
}

async function uninstallApp(app, data) {
    const prettyName = pretty(app);

    // Remove app folder
    try {
        await window.ndutil.deleteFile(['apps', app]);
        console.log(`Uninstalled ${app}`);
    } catch (err) {
        noti(`Failed to uninstall ${prettyName}!`);
        console.error(`[App Uninstaller] App error for "${app}":`, err);
        return;
    }

    // Remove corresponding apps data (if requested)
    if (data) {
        try {
            await window.ndutil.deleteFile(['appdata', app]);
            console.log(`Deleted ${app} data`);
        } catch (err) {
            noti(`Failed to delete appdata for ${prettyName}.`);
            console.error(`[App Uninstaller] Appdata error for "${app}":`, err);
        }
    }

    // Success
    noti(`Uninstalled ${prettyName}`);
    console.log(`Uninstalled ${app}`);
    await deskpad.refresh();
}