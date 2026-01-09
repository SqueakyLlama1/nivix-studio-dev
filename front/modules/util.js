window.studio = {
    sessionVersion: "0.3.0",
    bind: null,
    cdn: "https://www.nivixtech.com/studio",

    async checkUpdate() {
        const listURL = `${this.cdn}/list.json`;
        const listExists = await window.ndutil.fileExists(['temp', 'list.json']);
        if (!listExists) {
            try {
                await window.ndutil.cacheFile(listURL);
            } catch (err) {
                console.warn(`[STUDIO - checkUpdate] Failed to cache list.json: ${err}`);
                return;
            }
        }

        const list = await window.ndutil.readJSON(['temp', 'list.json']);
        const serverVersion = list.updates["studio"].version;

        if (window.util.needsUpdate(studio.sessionVersion, serverVersion)) {
            console.log(`[STUDIO - checkUpdate] Local Studio Version: ${studio.sessionVersion}`);
            console.log(`[STUDIO - checkUpdate] Server Studio Version: ${serverVersion}`);
            return true;
        }
        return false;
    },

    async exit() {
        console.log("[STUDIO - Exit] Requested");
        try {
            await window.ndutil.deleteFile('temp');
        } catch (err) {
            console.error(`[STUDIO - Exit] Failed to delete temporary files: ${err}`);
        }
        await dock.close();
        await wait(50);
        window.close();
    }
};

window.util = {
    needsUpdate(v1str = null, v2str = null) {
        if (!v1str) return false
        if (!v2str) return false

        const v1ary = v1str.split('.')
        const v2ary = v2str.split('.')

        if (v1ary.length < 2 || v2ary.length < 2) return false

        const v1major = Number(v1ary[0])
        const v1minor = Number(v1ary[1])
        const v1patch = v1ary[2] ? Number(v1ary[2]) : 0

        const v2major = Number(v2ary[0])
        const v2minor = Number(v2ary[1])
        const v2patch = v2ary[2] ? Number(v2ary[2]) : 0

        if (isNaN(v1major) || isNaN(v1minor) || isNaN(v1patch)) return false
        if (isNaN(v2major) || isNaN(v2minor) || isNaN(v2patch)) return false

        if (v1major < v2major) return true
        if (v1major > v2major) return false

        if (v1minor < v2minor) return true
        if (v1minor > v2minor) return false

        if (v1patch < v2patch) return true
        return false
    }
};