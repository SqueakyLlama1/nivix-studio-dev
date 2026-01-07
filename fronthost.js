// Nivix Studio Frontend Hosting Module

const express = require('express');
const os = require('os');

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