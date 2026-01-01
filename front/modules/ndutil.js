// Leave sendCommand() and getUserDir() alone
// Future plans: 0.2.x or 0.3.x should move getUserDir() to ndutil object

async function sendCommand(action, params = {}) {
    const payload = { action, ...params };
    const res = await fetch(`http://127.0.0.1:52321/api/filesystem`, {
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
    const res = await fetch(`http://127.0.0.1:52321/userdir`, {
        method: 'GET',
        headers: {
            'X-Auth-Token': window.__SESSION_TOKEN__
        }
    });
    if (!res.ok) throw new Error(`Failed to get user dir: ${res.status} ${res.statusText}`);
    const data = await res.json();
    return data.userDirectory;
}

// Use instructions:

// All calls must start with await window.ndutil. All are async
/* The following commands accept an array or sring as their file path(s):
listDirectory()
writeFile()
deleteFile()
copyFile()
createDirectory()
fileExists()
readJSON()
writeJSON()
readFile()
readNDJSON()
unzip()

Usage:
Path refers to where a command is targeted on the local system,
all file actions are held within the sandbox at userDir/nvxstdo/

listDirectory(path)

writeFile(path, content) content is raw file content

deleteFile(path)

copyFile(src, dest) source (file to copy), destination (where to copy it to)

createDirectory(path)

fileExists(path)

readJSON(path) returns a parsed JSON object

writeJSON(path, content) content should be a parsed JSON object

readFile(path) returns raw file content

readNDJSON(path) returns a parsed JSON object

getUserDir() returns the user's homedir pathjoined as a string

ping(url) get's the reachable status of an online URL, input string

pathjoin(array) returns a string based on an array input, with the correct / or \ depending
on platform

cacheFile(url) input an online URL as a string, it will download the file being pointed to
by the url and return the path of the downloaded file.

unzip(zipfile, destination) zipfile is the path of the zip file to be extracted, destination
is where the file will be extracted to
*/

window.ndutil = {
    listDirectory: async (p) => {
        const cp = Array.isArray(p) ? await window.ndutil.pathjoin(p) : p;
        const res = await sendCommand('list', { path: cp });
        return res.files || [];
    },
    writeFile: async (p, content) => {
        const cp = Array.isArray(p) ? await window.ndutil.pathjoin(p) : p;
        return sendCommand('write', { path: cp, content });
    },
    deleteFile: async (p) => {
        const cp = Array.isArray(p) ? await window.ndutil.pathjoin(p) : p;
        return sendCommand('delete', { path: cp });
    },
    copyFile: async (src, dest) => {
        const cpSrc = Array.isArray(src) ? await window.ndutil.pathjoin(src) : src;
        const cpDest = Array.isArray(dest) ? await window.ndutil.pathjoin(dest) : dest;
        return sendCommand('copyFile', { src: cpSrc, dest: cpDest });
    },
    createDirectory: async (p) => {
        const cp = Array.isArray(p) ? await window.ndutil.pathjoin(p) : p;
        return sendCommand('createDirectory', { path: cp });
    },
    fileExists: async (p) => {
        const cp = Array.isArray(p) ? await window.ndutil.pathjoin(p) : p;
        const res = await sendCommand('fileExists', { path: cp });
        return res.exists === 'true';
    },
    readJSON: async (p) => {
        const cp = Array.isArray(p) ? await window.ndutil.pathjoin(p) : p;
        const res = await sendCommand('readFile', { path: cp });
        return JSON.parse(res.content);
    },
    writeJSON: async (p, content) => {
        const cp = Array.isArray(p) ? await window.ndutil.pathjoin(p) : p;
        return sendCommand('write', { path: cp, content: JSON.stringify(content, null, 2) });
    },
    readFile: async (p) => {
        const cp = Array.isArray(p) ? await window.ndutil.pathjoin(p) : p;
        const res = await sendCommand('readFile', { path: cp });
        return res.content;
    },
    readNDJSON: async (p) => {
        const cp = Array.isArray(p) ? await window.ndutil.pathjoin(p) : p;
        return sendCommand('readNDJSON', { path: cp });
    },
    getUserDir: getUserDir,
    ping: (url) => sendCommand('ping', { url }),
    pathjoin: async (arr) => {
        const res = await sendCommand('pathjoin', { path: arr });
        return res.result;
    },
    cacheFile: async (url) => {
        try {
            return await sendCommand('cache', { url });
        } catch(err) {
            console.error(`Error caching file: ${err}`);
            throw err;
        }
    },
    unzip: async (zipPath, dest) => {
        const cpZip = Array.isArray(zipPath) ? await window.ndutil.pathjoin(zipPath) : zipPath;
        const cpDest = Array.isArray(dest) ? await window.ndutil.pathjoin(dest) : dest;
        return sendCommand('unzip', { zipPath: cpZip, dest: cpDest });
    }
};