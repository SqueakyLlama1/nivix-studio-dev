const path = require('path');
const os = require('os');
const fs = require('fs').promises;
const fsSync = require('fs');
const Database = require('better-sqlite3-electron');
const { buffer } = require('stream/consumers');

const store_path = path.join(os.homedir(), 'nvxstdo', 'store');
const studio_path = path.join(os.homedir(), 'nvxstdo');

const oldFormats = {
    "0.1.0-hub": path.join('appdata', 'store', 'inventory.ndjson'),
    "0.1.0": path.join('store', 'inventory.ndjson')
}

const db = new Database(path.join(store_path, "inventory.db"));

const ctx = { studio_path, oldFormats }
const functions = require('./functions')(db, ctx);

functions.initTables();

// CommonJS Exports
module.exports = {
    db,
    ...functions
};