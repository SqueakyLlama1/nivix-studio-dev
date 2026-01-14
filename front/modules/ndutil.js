window.ndutil = {
    async sendCommand(action, params = {}) {
        const payload = { action, ...params };
        
        const res = await fetch('http://127.0.0.1:52321/api/filesystem', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) {
            throw new Error(`Backend error ${res.status}: ${res.statusText}`);
        }
        
        return res.json();
    },
    
    warnLegacy(target) {
        if (target === '021root') {
            console.warn('Files written to legacy sandbox. Action is deprecated. Developers, please update your methods!');
        }
    },
    
    listDirectory: async (p, source) => {
        const cp = Array.isArray(p) ? await window.ndutil.pathjoin(p) : p;
        const res = await this.sendCommand('list', { path: cp, source });
        return res.files || [];
    },
    
    readFile: async (p, source) => {
        const cp = Array.isArray(p) ? await window.ndutil.pathjoin(p) : p;
        const res = await this.sendCommand('readFile', { path: cp, source });
        return res.content;
    },
    
    readJSON: async (p, source) => {
        const cp = Array.isArray(p) ? await window.ndutil.pathjoin(p) : p;
        const res = await this.sendCommand('readFile', { path: cp, source });
        return JSON.parse(res.content);
    },
    
    readNDJSON: async (p, source) => {
        const cp = Array.isArray(p) ? await window.ndutil.pathjoin(p) : p;
        return this.sendCommand('readNDJSON', { path: cp, source });
    },
    
    fileExists: async (p, source) => {
        const cp = Array.isArray(p) ? await window.ndutil.pathjoin(p) : p;
        const res = await this.sendCommand('fileExists', { path: cp, source });
        return res.exists === 'true';
    },
    
    writeFile: async (p, content, target = 'default') => {
        this.warnLegacy(target);
        const cp = Array.isArray(p) ? await window.ndutil.pathjoin(p) : p;
        return this.sendCommand('write', { path: cp, content, target });
    },
    
    writeJSON: async (p, content, target = 'default') => {
        this.warnLegacy(target);
        const cp = Array.isArray(p) ? await window.ndutil.pathjoin(p) : p;
        return this.sendCommand('write', {
            path: cp,
            content: JSON.stringify(content, null, 2),
            target
        });
    },
    
    deleteFile: async (p, target = 'default') => {
        this.warnLegacy(target);
        const cp = Array.isArray(p) ? await window.ndutil.pathjoin(p) : p;
        return this.sendCommand('delete', { path: cp, target });
    },
    
    createDirectory: async (p, target = 'default') => {
        this.warnLegacy(target);
        const cp = Array.isArray(p) ? await window.ndutil.pathjoin(p) : p;
        return this.sendCommand('createDirectory', { path: cp, target });
    },
    
    copyFile: async (src, dest, source, target = 'default') => {
        this.warnLegacy(target);
        const cpSrc = Array.isArray(src) ? await window.ndutil.pathjoin(src) : src;
        const cpDest = Array.isArray(dest) ? await window.ndutil.pathjoin(dest) : dest;
        return this.sendCommand('copyFile', {
            src: cpSrc,
            dest: cpDest,
            source,
            target
        });
    },
    
    unzip: async (zipPath, dest, source, target = 'default') => {
        this.warnLegacy(target);
        const cpZip = Array.isArray(zipPath) ? await window.ndutil.pathjoin(zipPath) : zipPath;
        const cpDest = Array.isArray(dest) ? await window.ndutil.pathjoin(dest) : dest;
        return this.sendCommand('unzip', {
            zipPath: cpZip,
            dest: cpDest,
            source,
            target
        });
    },
    
    cacheFile: async (url) => {
        if (typeof url !== 'string') {
            throw new Error('cacheFile expects a URL string');
        }
        
        const res = await this.sendCommand('cache', { url });
        
        if (!res.success) {
            return { success: false };
        }
        
        return { path: res.path, success: true };
    },
    
    getUserDir: async () => {
        return this.sendCommand('getUserDir');
    },
    
    ping: async (url) => {
        return this.sendCommand('ping', { url });
    },
    
    pathjoin: async (arr) => {
        if (!Array.isArray(arr)) {
            throw new Error('pathjoin expects an array');
        }
        const res = await this.sendCommand('pathjoin', { path: arr });
        return res.result;
    }
};