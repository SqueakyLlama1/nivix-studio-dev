const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');
const chromeLauncher = require('chrome-launcher');
const express = require('express');
const unzipper = require('unzipper');

const PORT = 58000;
const BACKEND_PORT = 52321;
const FRONT_DIR = path.join(__dirname, 'front');
const SESSION_TOKEN = crypto.randomBytes(32).toString('hex');

let server = null;
let backendServer = null;
let chromeProcess = null;

async function openChrome(url) {
    try {
        const chrome = await chromeLauncher.launch({
            startingUrl: url,
            chromeFlags: [
                '--new-window',
                '--disable-features=IsolateOrigins,site-per-process',
                '--autoplay-policy=no-user-gesture-required'
            ]
        });
        chromeProcess = chrome.process;
        chromeProcess.on('close', () => {
            console.log('Chrome closed. Shutting down...');
            shutdown();
        });
    } catch {
        console.log('Google Chrome not found. Install it here: https://www.google.com/chrome/');
    }
}

function shutdown() {
    if (chromeProcess && !chromeProcess.killed) {
        try {
            if (process.platform === 'win32') {
                spawn('taskkill', ['/PID', chromeProcess.pid, '/T', '/F']);
            } else {
                chromeProcess.kill('SIGTERM');
            }
        } catch (e) { console.error(e); }
    }
    if (server) server.close(() => console.log('Main server stopped.'));
    if (backendServer) backendServer.close(() => console.log('Backend server stopped.'));
    setTimeout(() => process.exit(0), 100);
}

function serveStaticFile(req, res) {
    let filePath = req.url === '/' ? 'index.html' : req.url.slice(1);
    filePath = path.join(FRONT_DIR, path.normalize(filePath));
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            return res.end('Not Found');
        }
        
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.ico': 'image/x-icon',
            '.svg': 'image/svg+xml',
            '.json': 'application/json'
        };
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        
        if (filePath.endsWith('index.html')) {
            let html = data.toString();
            html = html.replace('</head>', `<script>window.__SESSION_TOKEN__="${SESSION_TOKEN}";</script></head>`);
            res.writeHead(200, { 'Content-Type': contentType });
            return res.end(html);
        }
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

function startServer() {
    return new Promise((resolve) => {
        // Ensure nvxstdo and apps directories exist
        const nvxDir = path.join(os.homedir(), 'nvxstdo');
        const appsDir = path.join(nvxDir, 'apps');
        if (!fs.existsSync(nvxDir)) fs.mkdirSync(nvxDir, { recursive: true });
        if (!fs.existsSync(appsDir)) fs.mkdirSync(appsDir, { recursive: true });
        console.log('Using app directory:', appsDir);
        
        const app = express();
        
        // Serve frontend from /front
        app.use('/', express.static(FRONT_DIR));
        
        // Serve apps from ~/nvxstdo/apps
        app.use('/apps', express.static(appsDir));
        
        // Shutdown route
        app.post('/shutdown', express.json(), (req, res) => {
            if (req.body.token !== SESSION_TOKEN) {
                return res.status(403).send('Forbidden');
            }
            res.send('Shutting down...');
            shutdown();
        });
        
        server = app.listen(PORT, '127.0.0.1', () => {
            console.log(`Local server running at http://127.0.0.1:${PORT}`);
            resolve();
        });
    });
}

function startBackendServer() {
    const homedir = path.join(os.homedir(), 'nvxstdo');
    if (!fs.existsSync(homedir)) fs.mkdirSync(homedir, { recursive: true });
    console.log('Using homedir at', homedir);
    
    backendServer = http.createServer(async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', `http://127.0.0.1:${PORT}`);
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Auth-Token');
        
        if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
        
        // /userdir route
        if (req.method === 'GET' && req.url === '/userdir') {
            if (req.headers['x-auth-token'] !== SESSION_TOKEN) {
                res.writeHead(403); return res.end('Forbidden');
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ userDirectory: homedir }));
        }
        
        // /api/filesystem route
        if (req.method === 'POST' && req.url === '/api/filesystem') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    const sendJSON = (obj) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
                    const sendError = (err) => sendJSON({ error: err.message || String(err) });
                    
                    const fullPath = (p) => {
                        if (!p) throw new Error('Path argument missing');
                        if (Array.isArray(p)) {
                            return path.join(homedir, ...p);
                        }
                        if (typeof p === 'string') return path.join(homedir, p);
                        throw new Error('Invalid path type');
                    };
                    
                    switch (data.action) {
                        case 'createDirectory':
                        fs.mkdirSync(fullPath(data.path), { recursive: true });
                        return sendJSON({ success: true });
                        case 'list':
                        return sendJSON({ files: fs.readdirSync(fullPath(data.path)) });
                        case 'readFile':
                        return sendJSON({ content: fs.readFileSync(fullPath(data.path), 'utf8') });
                        case 'write':
                        fs.mkdirSync(path.dirname(fullPath(data.path)), { recursive: true });
                        fs.writeFileSync(fullPath(data.path), data.content);
                        return sendJSON({ success: true });
                        case 'delete': {
                            const target = fullPath(data.path);
                            if (!fs.existsSync(target)) return sendJSON({ success: false, error: 'Not found' });
                            const stat = fs.statSync(target);
                            if (stat.isDirectory()) fs.rmSync(target, { recursive: true, force: true });
                            else fs.unlinkSync(target);
                            return sendJSON({ success: true });
                        }
                        case 'pathjoin':
                        if (!Array.isArray(data.path)) throw new Error('Path must be array');
                        const joined = path.join(...data.path);
                        return sendJSON({ result: joined });
                        
                        case 'fileExists':
                        const exists = fs.existsSync(fullPath(data.path));
                        const isDirectory = exists && fs.statSync(fullPath(data.path)).isDirectory();
                        return sendJSON({ exists: String(exists), isDirectory: String(isDirectory) });
                        case 'readNDJSON':
                        if (!fs.existsSync(fullPath(data.path))) return sendJSON([]);
                        const lines = fs.readFileSync(fullPath(data.path), 'utf8')
                        .split("\n")
                        .map(line => line.trim())
                        .filter(line => line)
                        .map(line => { try { return JSON.parse(line); } catch { return null; } })
                        .filter(Boolean);
                        return sendJSON(lines);
                        case 'cache': {
                            if (!data.url) throw new Error('Missing "url" field');
                            const tempDir = path.join(homedir, 'temp');
                            fs.mkdirSync(tempDir, { recursive: true });
                            const urlObj = new URL(data.url);
                            const filename = path.basename(urlObj.pathname) || `cached_${Date.now()}`;
                            const destPath = path.join(tempDir, filename);
                            const proto = urlObj.protocol === 'https:' ? https : http;
                            const file = fs.createWriteStream(destPath);
                            const returnPath = path.join('temp', filename);
                            proto.get(data.url, (response) => {
                                if (response.statusCode == 404) {
                                    fs.unlinkSync(destPath);
                                    return sendError(new Error(`404`));
                                }
                                response.pipe(file);
                                file.on('finish', () => {
                                    file.close();
                                    sendJSON({ success: true, path: returnPath });
                                });
                            }).on('error', (err) => {
                                fs.unlink(destPath, () => {});
                                sendError(err);
                            });
                            return;
                        }
                        case 'ping': {
                            if (!data.url) throw new Error('Missing "url" field');
                            
                            const urlObj = new URL(data.url);
                            const proto = urlObj.protocol === 'https:' ? https : http;
                            
                            const reqPing = proto.get(
                                {
                                    method: 'HEAD',
                                    host: urlObj.hostname,
                                    path: urlObj.pathname || '/',
                                    port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
                                    timeout: 5000
                                },
                                (resp) => {
                                    // If we got any valid HTTP response, we’ll call that reachable
                                    sendJSON({ reachable: resp.statusCode < 500 });
                                    reqPing.destroy();
                                }
                            );
                            
                            reqPing.on('timeout', () => {
                                reqPing.destroy();
                                sendJSON({ reachable: false });
                            });
                            
                            reqPing.on('error', () => {
                                sendJSON({ reachable: false });
                            });
                            
                            return;
                        }
                        case 'unzip': {
                            if (!data.zipPath || !data.dest) throw new Error('Missing zipPath or dest');
                            
                            const zipFile = fullPath(data.zipPath);
                            const destPath = fullPath(data.dest);
                            
                            if (!fs.existsSync(zipFile)) throw new Error('Zip file not found');
                            
                            await fs.createReadStream(zipFile)
                            .pipe(unzipper.Extract({ path: destPath }))
                            .promise();
                            
                            return sendJSON({ success: true });
                        }
                        default:
                        res.writeHead(400);
                        return res.end('Invalid action');
                    }
                } catch (err) {
                    console.error(err);
                    res.writeHead(500);
                    res.end('Server error');
                }
            });
            return;
        }
        
        res.writeHead(404);
        res.end('Not Found');
    });
    
    backendServer.listen(BACKEND_PORT, '127.0.0.1', () => {
        console.log(`Backend server running at http://127.0.0.1:${BACKEND_PORT}`);
    });
}

async function main() {
    await startServer();
    startBackendServer();
    await openChrome(`http://127.0.0.1:${PORT}`);
}

main();