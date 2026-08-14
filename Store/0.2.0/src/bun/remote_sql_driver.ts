import * as fsSync from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

export interface AppContext {
    studio_path: string;
    old_formats: Record<string, string>;
}

export interface Space {
    id: number | bigint;
    name: string;
}

export interface Category {
    id: number | bigint;
    name: string;
    parent_space: number | bigint;
    parent_category: number | bigint | null;
    fields_template: string[] | string;
}

export interface ItemInput {
    name: string;
    quantity?: number;
    attributes?: Record<string, any>;
}

export interface Item {
    id: number | bigint;
    name: string;
    quantity: number;
    quantity_commited?: number;
    restock_point?: number;
    category_id: number | bigint;
    attributes: Record<string, any>;
}

export interface QueryRule {
    type: 'native' | 'attribute';
    field: string;
    operator: '=' | '>=' | '<=' | '>' | '<' | 'LIKE' | '!=';
    value: any;
}

export interface QueryUnifiedOptions {
    categoryId?: number | bigint | null;
    rules?: QueryRule[];
    logicalOp?: 'AND' | 'OR';
}

export type ChunkCap = 'auto' | 'max' | number;

export interface RemoteDbConfig {
    host: string;
    port?: number;
    user: string;
    password?: string;
    database: string;
}

export default function createRemoteDatabaseApi(db: Pool, ctx: AppContext) {
    const createSpace = async (name: string): Promise<number | bigint> => {
        const [result] = await db.execute<ResultSetHeader>(
            'INSERT INTO spaces (name) VALUES (?)',
            [name]
        );
        return result.insertId;
    };
    
    const renameSpace = async (id: number | bigint, name: string): Promise<boolean> => {
        const [result] = await db.execute<ResultSetHeader>(
            'UPDATE spaces SET name = ? WHERE id = ?',
            [name, id]
        );
        return result.affectedRows > 0;
    };
    
    const listSpaces = async (): Promise<Space[]> => {
        const [rows] = await db.query<RowDataPacket[]>('SELECT * FROM spaces');
        return rows as Space[];
    };
    
    const deleteSpace = async (id: number | bigint): Promise<boolean> => {
        const [result] = await db.execute<ResultSetHeader>(
            'DELETE FROM spaces WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    };
    
    const createCategory = async (
        name: string,
        space: number | bigint,
        category: number | bigint | null = null,
        fields: string[] = []
    ): Promise<number | bigint> => {
        const [result] = await db.execute<ResultSetHeader>(
            'INSERT INTO categories (name, parent_space, parent_category, fields_template) VALUES (?, ?, ?, ?)',
            [name, space, category, JSON.stringify(fields)]
        );
        return result.insertId;
    };
    
    const renameCategory = async (id: number | bigint, name: string): Promise<boolean> => {
        const [result] = await db.execute<ResultSetHeader>(
            'UPDATE categories SET name = ? WHERE id = ?',
            [name, id]
        );
        return result.affectedRows > 0;
    };
    
    const listCategories = async (space: number | bigint): Promise<Category[]> => {
        const [rows] = await db.query<RowDataPacket[]>(
            'SELECT id, name, parent_category, fields_template FROM categories WHERE parent_space = ?',
            [space]
        );
        return rows.map((row: any) => ({
            ...row,
            fields_template: typeof row.fields_template === 'string' 
            ? JSON.parse(row.fields_template || '[]') 
            : row.fields_template
        })) as Category[];
    };
    
    const deleteCategory = async (id: number | bigint): Promise<boolean> => {
        const [result] = await db.execute<ResultSetHeader>(
            'DELETE FROM categories WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    };
    
    const runTransaction = async <T>(callback: (conn: PoolConnection) => Promise<T>): Promise<T> => {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            const result = await callback(conn);
            await conn.commit();
            return result;
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    };
    
    const createItem = async (
        name: string, 
        quantity = 0, 
        category: number | bigint, 
        attributes: Record<string, any> = {}
    ): Promise<number | bigint> => {
        return await runTransaction(async (conn) => {
            const [res] = await conn.execute<ResultSetHeader>(
                'INSERT INTO items (name, quantity, category_id, attributes) VALUES (?, ?, ?, ?)',
                [name, quantity, category, JSON.stringify(attributes)]
            );
            const itemId = res.insertId;
            
            for (const [key, value] of Object.entries(attributes)) {
                if (value !== null && value !== undefined) {
                    await conn.execute(
                        `INSERT INTO item_attributes_index (item_id, attr_key, attr_value)
                         VALUES (?, ?, ?)
                         ON DUPLICATE KEY UPDATE attr_value = VALUES(attr_value)`,
                        [itemId, key, String(value)]
                    );
                }
            }
            return itemId;
        });
    };
    
    const createItemBulk = async (items: ItemInput[], categoryId: number | bigint): Promise<void> => {
        await runTransaction(async (conn) => {
            for (const item of items) {
                const [res] = await conn.execute<ResultSetHeader>(
                    'INSERT INTO items (name, quantity, category_id, attributes) VALUES (?, ?, ?, ?)',
                    [item.name, item.quantity || 0, categoryId, JSON.stringify(item.attributes || {})]
                );
                const itemId = res.insertId;
                
                await conn.execute('DELETE FROM item_attributes_index WHERE item_id = ?', [itemId]);
                
                if (item.attributes) {
                    for (const [key, value] of Object.entries(item.attributes)) {
                        if (value !== null && value !== undefined) {
                            await conn.execute(
                                `INSERT INTO item_attributes_index (item_id, attr_key, attr_value)
                                 VALUES (?, ?, ?)
                                 ON DUPLICATE KEY UPDATE attr_value = VALUES(attr_value)`,
                                [itemId, key, String(value)]
                            );
                        }
                    }
                }
            }
        });
    };
    
    const listItemsByCategory = async (categoryId: number | bigint): Promise<Item[]> => {
        const [rows] = await db.query<RowDataPacket[]>(
            'SELECT id, name, quantity, quantity_commited, restock_point, attributes FROM items WHERE category_id = ?',
            [categoryId]
        );
        return rows.map((row: any) => ({
            ...row,
            attributes: typeof row.attributes === 'string' ? JSON.parse(row.attributes || '{}') : row.attributes
        })) as Item[];
    };
    
    const getItemById = async (itemId: number | bigint): Promise<Item | null> => {
        const [rows] = await db.query<RowDataPacket[]>('SELECT * FROM items WHERE id = ?', [itemId]);
        if (!rows.length) return null;
        const row = rows[0];
        return {
            ...row,
            attributes: typeof row['attributes'] === 'string' ? JSON.parse(row['attributes'] || '{}') : row['attributes']
        } as Item;
    };
    
    const deleteItem = async (id: number | bigint): Promise<boolean> => {
        const [res] = await db.execute<ResultSetHeader>('DELETE FROM items WHERE id = ?', [id]);
        return res.affectedRows > 0;
    };
    
    const listAllItemsInCategoryRecursive = async (categoryId: number | bigint): Promise<Item[]> => {
        const sql = `
            WITH RECURSIVE subcategories AS (
                SELECT id FROM categories WHERE id = ?
                UNION ALL
                SELECT c.id FROM categories c
                JOIN subcategories s ON c.parent_category = s.id
            )
            SELECT i.* FROM items i
            WHERE i.category_id IN (SELECT id FROM subcategories);
        `;
        const [rows] = await db.query<RowDataPacket[]>(sql, [categoryId]);
        return rows.map((row: any) => ({
            ...row,
            attributes: typeof row.attributes === 'string' ? JSON.parse(row.attributes || '{}') : row.attributes
        })) as Item[];
    };
    
    const updateItem = async (id: number | bigint, updates: Partial<ItemInput> & Record<string, any> = {}): Promise<boolean> => {
        return await runTransaction(async (conn) => {
            const [currentRows] = await conn.query<RowDataPacket[]>('SELECT * FROM items WHERE id = ?', [id]);
            if (!currentRows.length) {
                throw new Error(`Item with ID ${id} not found.`);
            }
            const currentItem = currentRows[0];
            
            const newName = updates.name !== undefined ? updates.name : currentItem['name'];
            const newCategory = updates['category_id'] !== undefined ? updates['category_id'] : currentItem['category_id'];
            const newQty = updates.quantity !== undefined ? updates.quantity : currentItem['quantity'];
            const newCommited = updates['quantity_commited'] !== undefined ? updates['quantity_commited'] : currentItem['quantity_commited'];
            const newRestock = updates['restock_point'] !== undefined ? updates['restock_point'] : currentItem['restock_point'];
            
            let mergedAttributes = typeof currentItem['attributes'] === 'string' 
            ? JSON.parse(currentItem['attributes'] || '{}') 
            : (currentItem['attributes'] || {});
            
            if (updates.attributes) {
                mergedAttributes = { ...mergedAttributes, ...updates.attributes };
            }
            
            const [res] = await conn.execute<ResultSetHeader>(
                `UPDATE items 
                 SET name = ?, category_id = ?, quantity = ?, quantity_commited = ?, restock_point = ?, attributes = ?
                 WHERE id = ?`,
                [newName, newCategory, newQty, newCommited, newRestock, JSON.stringify(mergedAttributes), id]
            );
            
            if (res.affectedRows > 0 && updates.attributes) {
                await conn.execute('DELETE FROM item_attributes_index WHERE item_id = ?', [id]);
                for (const [key, value] of Object.entries(mergedAttributes)) {
                    if (value !== null && value !== undefined) {
                        await conn.execute(
                            `INSERT INTO item_attributes_index (item_id, attr_key, attr_value)
                             VALUES (?, ?, ?)
                             ON DUPLICATE KEY UPDATE attr_value = VALUES(attr_value)`,
                            [id, key, String(value)]
                        );
                    }
                }
            }
            return res.affectedRows > 0;
        });
    };
    
    const rebuildSearchIndex = async (): Promise<number> => {
        return await runTransaction(async (conn) => {
            await conn.execute('DELETE FROM item_attributes_index');
            const [items] = await conn.query<RowDataPacket[]>('SELECT id, attributes FROM items');
            let count = 0;
            for (const item of items) {
                const attributes = typeof item['attributes'] === 'string' ? JSON.parse(item['attributes'] || '{}') : item['attributes'];
                for (const [key, value] of Object.entries(attributes)) {
                    if (value !== null && value !== undefined) {
                        await conn.execute(
                            `INSERT INTO item_attributes_index (item_id, attr_key, attr_value)
                             VALUES (?, ?, ?)
                             ON DUPLICATE KEY UPDATE attr_value = VALUES(attr_value)`,
                            [item['id'], key, String(value)]
                        );
                    }
                }
                count++;
            }
            return count;
        });
    };
    
    const convert = async (version: string, space_id: number | bigint, chunk_cap: ChunkCap = 5000): Promise<void> => {
        if (!ctx.old_formats[version]) return;
        
        const spaces = await listSpaces();
        if (!spaces.length) {
            throw new Error('No spaces detected. You must create a space in order to convert your inventory');
        }
        
        const spaceExists = spaces.find(obj => obj.id === space_id);
        if (!spaceExists) {
            throw new Error('Space match error.');
        }
        
        if (version === "0.1.0") {
            const oldPath = path.join(ctx.studio_path, ctx.old_formats[version]);
            const oldInventory = fsSync.createReadStream(oldPath);
            const stats = fsSync.statSync(oldPath);
            const totalBytes = stats.size;
            
            let bytesProcessed = 0;
            let lastReportedPercentage = -1; 
            
            const rl = readline.createInterface({
                input: oldInventory,
                crlfDelay: Infinity
            });
            
            console.log('Starting conversion from version 0.1.0 to 0.2.0');
            const category = await createCategory('0.1.0 Inventory', space_id, null, ['location', 'keywords']);
            const categoryId = typeof category === 'object' ? (category as any).id : category;
            
            let itemThreshold = 5000;
            
            if (chunk_cap === 'auto') {
                itemThreshold = 50000; 
            } else if (chunk_cap === 'max') {
                itemThreshold = 200000; 
            } else if (typeof chunk_cap === 'number') {
                itemThreshold = chunk_cap;
            }
            
            let itemChunk: ItemInput[] = [];
            
            for await (const line of rl) {
                bytesProcessed += Buffer.byteLength(line, 'utf-8') + 1;
                const currentPercentage = Math.floor((bytesProcessed / totalBytes) * 100);
                if (currentPercentage !== lastReportedPercentage) {
                    console.log(`Progress: ${currentPercentage}%`);
                    lastReportedPercentage = currentPercentage;
                }
                
                if (!line.trim()) continue;
                
                try {
                    const item = JSON.parse(line);
                    itemChunk.push({
                        name: item.name,
                        quantity: item.quantity,
                        attributes: {
                            'location': item.location,
                            'keywords': item.keywords
                        }
                    });
                    
                    if (itemChunk.length >= itemThreshold) {
                        await createItemBulk(itemChunk, categoryId);
                        itemChunk = [];
                    }
                } catch (err) {
                    throw new Error(`Failed to process item line: ${err}`);
                }
            }
            
            if (itemChunk.length > 0) {
                await createItemBulk(itemChunk, categoryId);
            }
            
            console.log("Conversion Completed.");
        }
    };
    
    return {
        createSpace,
        renameSpace,
        listSpaces,
        deleteSpace,
        createCategory,
        renameCategory,
        listCategories,
        deleteCategory,
        createItem,
        createItemBulk,
        listItemsByCategory,
        getItemById,
        deleteItem,
        listAllItemsInCategoryRecursive,
        updateItem,
        rebuildSearchIndex,
        convert
    };
}