// Filesystem Initialization

async function initFs() {
    console.log("[FS] Initializing filesystem...");
    try {
        const temp = await window.ndutil.fileExists('temp');
        if (temp) await window.ndutil.deleteFile('temp');
        await window.ndutil.createDirectory('temp');
        
        const appdata = await window.ndutil.fileExists('appdata');
        if (!appdata) await window.ndutil.createDirectory('appdata');
        
        const pkg = await window.ndutil.fileExists('pkg.json');
        if (pkg) await window.ndutil.deleteFile('pkg.json');
        await window.ndutil.writeJSON('pkg.json', { version: studio.sessionVersion });
        
        console.log("[FS] Filesystem ready");
    } catch (e) {
        console.error("[FS] Error initializing:", err);
    }
}

// Init

window.onload = async () => {
    // Required Objects
    const deps = {
        studio,
        ndutil: window.ndutil,
        util
    };
    
    const missing = Object.entries(deps)
    .filter(([, v]) => v == null)
    .map(([k]) => k);
    
    if (missing.length) {
        throw new Error(`Missing dependencies: ${missing.join(", ")}`);
    }
    
    console.log("[Init] Prechecks passed, beginning initialization");
    console.log(`[INFO] Running Nivix Studio Release ${studio.sessionVersion}`);
    
    try {
        const footer_version_tag = getEBD('load-footer-version');
        footer_version_tag.textContent = `v${studio.sessionVersion}`;
    } catch {}
    
    try {
        const defaultEULA = { accepted: false, version: 1 };
        
        const prefsPromise = prefs.init().catch(err => {
            console.warn(`[LOAD] Failed to load prefs: ${err}`);
            noti("Failed to load settings");
        });
        
        const tickPromise = Promise.resolve().then(() => {
            try { ticks.start.timeTick(); }
            catch (e) { console.warn(`[LOAD] Failed to start time/date tick: ${err}`); }
        });
        
        await initFs();
        try {
            await convert.run();
        } catch(e) {
            console.error(`[Init] failed to convert files: ${e}`);
        }
        
        const eulaExists = await window.ndutil.fileExists("eula.json");
        if (!eulaExists) await window.ndutil.writeJSON("eula.json", defaultEULA);
        
        const eulaFile = await window.ndutil.readJSON("eula.json");
        
        if (!eulaFile.accepted) {
            console.warn("[EULA] EULA not accepted, blocking startup");
            
            const popup = getEBD("termsPopup");
            popup.style.display = "block";
            
            getEBD("termsAgree").onclick = async () => {
                eulaFile.accepted = true;
                await window.ndutil.writeJSON("eula.json", eulaFile);
                location.reload();
            };
            
            getEBD("termsDisagree").onclick = () => {
                popup.style.display = "none";
                studio.exit();
            };
            
            return;
        }
        
        if (eulaFile.version !== defaultEULA.version) {
            await window.ndutil.deleteFile("eula.json");
            console.warn("[EULA] EULA version changed, forcing reload");
            location.reload();
            return;
        }
        
        await Promise.allSettled([prefsPromise, tickPromise]);
        
        const loadTime = prefs?.loaded?.loadTime ?? 100;
        try { await wait(loadTime); } catch {}
        
        tabs.change("deskpad", "flex");
        
        try { if (await studio.checkUpdate() && window.prefs?.loaded["stdoUpdNoti"]) { noti("Studio Update Available"); }} catch {}
        try { deskpad.init(); } catch {}
        try { dock.init(); } catch {}
        try { dock.open(); } catch {}
        
        console.log("[Init] Initialization complete");
        
    } catch (e) {
        console.error(`[Init] Fatal startup error: ${e.message}`);
        throw err;
    }
};