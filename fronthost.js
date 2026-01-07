// Nivix Studio Frontend Hosting Module

import open, { openApp, apps } from 'open';
import express from 'express';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

const localIP = getLocalIP();
const app = express();
const PORT = 58000;

// --------------------
// CORS middleware
// --------------------
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

// Serve static frontend files
app.use('/', express.static(__dirname));

// Ready endpoint
app.get('/ready', (req, res) => {
    res.status(200).send('ok');
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Frontend server running:`);
    console.log(`- Local: http://localhost:${PORT}/front/index.html`);
    console.log(`- LAN:   http://${localIP}:${PORT}/front/index.html`);
});

if (process.platform === 'linux' && !process.env.NO_OPEN) {
    await open(`http://${localIP}:${PORT}/front/index.html`).catch(err => {
        console.error('Failed to open browser:', err);
    });
}

export default app;