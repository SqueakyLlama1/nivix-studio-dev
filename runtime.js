const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const unzipper = require('unzipper');

const BACKEND_PORT = 52321;

let server = null;
let backendServer = null;

// --------------------
// Paths
// --------------------

const USERDATA_ROOT = path.join(os.homedir(), 'nvxstdo');
const SYSAPPS_ROOT = path.join(__dirname, 'front', 'sysapps');

// --------------------
// Helpers
// --------------------

function resolveReadPath(p, source = 'userdata') {
    if (source !== 'userdata' && source !== 'sysapps') {
        throw new Error('Invalid source');
    }
    
    const base = source === 'sysapps' ? SYSAPPS_ROOT : USERDATA_ROOT;
    
    if (!p) throw new Error('Path missing');
    
    const resolved = Array.isArray(p)
    ? path.join(base, ...p)
    : path.join(base, p);
    
    const normalized = path.normalize(resolved);
    
    if (!normalized.startsWith(base)) {
        throw new Error('Path traversal blocked');
    }
    
    return normalized;
}

function resolveWritePath(p) {
    if (!p) throw new Error('Path missing');
    
    const resolved = Array.isArray(p)
    ? path.join(USERDATA_ROOT, ...p)
    : path.join(USERDATA_ROOT, p);
    
    const normalized = path.normalize(resolved);
    
    if (!normalized.startsWith(USERDATA_ROOT)) {
        throw new Error('Path traversal blocked');
    }
    
    return normalized;
}

// --------------------
// Shutdown
// --------------------

function shutdown() {
    console.log('Shutting down server...');
    setTimeout(() => {
        if (server) server.close(() => console.log('Main server stopped.'));
        if (backendServer) backendServer.close(() => console.log('Backend server stopped.'));
        process.exit(0);
    }, 200);
}

// --------------------
// Backend API
// --------------------

function startBackendServer() {
    fs.mkdirSync(USERDATA_ROOT, { recursive: true });
    
    backendServer = http.createServer((req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            return res.end();
        }
        
        if (req.method !== 'POST' || req.url !== '/api/filesystem') {
            res.writeHead(404);
            return res.end('Not Found');
        }
        
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const send = obj => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(obj));
                };
                
                switch (data.action) {
                    // -------- READ --------
                    case 'list':
                    return send({
                        files: fs.readdirSync(resolveReadPath(data.path, data.source))
                    });
                    
                    case 'readFile':
                    return send({
                        content: fs.readFileSync(resolveReadPath(data.path, data.source), 'utf8')
                    });
                    
                    case 'fileExists': {
                        const p = resolveReadPath(data.path, data.source);
                        const exists = fs.existsSync(p);
                        const isDirectory = exists && fs.statSync(p).isDirectory();
                        return send({ exists: String(exists), isDirectory: String(isDirectory) });
                    }
                    
                    case 'readNDJSON': {
                        const p = resolveReadPath(data.path, data.source);
                        if (!fs.existsSync(p)) return send([]);
                        const lines = fs.readFileSync(p, 'utf8')
                        .split('\n')
                        .map(l => l.trim())
                        .filter(Boolean)
                        .map(l => { try { return JSON.parse(l); } catch { return null; } })
                        .filter(Boolean);
                        return send(lines);
                    }
                    
                    // -------- WRITE (userdata only) --------
                    case 'createDirectory':
                    fs.mkdirSync(resolveWritePath(data.path), { recursive: true });
                    return send({ success: true });
                    
                    case 'write':
                    fs.mkdirSync(path.dirname(resolveWritePath(data.path)), { recursive: true });
                    fs.writeFileSync(resolveWritePath(data.path), data.content);
                    return send({ success: true });
                    
                    case 'delete': {
                        const target = resolveWritePath(data.path);
                        if (!fs.existsSync(target)) return send({ success: false });
                        fs.rmSync(target, { recursive: true, force: true });
                        return send({ success: true });
                    }
                    
                    case 'copyFile': {
                        const src = resolveReadPath(data.src, data.source);
                        const dest = resolveWritePath(data.dest);
                        fs.mkdirSync(path.dirname(dest), { recursive: true });
                        fs.copyFileSync(src, dest);
                        return send({ success: true });
                    }
                    
                    case 'unzip': {
                        const zipFile = resolveReadPath(data.zipPath, data.source);
                        const dest = resolveWritePath(data.dest);
                        fs.mkdirSync(dest, { recursive: true });
                        await fs.createReadStream(zipFile)
                        .pipe(unzipper.Extract({ path: dest }))
                        .promise();
                        return send({ success: true });
                    }
                    
                    // -------- UTILS --------
                    case 'pathjoin':
                    return send({ result: path.join(...data.path) });
                    
                    case 'ping': {
                        const url = new URL(data.url);
                        const proto = url.protocol === 'https:' ? https : http;
                        const r = proto.request({ method: 'HEAD', host: url.hostname, path: url.pathname }, resp => {
                            send({ reachable: resp.statusCode < 500 });
                            r.destroy();
                        });
                        r.on('error', () => send({ reachable: false }));
                        r.end();
                        return;
                    }
                    
                    case 'getUserDir':
                    return send({ userDirectory: USERDATA_ROOT });
                    
                    case 'cache': {
                        if (!data.url) throw new Error('Missing "url" field');
                        
                        const tempDir = path.join(USERDATA_ROOT, 'temp');
                        fs.mkdirSync(tempDir, { recursive: true });
                        
                        const urlObj = new URL(data.url);
                        const filename = path.basename(urlObj.pathname) || `cached_${Date.now()}`;
                        const destPath = path.join(tempDir, filename);
                        const proto = urlObj.protocol === 'https:' ? https : http;
                        const file = fs.createWriteStream(destPath);
                        const returnPath = path.join('temp', filename);
                        
                        const sendError = (err) => {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: err.message || String(err) }));
                        };
                        
                        proto.get(data.url, (response) => {
                            if (response.statusCode === 404) {
                                fs.unlinkSync(destPath);
                                return sendError(new Error('404 Not Found'));
                            }
                            response.pipe(file);
                            file.on('finish', () => {
                                file.close();
                                send({ success: true, path: returnPath });
                            });
                        }).on('error', (err) => {
                            fs.unlink(destPath, () => {});
                            sendError(err);
                        });
                        
                        return;
                    }
                    
                    case 'readImage': {
                        const p = resolveReadPath(data.path, data.source);
                        if (!fs.existsSync(p)) return send({ error: 'File not found' });
                        
                        const ext = path.extname(p).toLowerCase();
                        let mime = 'application/octet-stream';
                        if (ext === '.png') mime = 'image/png';
                        else if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
                        else if (ext === '.gif') mime = 'image/gif';
                        else if (ext === '.svg') mime = 'image/svg+xml';
                        
                        const buffer = fs.readFileSync(p);
                        const base64 = buffer.toString('base64');
                        return send({ mime, data: base64 });
                    }
                    
                    default:
                    res.writeHead(400);
                    res.end('Invalid action');
                }
            } catch (err) {
                console.error(err);
                res.writeHead(500);
                res.end('Server error');
            }
        });
    });
    
    backendServer.listen(BACKEND_PORT, '127.0.0.1', () => {
        console.log(`Backend server running at http://127.0.0.1:${BACKEND_PORT}`);
    });
}

// --------------------
// Main
// --------------------

async function main() {
    startBackendServer();
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}

main();