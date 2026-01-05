// Nivix Studio Frontend Hosting Module

const express = require('express');
const path = require('path');
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

function hostFrontend() {
    // Serve the "front" folder at /front
    app.use('/', express.static(__dirname));

    // Start server, listen on all interfaces
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Frontend server running:`);
        console.log(`- Local: http://localhost:${PORT}/front/index.html`);
        console.log(`- LAN:   http://${localIP}:${PORT}/front/index.html`);
    });
}

function main() {
    hostFrontend();
}

main();