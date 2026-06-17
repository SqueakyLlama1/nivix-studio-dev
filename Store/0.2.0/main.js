const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');

const Database = require('better-sqlite3');

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { error } = require('console');

let mainWindow;
let skippedVersion = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        icon: path.join(__dirname, 'assets', 'favicon.png'),
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.js')
        }
    });
    
    mainWindow.loadFile('index.html');
}

// Close app when all windows are closed (Windows/Linux)
app.on('window-all-closed', () => {
    app.quit();
});

app.whenReady().then(createWindow);

const sandbox_path = path.join(os.homedir(), 'nvxstdo', 'store');

const db = new Database(path.join(sandbox_path, "inventory.db"));

ipcMain.handle('init-sandbox', async () => {
    try {
        await fs.mkdir(sandbox_path, { recursive: true });
    } catch (err) {
        throw new Error(`Failed to initialize sandbox: ${err}`)
    }
});

const oldFormats = {
    "0.1.0-hub": path.join('appdata', 'store', 'inventory.ndjson'),
    "0.1.0": "inventory.ndjson"
}

ipcMain.handle('check-for-old-inventory', async () => {
    // Check if an old inventory exists for the hub version of 0.1.0 - 0.1.1
    try {
        let expectedOldInventoryPath = path.join(sandbox_path, oldFormats['0.1.0-hub'])
        const inventory = await fs.readFile(expectedOldInventoryPath, 'utf-8');

        if (!inventory || inventory.trim() === '') {
            return false;
        }
        return "0.1.0-hub";
    } catch(err) {
        if (err.code = "ENOENT") {
            return false;
        }
        const errorMsg = `Failed to get old inventory for 0.1.0-hub: ${err.message}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
    }
    // Check if an old inventory exists for version 0.1.0
    try {
        let expectedOldInventoryPath = path.join(sandbox_path, oldFormats['0.1.0']);
        const inventory = await fs.readFile(expectedOldInventoryPath, 'utf-8');
        
        if (!inventory || inventory.trim() === '') {
            return false;
        }
        return "0.1.0";
    } catch(err) {
        if (err.code === "ENOENT") {
            return false;
        }
        const errorMsg = `Failed to get old inventory for 0.1.0: ${err.message}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
    }
});

const preferencesPath = path.join(os.homedir(), 'nvxstdo', 'store', 'preferences.json');

ipcMain.handle('get-preferences', async () => {
    try {
        const preferencesContents = await fs.readFile(preferencesPath, 'utf-8');
        return JSON.parse(preferencesContents);
    } catch {
        return {};
    }
});

ipcMain.handle('set-preferences', async (_event, preferences) => {
    try {
        const data = JSON.stringify(preferences, null, 2);
        await fs.writeFile(preferencesPath, data);
    } catch (err) {
        throw new Error(err);
    }
});

/* ==========================================
    Inventory
=========================================== */

db.exec(`
    PRAGMA foreign_keys = ON;

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
`);

const insertIndexStmt = db.prepare('INSERT OR REPLACE INTO item_attributes_index (item_id, attr_key, attr_value) VALUES (?, ?, ?)');
const clearIndexStmt = db.prepare('DELETE FROM item_attributes_index WHERE item_id = ?');

function createSpace(name) {
    const stmt = db.prepare('INSERT INTO spaces (name) VALUES (?)');
    const info = stmt.run(name);
    return info.lastInsertRowid;
}

function listSpaces() {
    return db.prepare('SELECT * FROM spaces').all();
}

function deleteSpace(id) {
    const stmt = db.prepare('DELETE FROM spaces WHERE id = ?');
    return stmt.run(id).changes > 0;
}

function createCategory(name, space, category = null, fields = []) {
    const stmt = db.prepare('INSERT INTO categories (name, parent_space, parent_category, fields_template) VALUES (?, ?, ?, ?)');
    const info = stmt.run(name, space, category, JSON.stringify(fields));
    return info.lastInsertRowid;
}

function listCategories(space) {
    const stmt = db.prepare('SELECT id, name, parent_category, fields_template FROM categories WHERE parent_space = ?');
    const rows = stmt.all(space);
    return rows.map(row => ({
        ...row,
        fields_template: JSON.parse(row.fields_template || '[]')
    }));
}

function deleteCategory(id) {
    const stmt = db.prepare('DELETE FROM categories WHERE id = ?');
    return stmt.run(id).changes > 0;
}

const createItem = db.transaction((name, category, attributes = {}) => {
    const stmt = db.prepare('INSERT INTO items (name, category_id, attributes) VALUES (?, ?, ?)');
    const info = stmt.run(name, category, JSON.stringify(attributes));
    const itemId = info.lastInsertRowid;

    for (const [key, value] of Object.entries(attributes)) {
        if (value !== null && value !== undefined) {
            insertIndexStmt.run(itemId, key, String(value));
        }
    }
    return itemId;
});

function listItemsByCategory(categoryId) {
    const stmt = db.prepare('SELECT id, name, quantity, quantity_commited, restock_point, attributes FROM items WHERE category_id = ?');
    const rows = stmt.all(categoryId);
    
    return rows.map(row => ({
        ...row,
        attributes: JSON.parse(row.attributes || '{}')
    }));
}

function getItemById(categoryId, itemId) {
    const stmt = db.prepare(`SELECT * FROM items WHERE category_id = ? AND id = ?`);
    const row = stmt.get(categoryId, itemId);
    if (!row) return null;
    return {
        ...row,
        attributes: JSON.parse(row.attributes || '{}')
    };
}

function deleteItem(id) {
    const stmt = db.prepare('DELETE FROM items WHERE id = ?');
    return stmt.run(id).changes > 0;
}

function listAllItemsInCategoryRecursive(categoryId) {
    const query = `
        WITH RECURSIVE subcategories AS (
            SELECT id FROM categories WHERE id = ?
            UNION ALL
            SELECT c.id FROM categories c
            JOIN subcategories s ON c.parent_category = s.id
        )
        SELECT i.* FROM items i
        WHERE i.category_id IN subcategories;
    `;
    const rows = db.prepare(query).all(categoryId);
    return rows.map(row => ({
        ...row,
        attributes: JSON.parse(row.attributes || '{}')
    }));
}

function queryItemsByAttribute(categoryId, key, operator, value) {
    const safeOperators = ['=', '>=', '<=', '>', '<', 'LIKE'];
    if (!safeOperators.includes(operator)) {
        throw new Error(`Unsupported operator: ${operator}`);
    }

    let bindValue = value;
    if (operator === 'LIKE') {
        bindValue = `%${bindValue}%`;
    }

    const query = `
        SELECT i.*
        FROM items i
        JOIN item_attributes_index idx ON i.id = idx.item_id
        WHERE i.category_id = ? 
          AND idx.attr_key = ? 
          AND idx.attr_value ${operator} ?
    `;
    
    const stmt = db.prepare(query);
    const rows = stmt.all(categoryId, key, String(bindValue));
    
    return rows.map(row => ({
        ...row,
        attributes: JSON.parse(row.attributes || '{}')
    }));
}

function queryItemsByName(name, categoryId = null, strict = false) {
    const searchName = strict ? name : `%${name}%`;
    let rows;
    if (!categoryId) {
        let stmt = strict 
            ? db.prepare('SELECT * FROM items WHERE name = ?')
            : db.prepare('SELECT * FROM items WHERE name LIKE ?');
        rows = stmt.all(searchName);
    } else {
        let stmt = strict 
            ? db.prepare('SELECT * FROM items WHERE category_id = ? AND name = ?')
            : db.prepare('SELECT * FROM items WHERE category_id = ? AND name LIKE ?');
        rows = stmt.all(categoryId, searchName);
    }
    return rows.map(row => ({
        ...row,
        attributes: JSON.parse(row.attributes || '{}')
    }));
}

const updateItem = db.transaction((id, updates = {}) => {
    const currentItem = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
    if (!currentItem) {
        throw new Error(`Item with ID ${id} not found.`);
    }

    const newName = updates.name !== undefined ? updates.name : currentItem.name;
    const newCategory = updates.category_id !== undefined ? updates.category_id : currentItem.category_id;
    const newQty = updates.quantity !== undefined ? updates.quantity : currentItem.quantity;
    const newCommited = updates.quantity_commited !== undefined ? updates.quantity_commited : currentItem.quantity_commited;
    const newRestock = updates.restock_point !== undefined ? updates.restock_point : currentItem.restock_point;

    let mergedAttributes = JSON.parse(currentItem.attributes || '{}');
    if (updates.attributes) {
        mergedAttributes = { ...mergedAttributes, ...updates.attributes };
    }

    const stmt = db.prepare(`
        UPDATE items 
        SET name = ?, category_id = ?, quantity = ?, quantity_commited = ?, restock_point = ?, attributes = ? 
        WHERE id = ?
    `);
    
    const info = stmt.run(newName, newCategory, newQty, newCommited, newRestock, JSON.stringify(mergedAttributes), id);
    
    if (info.changes > 0 && updates.attributes) {
        clearIndexStmt.run(id);
        for (const [key, value] of Object.entries(mergedAttributes)) {
            if (value !== null && value !== undefined) {
                insertIndexStmt.run(id, key, String(value));
            }
        }
    }
    return info.changes > 0;
});

function queryItemsAdvanced(categoryId, criteria = []) {
    const safeOperators = ['=', '>=', '<=', '>', '<', 'LIKE', '!='];
    let query = `SELECT DISTINCT i.* FROM items i`;
    const params = [categoryId];

    let attrJoinCount = 0;
    let joinClauses = '';
    let whereClauses = ['i.category_id = ?'];

    criteria.forEach((condition) => {
        if (!safeOperators.includes(condition.operator)) {
            throw new Error(`Unsafe operator detected: ${condition.operator}`);
        }

        let bindValue = condition.value;
        if (condition.operator === 'LIKE') {
            bindValue = `%${bindValue}%`;
        }

        if (condition.type === 'native') {
            const safeNativeFields = ['name', 'quantity', 'quantity_commited', 'restock_point'];
            if (!safeNativeFields.includes(condition.field)) {
                throw new Error(`Invalid native column: ${condition.field}`);
            }
            
            whereClauses.push(`i.${condition.field} ${condition.operator} ?`);
            params.push(bindValue);

        } else if (condition.type === 'attribute') {
            attrJoinCount++;
            const alias = `idx${attrJoinCount}`;
            
            joinClauses += ` JOIN item_attributes_index ${alias} ON i.id = ${alias}.item_id`;
            whereClauses.push(`${alias}.attr_key = ? AND ${alias}.attr_value ${condition.operator} ?`);
            
            params.push(condition.field, String(bindValue));
        }
    });

    const finalQuery = `${query} ${joinClauses} WHERE ${whereClauses.join(' AND ')}`;
    
    const stmt = db.prepare(finalQuery);
    const rows = stmt.all(...params);

    return rows.map(row => ({
        ...row,
        attributes: JSON.parse(row.attributes || '{}')
    }));
}

function rebuildSearchIndex() {
    return db.transaction(() => {
        db.prepare('DELETE FROM item_attributes_index').run();
        const items = db.prepare('SELECT id, attributes FROM items').all();
        let count = 0;
        for (const item of items) {
            const attributes = JSON.parse(item.attributes || '{}');
            for (const [key, value] of Object.entries(attributes)) {
                if (value !== null && value !== undefined) {
                    insertIndexStmt.run(item.id, key, String(value));
                }
            }
            count++;
        }
        return count;
    })();
}

/* ===========================================
    Inventory API & Frontend Hook
=========================================== */