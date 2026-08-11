import type { Database } from 'bun:sqlite';

export function init_database(db: Database) {
    db.run(`
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
`);
    }