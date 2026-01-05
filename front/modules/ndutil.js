async function sendCommand(action, params = {}) {
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
}

window.ndutil = {
    listDirectory: async (p, source) => {
        const cp = Array.isArray(p) ? await window.ndutil.pathjoin(p) : p;
        const res = await sendCommand('list', { path: cp, source });
        return res.files || [];
    },
    
    readFile: async (p, source) => {
        const cp = Array.isArray(p) ? await window.ndutil.pathjoin(p) : p;
        const res = await sendCommand('readFile', { path: cp, source });
        return res.content;
    },
    
    readJSON: async (p, source) => {
        const cp = Array.isArray(p) ? await window.ndutil.pathjoin(p) : p;
        const res = await sendCommand('readFile', { path: cp, source });
        return JSON.parse(res.content);
    },
    
    readNDJSON: async (p, source) => {
        const cp = Array.isArray(p) ? await window.ndutil.pathjoin(p) : p;
        return sendCommand('readNDJSON', { path: cp, source });
    },
    
    fileExists: async (p, source) => {
        const cp = Array.isArray(p) ? await window.ndutil.pathjoin(p) : p;
        const res = await sendCommand('fileExists', { path: cp, source });
        return res.exists === 'true';
    },
    
    writeFile: async (p, content) => {
        const cp = Array.isArray(p) ? await window.ndutil.pathjoin(p) : p;
        return sendCommand('write', { path: cp, content });
    },
    
    writeJSON: async (p, content) => {
        const cp = Array.isArray(p) ? await window.ndutil.pathjoin(p) : p;
        return sendCommand('write', {
            path: cp,
            content: JSON.stringify(content, null, 2)
        });
    },
    
    deleteFile: async (p) => {
        const cp = Array.isArray(p) ? await window.ndutil.pathjoin(p) : p;
        return sendCommand('delete', { path: cp });
    },
    
    createDirectory: async (p) => {
        const cp = Array.isArray(p) ? await window.ndutil.pathjoin(p) : p;
        return sendCommand('createDirectory', { path: cp });
    },
    
    copyFile: async (src, dest, source) => {
        const cpSrc = Array.isArray(src) ? await window.ndutil.pathjoin(src) : src;
        const cpDest = Array.isArray(dest) ? await window.ndutil.pathjoin(dest) : dest;
        return sendCommand('copyFile', {
            src: cpSrc,
            dest: cpDest,
            source
        });
    },
    
    unzip: async (zipPath, dest, source) => {
        const cpZip = Array.isArray(zipPath) ? await window.ndutil.pathjoin(zipPath) : zipPath;
        const cpDest = Array.isArray(dest) ? await window.ndutil.pathjoin(dest) : dest;
        return sendCommand('unzip', {
            zipPath: cpZip,
            dest: cpDest,
            source
        });
    },
    
    cacheFile: async (url) => {
        if (typeof url !== 'string') {
            throw new Error('cacheFile expects a URL string');
        }
        
        const res = await sendCommand('cache', { url });
        
        if (!res.success) {
            return { success: false };
        }
        
        return { path: res.path, success: true };
    },
    
    getUserDir: async () => {
        return sendCommand('getUserDir');
    },
    
    ping: async (url) => {
        return sendCommand('ping', { url });
    },
    
    pathjoin: async (arr) => {
        if (!Array.isArray(arr)) {
            throw new Error('pathjoin expects an array');
        }
        const res = await sendCommand('pathjoin', { path: arr });
        return res.result;
    }
};