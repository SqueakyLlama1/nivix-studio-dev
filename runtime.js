import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import os from 'os';
import unzipper from 'unzipper';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_PORT = 52321;

let server = null;
let backendServer = null;

const v0_2_1_ROOT = path.join(os.homedir(), 'nvxstdo');
const SYS_ROOT = path.join(__dirname, 'front', 'sysapps');
const NEW_ROOT = path.join(__dirname, 'front', 'dynamic');

function resolveReadPath(p, source) {
    let base;
    
    if (source === 'sysapps') {
        base = SYS_ROOT;
    } else if (source === '021root') {
        base = v0_2_1_ROOT;
    } else {
        base = NEW_ROOT;
    }
    
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

function resolveWritePath(p, target) {
    let base;
    
    if (target === '021root') {
        base = v0_2_1_ROOT;
    } else if (!target || target === 'default') {
        base = NEW_ROOT;
    } else {
        throw new Error('Writes to this target are not allowed');
    }
    
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

function shutdown() {
    console.log('Shutting down server...');
    setTimeout(() => {
        if (server) server.close(() => console.log('Main server stopped.'));
        if (backendServer) backendServer.close(() => console.log('Backend server stopped.'));
        process.exit(0);
    }, 200);
}

function startBackendServer() {
    fs.mkdirSync(NEW_ROOT, { recursive: true });
    fs.mkdirSync(v0_2_1_ROOT, { recursive: true });
    
    backendServer = http.createServer((req, res) => {
        if (req.method === 'GET' && req.url === '/ready') {
            res.writeHead(200);
            return res.end('ok');
        }
        
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
                    
                    case 'createDirectory': {
                        const p = resolveWritePath(data.path, data.target);
                        fs.mkdirSync(p, { recursive: true });
                        return send({ success: true });
                    }
                    
                    case 'write': {
                        const p = resolveWritePath(data.path, data.target);
                        fs.mkdirSync(path.dirname(p), { recursive: true });
                        fs.writeFileSync(p, data.content);
                        return send({ success: true });
                    }
                    
                    case 'delete': {
                        const target = resolveWritePath(data.path, data.target);
                        if (!fs.existsSync(target)) return send({ success: false });
                        fs.rmSync(target, { recursive: true, force: true });
                        return send({ success: true });
                    }
                    
                    case 'copyFile': {
                        const src = resolveReadPath(data.src, data.source);
                        const dest = resolveWritePath(data.dest, data.target);
                        
                        fs.mkdirSync(path.dirname(dest), { recursive: true });
                        
                        const stat = fs.statSync(src);
                        if (stat.isDirectory()) {
                            fs.cpSync(src, dest, { recursive: true });
                        } else {
                            fs.copyFileSync(src, dest);
                        }
                        
                        return send({ success: true });
                    }
                    
                    case 'unzip': {
                        const zipFile = resolveReadPath(data.zipPath, data.source);
                        const dest = resolveWritePath(data.dest, data.target);
                        fs.mkdirSync(dest, { recursive: true });
                        await fs.createReadStream(zipFile)
                        .pipe(unzipper.Extract({ path: dest }))
                        .promise();
                        return send({ success: true });
                    }
                    
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
                    return send({ userDirectory: NEW_ROOT });
                    
                    case 'cache': {
                        if (!data.url) throw new Error('Missing "url" field');
                        
                        const tempDir = path.join(NEW_ROOT, 'temp');
                        fs.mkdirSync(tempDir, { recursive: true });
                        
                        const urlObj = new URL(data.url);
                        const filename = path.basename(urlObj.pathname) || `cached_${Date.now()}`;
                        const destPath = path.join(tempDir, filename);
                        const proto = urlObj.protocol === 'https:' ? https : http;
                        const file = fs.createWriteStream(destPath);
                        const returnPath = path.join('temp', filename);
                        
                        const sendError = err => {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: err.message || String(err) }));
                        };
                        
                        proto.get(data.url, response => {
                            if (response.statusCode === 404) {
                                fs.unlinkSync(destPath);
                                return sendError(new Error('404 Not Found'));
                            }
                            response.pipe(file);
                            file.on('finish', () => {
                                file.close();
                                send({ success: true, path: returnPath });
                            });
                        }).on('error', err => {
                            fs.unlink(destPath, () => {});
                            sendError(err);
                        });
                        
                        return;
                    }
                    
                    case 'getIP': {
                        const interfaces = os.networkInterfaces();
                        for (const name of Object.keys(interfaces)) {
                            for (const iface of interfaces[name]) {
                                if (iface.family === 'IPv4' && !iface.internal) {
                                    send(iface.address);
                                    return;
                                }
                            }
                        }
                        send('127.0.0.1');
                        return;
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

async function main() {
    startBackendServer();
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}

main();