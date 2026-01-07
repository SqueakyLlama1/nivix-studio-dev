// Filesystem Initialization

async function initFs() {
    console.log("[FS] Initializing filesystem...");
    try {
        const temp = await window.ndutil.fileExists('temp');
        if (temp) await window.ndutil.deleteFile('temp');
        await window.ndutil.createDirectory('temp');
        
        let pkg;
        let pkgVer;
        const pkgExists = await window.ndutil.fileExists('pkg.json');
        if (pkgExists) pkg = await window.ndutil.readJSON('pkg.json');
        if (pkg?.version) pkgVer = pkg.version;
        if (pkgVer !== studio.sessionVersion) await window.ndutil.writeJSON('pkg.json', { version: studio.sessionVersion });
        
        console.log("[FS] Filesystem ready");
    } catch (e) {
        console.error("[FS] Error initializing:", err);
    }
}

// Init

window.onload = async () => {
    // Required Objects
    const deps = {
        studio: window.studio,
        ndutil: window.ndutil,
        util: window.util
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
        try { ticks.start.timeTick(); }
        catch (e) { console.warn(`[LOAD] Failed to start time/date tick: ${e}`); }
        
        await initFs();
        await convert.run();

        const IP = await window.ndutil.getIP();
        studio.bind = `http://${IP}:58000`;
        
        const loadTime = prefs?.loaded?.loadTime ?? 100;
        try { await wait(loadTime); } catch {}
        
        tabs.change("deskpad", "flex");
        
        try { deskpad.init(); } catch {}
        try { dock.init(); } catch {}
        try { dock.open(); } catch {}
        
        console.log("[Init] Initialization complete");
        
        await wait(50);
        getEBD('load').parentElement.removeChild(getEBD('load'));

        try { if (await studio.checkUpdate() && window.prefs?.loaded["stdoUpdNoti"]) { noti("Studio Update Available"); }} catch {}
    } catch (e) {
        console.error(`[Init] Fatal startup error: ${e.message}`);
        throw e;
    }
};