// ======================
// Filesystem Initialization
// ======================

async function initFs() {
    studio.log.new("log", "[FS] Initializing filesystem...");
    try {
        const temp = await window.ndutil.fileExists('temp');
        if (temp) await window.ndutil.deleteFile('temp');
        await window.ndutil.createDirectory('temp');
        
        const appdata = await window.ndutil.fileExists('appdata');
        if (!appdata) await window.ndutil.createDirectory('appdata');
        
        const logs = await window.ndutil.fileExists('logs');
        if (!logs) await window.ndutil.createDirectory('logs');
        
        const pkg = await window.ndutil.fileExists('pkg.json');
        if (pkg) await window.ndutil.deleteFile('pkg.json');
        await window.ndutil.writeJSON('pkg.json', { version: studio.sessionVersion });
        
        studio.log.new("log", "[FS] Filesystem ready");
    } catch (err) {
        studio.log.new("error", "[FS] Error initializing:", err);
    }
}

// ======================
// Init
// ======================

window.onload = async () => {
    studio.log.new("log", `[INFO] Running Nivix Studio Release ${studio.sessionVersion}`);
    studio.log.new("log", "[Init] Window loaded, starting app initialization...");
    try {
        try { await prefs.init(); } 
        catch(err) { studio.log.new("warn", `[LOAD] Failed to load prefs: ${err}`); noti("Failed to load settings"); }
        
        await initFs();
        
        try { ticks.start.timeTick(); } 
        catch(err) { studio.log.new("warn", `[LOAD] Failed to start time/date tick: ${err}`); }
        
        ticks.start.logSave();
        
        let loadTime = 100;
        if (prefs?.loaded["loadTime"]) loadTime = prefs.loaded["loadTime"];
        
        // Check EULA
        studio.log.new("log", "[EULA] Checking EULA status");
        const defaultEULA = {
            accepted: false,
            version: 1
        };
        const eulaFileExists = await window.ndutil.fileExists("eula.json");
        if (!eulaFileExists) await window.ndutil.writeJSON("eula.json", defaultEULA);
        const eulaFile = await window.ndutil.readJSON("eula.json");
        
        const eulaAgree = getEBD('termsAgree');
        const eulaDisagree = getEBD('termsDisagree');

        if (!eulaFile.accepted) {
            studio.log.new("warn", "[EULA] EULA has not accepted by user, asking for acceptance");
            const eulapopup = getEBD('termsPopup');
            eulapopup.style.display = "block";

            eulaAgree.addEventListener('click', async function() {
                eulaFile.accepted = true;
                await window.ndutil.writeJSON('eula.json', eulaFile);
                location.reload();
            });

            eulaDisagree.addEventListener('click', function() {
                eulapopup.style.display = "none";
                studio.exit();
            });
        } else if (eulaFile.accepted) {
            if (eulaFile.version !== defaultEULA.version) {
                await window.ndutil.deleteFile("eula.json");
                studio.log.new("warn", "[EULA] New EULA version, reloading");
                location.reload();
            }
            await wait(loadTime);
            openTab('dashboard');
            dock.open();
            await loadSectionContent();
            await studio.checkUpdate();
            studio.log.new("log", "[Init] Initialization complete");
        } else {
            studio.log.new("log", "[EULA] EULA was invalid, resetting and reloading");
            studio.log.new("log", `[EULA] EULA default value should be false, is: ${defaultEULA.accepted}`);
            eulaFile.accepted = false;
            location.reload();
        }
    } catch (err) {
        studio.log.new("error", `[Init] Error during startup: ${err.message}, on line ${err.stack}`);
    }
};