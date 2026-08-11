import type mysql from 'mysql2/promise';

export async function init_database(db: mysql.Pool): Promise<void> {
    const expectedTables = ['spaces', 'categories', 'items', 'item_attributes_index'];

    const tableQueries = [
        `CREATE TABLE IF NOT EXISTS spaces (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

        `CREATE TABLE IF NOT EXISTS categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            parent_space INT NOT NULL,
            parent_category INT NULL,
            fields_template JSON,
            CONSTRAINT fk_categories_space 
                FOREIGN KEY (parent_space) REFERENCES spaces(id) ON DELETE CASCADE,
            CONSTRAINT fk_categories_parent 
                FOREIGN KEY (parent_category) REFERENCES categories(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

        `CREATE TABLE IF NOT EXISTS items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            category_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            quantity INT DEFAULT 0,
            quantity_commited INT DEFAULT 0,
            restock_point INT DEFAULT 0,
            attributes JSON,
            CONSTRAINT fk_items_category 
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

        `CREATE TABLE IF NOT EXISTS item_attributes_index (
            item_id INT NOT NULL,
            attr_key VARCHAR(255) NOT NULL,
            attr_value VARCHAR(255),
            PRIMARY KEY (item_id, attr_key),
            CONSTRAINT fk_attr_index_item 
                FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
    ];

    const indexQueries = [
        `CREATE INDEX idx_attributes_search ON item_attributes_index (attr_key, attr_value);`,
        `CREATE INDEX idx_items_name ON items (name);`,
        `CREATE INDEX idx_items_quantity ON items (quantity);`
    ];

    try {
        for (const query of tableQueries) {
            await db.query(query);
        }

        for (const query of indexQueries) {
            try {
                await db.query(query);
            } catch (err: any) {
                if (err.code !== 'ER_DUP_KEYNAME' && err.errno !== 1061) {
                    throw err;
                }
            }
        }
    } catch (err: any) {
        // MySQL permission denied error codes:
        // 1142 = ER_TABLEACCESS_DENIED_ERROR
        // 1044 = ER_DBACCESS_DENIED_ERROR
        if (err.errno === 1142 || err.errno === 1044 || err.code === 'ER_TABLEACCESS_DENIED_ERROR') {
            const tablesExist = await checkTablesExist(db, expectedTables);

            if (tablesExist) {
                // Tables are ready; auditor can proceed without error
                console.warn('Initialization skipped: Current user lacks DDL privileges, but database tables are already initialized.');
                return;
            } else {
                // Tables are missing AND user lacks permissions to create them
                throw new Error(
                    'Database Initialization Error: Required database tables have not been created yet. ' +
                    'A user with appropriate administrative permissions must log in first to perform initial setup.'
                );
            }
        }

        throw err;
    }
}

async function checkTablesExist(db: mysql.Pool, tableNames: string[]): Promise<boolean> {
    try {
        const [rows] = await db.query<any[]>(
            `SELECT COUNT(DISTINCT table_name) as existing_count 
             FROM information_schema.tables 
             WHERE table_schema = DATABASE() 
               AND table_name IN (?)`,
            [tableNames]
        );

        const count = rows[0]?.existing_count || 0;
        return count === tableNames.length;
    } catch {
        return false;
    }
}