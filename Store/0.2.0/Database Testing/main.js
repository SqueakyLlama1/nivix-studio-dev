const Database = require('better-sqlite3');
const db = new Database("my_testing_database.db");
const repl = require('repl');

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
    attributes TEXT,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);
`);

// Test Functions
function createSpace(name) {
    const stmt = db.prepare('INSERT INTO spaces (name) VALUES (?)');
    const info = stmt.run(name);
    return info.lastInsertRowid;
}

function listSpaces() {
    return db.prepare('SELECT * FROM spaces').all();
}

function createCategory(name, space, category = null, fields = []) {
    const stmt = db.prepare('INSERT INTO categories (name, parent_space, parent_category, fields_template) VALUES (?, ?, ?, ?)');
    const info = stmt.run(name, space, category, JSON.stringify(fields));
    return info.lastInsertRowid;
}

function listCategories(space) {
    const stmt = db.prepare('SELECT id, name, parent_category FROM categories WHERE parent_space = ?');
    return stmt.all(space);
}

function createItem(name, category, attributes = {}) {
    const stmt = db.prepare('INSERT INTO items (name, category_id, attributes) VALUES (?, ?, ?)');
    const info = stmt.run(name, category, JSON.stringify(attributes));
    return info.lastInsertRowid;
}

function listItemsByCategory(categoryId) {
    const stmt = db.prepare('SELECT id, name, attributes FROM items WHERE category_id = ?');
    const rows = stmt.all(categoryId);
    
    return rows.map(row => ({
        ...row,
        attributes: JSON.parse(row.attributes)
    }));
}

/**
 * Query 2: Filters items in a category based on their custom JSON attributes.
 * Perfect for your left-side Query Filter Menu.
 * * @param {number} categoryId - The category to search inside
 * @param {string} key - The object attribute key (e.g., 'speed' or 'wireless')
 * @param {string} operator - '=', '>=', '<=', '>', '<', or 'LIKE'
 * @param {any} value
 */
function queryItemsByAttribute(categoryId, key, operator, value) {
    const safeOperators = ['=', '>=', '<=', '>', '<', 'LIKE'];
    if (!safeOperators.includes(operator)) {
        throw new Error(`Unsupported operator: ${operator}`);
    }

    const query = `
        SELECT *
        FROM items 
        WHERE category_id = ? 
          AND json_extract(attributes, '$.' || ?) ${operator} ?
    `;
    
    const stmt = db.prepare(query);
    const rows = stmt.all(categoryId, key, value);
    
    return rows.map(row => ({
        ...row,
        attributes: JSON.parse(row.attributes)
    }));
}

function queryItemsByName(name, categoryId = null, strict = false) {
    const searchName = strict ? name : `%${name}%`;
    if (!categoryId) {
        let stmt;
        if (!strict) {
            stmt = db.prepare('SELECT * FROM items WHERE name LIKE ?');
        } else {
            stmt = db.prepare('SELECT * FROM items WHERE name = ?');
        }
        return stmt.all(searchName);
    } else {
        let stmt;
        if (!strict) {
            stmt = db.prepare('SELECT * FROM items WHERE category_id = ? AND name LIKE ?');
        } else {
            stmt = db.prepare('SELECT * FROM items WHERE category_id = ? AND name = ?');
        }
        return stmt.all(categoryId, searchName);
    }
}

function updateItem(id, updates = {}) {
    const currentItem = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
    if (!currentItem) {
        throw new Error(`Item with ID ${id} not found.`);
    }

    const newName = updates.name !== undefined ? updates.name : currentItem.name;
    const newCategory = updates.category_id !== undefined ? updates.category_id : currentItem.category_id;

    let finalAttributesString;
    if (updates.attributes) {
        const currentAttributes = JSON.parse(currentItem.attributes || '{}');
        const mergedAttributes = { ...currentAttributes, ...updates.attributes };
        finalAttributesString = JSON.stringify(mergedAttributes);
    } else {
        finalAttributesString = currentItem.attributes;
    }

    const stmt = db.prepare(`
        UPDATE items 
        SET name = ?, category_id = ?, attributes = ? 
        WHERE id = ?
    `);
    
    const info = stmt.run(newName, newCategory, finalAttributesString, id);
    return info.changes > 0;
}

const session = repl.start('> ');
session.context.db = db;
session.context.createSpace = createSpace;
session.context.listSpaces = listSpaces;
session.context.createCategory = createCategory;
session.context.createItem = createItem;
session.context.listCategories = listCategories;
session.context.listItemsByCategory = listItemsByCategory;
session.context.queryItemsByAttribute = queryItemsByAttribute;
session.context.queryItemsByName = queryItemsByName;
session.context.updateItem = updateItem;