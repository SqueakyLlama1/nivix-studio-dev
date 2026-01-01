const pretty = str => str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

const studio = {
    sessionVersion: "0.2.1",
    
    async checkUpdate() {
        const listURL = "https://www.nivixtech.com/studio/list.json";
        const listPath = await window.ndutil.pathjoin(['temp', 'list.json']);
        const listExists = await window.ndutil.fileExists(listPath);
        if (!listExists) {
            try {
                await window.ndutil.cacheFile(listURL);
            } catch(err) {
                studio.log.new("warn", `[CSTDOVER] Failed to cache list.json: ${err}`);
                return;
            }
        }
        const list = await window.ndutil.readJSON(listPath);
        const serverVersion = list.updates["studio"].version;
        if (util.needsUpdate(studio.sessionVersion, serverVersion)) {
            studio.log.new("log", `Local Studio Version: ${studio.sessionVersion}`);
            studio.log.new("log", `Server Studio Version: ${serverVersion}`);
            if (prefs?.loaded["stdoUpdNoti"]) {
                studio.log.new("warn", "Studio update available");
                noti("Studio Update Available");
            }
        }
    },
    
    log: {
        sessionLog: [],
        lastSavedIndex: 0, // track how many entries have been saved
        logFilePath: "",
        lastLogDay: "",
        
        new(type, content) {
            const getTime = () => {
                const d = new Date();
                let h = d.getHours();
                const ampm = h >= 12 ? "PM" : "AM";
                h = h % 12 || 12;
                const m = d.getMinutes().toString().padStart(2, "0");
                const s = d.getSeconds().toString().padStart(2, "0");
                return `${h}:${m}:${s} ${ampm}`;
            };
            
            const entry = `${getTime()} ${content}`;
            this.sessionLog.push(entry);
            
            if (type === "warn") console.warn(content);
            if (type === "log") console.log(content);
            if (type === "error") console.error(content);
        },
        
        async save() {
            const today = new Date().toISOString().split("T")[0];
            
            if (!this.logFilePath || this.lastLogDay !== today) {
                this.logFilePath = await window.ndutil.pathjoin(['logs', `${today}.txt`]);
                // Add session start header as a first entry
                await window.ndutil.writeFile(this.logFilePath, `=== Session started: ${new Date().toLocaleString()} ===\n`);
                this.lastSavedIndex = 0;
            }
            this.lastLogDay = today;
            
            // Only append entries that haven't been saved yet
            const newEntries = this.sessionLog.slice(this.lastSavedIndex);
            if (newEntries.length === 0) return false;
            
            // Append to file
            const existingData = await window.ndutil.readFile(this.logFilePath).catch(() => "");
            const allLines = existingData + (existingData ? "\n" : "") + newEntries.join("\n");
            await window.ndutil.writeFile(this.logFilePath, allLines);
            
            // Update lastSavedIndex
            this.lastSavedIndex = this.sessionLog.length;
            
            return true;
        },
        
        async get() {
            if (!this.logFilePath) return [];
            try {
                const data = await window.ndutil.readFile(this.logFilePath);
                return data.split("\n");
            } catch {
                return [];
            }
        }
    },
    
    async exit() {
        studio.log.new("log", "[System] Exit requested");
        try {
            await window.ndutil.deleteFile('temp');
        } catch(err) {
            studio.log.new("error", `Failed to delete temporary files: ${err}`);
        }
        await dock.close();
        await wait(50);
        getEBD('dashboard').style.opacity = 0;
        await wait(500);
        getEBD('closeShade').style.display = "block";
        await wait(50);
        getEBD('closeShade').style.opacity = "1";
        document.body.style.overflow = "hidden";
        await wait(750);
        window.close();
    }
};

const util = {
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