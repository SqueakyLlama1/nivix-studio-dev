// Nivix Studio Frontend Hosting Module

import open, { openApp, apps } from 'open';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localIP = "127.0.0.1";
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