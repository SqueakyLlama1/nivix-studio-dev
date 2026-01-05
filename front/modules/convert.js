window.convert = {
    async run() {
        if (await window.ndutil.fileExists("logs")) {
            await window.ndutil.deleteFile("logs");
        }
        if (await window.ndutil.fileExists("apps", "021root")) {
            await window.ndutil.copyFile("apps", "apps", "021root");
        }
    }
};