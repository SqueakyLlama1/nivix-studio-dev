import type mysql from 'mysql2/promise';

export async function init_database(db: mysql.Pool): Promise<void> {
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
}