async function sendCommand(action, params = {}) {
    const payload = { action, ...params };
    const res = await fetch('http://127.0.0.1:52321/api/filesystem', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': window.__SESSION_TOKEN__
        },
        body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Backend error ${res.status}: ${res.statusText}`);
    return res.json();
}

async function getUserDir() {
    const res = await fetch('http://127.0.0.1:52321/userdir', {
        method: 'GET',
        headers: {
            'X-Auth-Token': window.__SESSION_TOKEN__
        }
    });
    if (!res.ok) throw new Error(`Failed to get user dir: ${res.status} ${res.statusText}`);
    const data = await res.json();
    return data.userDirectory;
}

window.ndutil = {
    listDirectory: async (p) => {
        const res = await sendCommand('list', { path: p });
        return res.files || [];
    },
    writeFile: (p, content) => sendCommand('write', { path: p, content }),
    deleteFile: (p) => sendCommand('delete', { path: p }),
    copyFile: (src, dest) => sendCommand('copyFile', { src, dest }),
    createDirectory: (p) => sendCommand('createDirectory', { path: p }),
    fileExists: async (p) => {
        const res = await sendCommand('fileExists', { path: p });
        return { exists: res.exists === 'true', isDirectory: res.isDirectory === 'true' };
    },
    readJSON: async (p) => {
        const res = await sendCommand('readFile', { path: p });
        return JSON.parse(res.content);
    },
    writeJSON: (p, content) =>
        sendCommand('write', { path: p, content: JSON.stringify(content, null, 2) }),
    readFile: async (p) => {
        const res = await sendCommand('readFile', { path: p });
        return res.content;
    },
    readNDJSON: async (p) => await sendCommand('readNDJSON', { path: p }),
    getUserDir: getUserDir,
    ping: (url) => sendCommand('ping', { url }),
    pathjoin: async (arr) => {
        const res = await sendCommand('pathjoin', { path: arr });
        return res.result; // always string
    },
    cacheFile: async (url) => {
        const res = await sendCommand('cache', { url });
        return res; // { success: true, path: "<absolute path>" }
    },
    unzip: (zipPath, dest) => sendCommand('unzip', { zipPath, dest })
};