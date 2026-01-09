window.convert = {
    async run() {
        return new Promise(async (resolve) => {
            console.log("[STUDIO - Convert] Called");
            try {
                if (!await window.ndutil.fileExists("converted", "021root")) {
                    try {
                        if (await window.ndutil.fileExists("logs")) {
                            await window.ndutil.deleteFile("logs");
                            console.log("[STUDIO - Convert] 0.3.0 Removed Logs");
                        }
                        if (await window.ndutil.fileExists("apps", "021root")) {
                            await window.ndutil.copyFile("apps", "apps", "021root");
                            console.log("[STUDIO - Convert] 0.3.0 Copied Addons to new sandbox");
                        }
                        if (await window.ndutil.fileExists("appdata", "021root")) {
                            await window.ndutil.copyFile("appdata", "appdata", "021root");
                            console.log("[STUDIO - Convert] 0.3.0 Copied Appdata to new sandbox");
                        }
                        if (await window.ndutil.fileExists("prefs.json")) {
                            await window.ndutil.copyFile("prefs.json", "prefs.old.json", "021root");
                            console.log("[STUDIO - Convert] 0.3.0 Copied Preferences to new sandbox");
                        }
                        await window.ndutil.writeFile("converted", "Converted sandbox from 0.2.1 to 0.3.0, now in ${INSTDIR}/front/dynamic", "021root");
                    } catch {
                        console.error("[STUDIO - Convert] Failed to move 0.2.1 sandbox to 0.3.0");
                        return;
                    }
                }
            } catch (e) {
                console.error(`[STUDIO - Convert] Failed to run: ${e}`);
                return;
            }
            console.log("[STUDIO - Convert] End");
            resolve();
        });
    }
};