window.convert = {
    async run() {
        if (await window.ndutil.fileExists("logs")) {
            await window.ndutil.deleteFile("logs");
        }
    }
};