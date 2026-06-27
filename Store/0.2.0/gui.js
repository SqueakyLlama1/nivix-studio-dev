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

db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS spaces (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parent_space INTEGER NOT NULL,
        parent_category INTEGER,
        fields_template TEXT,
        FOREIGN KEY (parent_category) REFERENCES categories(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_space) REFERENCES spaces(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        quantity INTEGER DEFAULT 0,
        quantity_commited INTEGER DEFAULT 0,
        restock_point INTEGER DEFAULT 0,
        attributes TEXT,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS item_attributes_index (
        item_id INTEGER NOT NULL,
        attr_key TEXT NOT NULL,
        attr_value TEXT,
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
        PRIMARY KEY (item_id, attr_key)
    );
    
    CREATE INDEX IF NOT EXISTS idx_attributes_search ON item_attributes_index (attr_key, attr_value COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_items_name ON items (name);
    CREATE INDEX IF NOT EXISTS idx_items_quantity ON items (quantity);

    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL
    );
`);

const functions = require('./functions')(db, ctx);

// CommonJS Exports
module.exports = {
    db,
    ...functions
};