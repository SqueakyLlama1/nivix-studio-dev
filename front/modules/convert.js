window.convert = {
    async run() {
        if (await window.ndutil.fileExists("logs")) {
            await window.ndutil.deleteFile("logs");
            console.log("[STUDIO - Convert] 0.3.0 Removed Logs");
        }
        if (await window.ndutil.fileExists("apps", "021root")) {
            await window.ndutil.copyFile("apps", "apps", "021root");
            console.log("[STUDIO - Convert] 0.3.0 Copied Apps to new sandbox");
        }
        if (await window.ndutil.fileExists("appdata", "021root")) {
            await window.ndutil.copyFile("appdata", "appdata", "021root");
            console.log("[STUDIO - Convert] 0.3.0 Copied Appdata to new sandbox");
        }
    }
};