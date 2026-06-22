const path = require('path');
const os = require('os');
const Database = require('better-sqlite3');

const sandbox_path = path.join(os.homedir(), 'nvxstdo', 'store');
const db = new Database(path.join(sandbox_path, "inventory.db"));

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
    
    /* Indexes for optimal performance */
    CREATE INDEX IF NOT EXISTS idx_attributes_search ON item_attributes_index (attr_key, attr_value COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_items_name ON items (name);
    CREATE INDEX IF NOT EXISTS idx_items_quantity ON items (quantity);
`);

db.pragma('journal_mode = WAL');
    
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

/**
 * Unified item filtering and searching matrix endpoint.
 * Supports cross-matching complex rules across native attributes and loose EAV storage structures.
 */
function queryItemsUnified({ categoryId = null, rules = [], logicalOp = 'AND' } = {}) {
    const safeOperators = ['=', '>=', '<=', '>', '<', 'LIKE', '!='];
    const safeLogicalOps = ['AND', 'OR'];
    const safeNativeFields = ['name', 'quantity', 'quantity_commited', 'restock_point'];

    if (!safeLogicalOps.includes(logicalOp.toUpperCase())) {
        throw new Error(`Unsupported logical operator: ${logicalOp}`);
    }

    let query = `SELECT DISTINCT i.* FROM items i`;
    const params = [];
    
    let attrJoinCount = 0;
    let joinClauses = '';
    let whereClauses = [];

    // Optional dynamic category scope fallback
    if (categoryId !== null) {
        whereClauses.push(`i.category_id = ?`);
        params.push(categoryId);
    }

    const ruleClauses = [];
    
    rules.forEach((rule) => {
        if (!safeOperators.includes(rule.operator)) {
            throw new Error(`Unsafe operator detected: ${rule.operator}`);
        }

        let bindValue = rule.value;
        if (rule.operator === 'LIKE') {
            bindValue = `%${bindValue}%`;
        }

        if (rule.type === 'native') {
            if (!safeNativeFields.includes(rule.field)) {
                throw new Error(`Invalid native column lookup: ${rule.field}`);
            }
            ruleClauses.push(`i.${rule.field} ${rule.operator} ?`);
            params.push(bindValue);

        } else if (rule.type === 'attribute') {
            attrJoinCount++;
            const alias = `idx${attrJoinCount}`;
            
            joinClauses += ` JOIN item_attributes_index ${alias} ON i.id = ${alias}.item_id`;
            ruleClauses.push(`${alias}.attr_key = ? AND ${alias}.attr_value ${rule.operator} ?`);
            params.push(rule.field, String(bindValue));
        }
    });

    if (ruleClauses.length > 0) {
        const combinedRules = `(${ruleClauses.join(` ${logicalOp.toUpperCase()} `)})`;
        whereClauses.push(combinedRules);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const finalQuery = `${query}${joinClauses} ${whereSql}`;

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

const repl = require('repl');

function startREPL() {
    const replServer = repl.start({
        prompt: 'Nivix Store CLI > ',
        useColors: true
    });

    replServer.context.db = db;
    replServer.context.createSpace = createSpace;
    replServer.context.listSpaces = listSpaces;
    replServer.context.deleteSpace = deleteSpace;
    replServer.context.createCategory = createCategory;
    replServer.context.listCategories = listCategories;
    replServer.context.deleteCategory = deleteCategory;
    replServer.context.createItem = createItem;
    replServer.context.listItemsByCategory = listItemsByCategory;
    replServer.context.getItemById = getItemById;
    replServer.context.deleteItem = deleteItem;
    replServer.context.listAllItemsInCategoryRecursive = listAllItemsInCategoryRecursive;
    replServer.context.updateItem = updateItem;
    replServer.context.queryItemsUnified = queryItemsUnified;
    replServer.context.rebuildSearchIndex = rebuildSearchIndex;
}

startREPL();