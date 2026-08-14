import * as fsSync from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import * as os from 'node:os';
import type { Database } from 'bun:sqlite';

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

export default function createDatabaseApi(db: Database, ctx: AppContext) {
    const insertItemStmt = db.prepare(
        'INSERT INTO items (name, quantity, category_id, attributes) VALUES (?, ?, ?, ?)'
    );
    const insertIndexStmt = db.prepare(
        'INSERT OR REPLACE INTO item_attributes_index (item_id, attr_key, attr_value) VALUES (?, ?, ?)'
    );
    const clearIndexStmt = db.prepare(
        'DELETE FROM item_attributes_index WHERE item_id = ?'
    );
    
    const createSpace = (name: string): number | bigint => {
        const stmt = db.prepare('INSERT INTO spaces (name) VALUES (?)');
        const info = stmt.run(name);
        return info.lastInsertRowid;
    };
    
    const renameSpace = (id: number | bigint, name: string): boolean => {
        const stmt = db.prepare('UPDATE spaces SET name = ? WHERE id = ?');
        return stmt.run(name, id).changes > 0;
    };
    
    const listSpaces = (): Space[] => {
        return db.prepare('SELECT * FROM spaces').all() as Space[];
    };
    
    const deleteSpace = (id: number | bigint): boolean => {
        const stmt = db.prepare('DELETE FROM spaces WHERE id = ?');
        return stmt.run(id).changes > 0;
    };
    
    const createCategory = (
        name: string,
        space: number | bigint,
        category: number | bigint | null = null,
        fields: string[] = []
    ): number | bigint => {
        const stmt = db.prepare(
            'INSERT INTO categories (name, parent_space, parent_category, fields_template) VALUES (?, ?, ?, ?)'
        );
        const info = stmt.run(name, space, category, JSON.stringify(fields));
        return info.lastInsertRowid;
    };
    
    const renameCategory = (id: number | bigint, name: string): boolean => {
        const stmt = db.prepare('UPDATE categories SET name = ? WHERE id = ?');
        return stmt.run(name, id).changes > 0;
    };
    
    const listCategories = (space: number | bigint): Category[] => {
        const stmt = db.prepare(
            'SELECT id, name, parent_category, fields_template FROM categories WHERE parent_space = ?'
        );
        const rows = stmt.all(space) as any[];
        return rows.map(row => ({
            ...row,
            fields_template: JSON.parse(row.fields_template || '[]')
        }));
    };
    
    const deleteCategory = (id: number | bigint): boolean => {
        const stmt = db.prepare('DELETE FROM categories WHERE id = ?');
        return stmt.run(id).changes > 0;
    };
    
    const createItem = db.transaction(
        (name: string, quantity = 0, category: number | bigint, attributes: Record<string, any> = {}) => {
            const stmt = db.prepare(
                'INSERT INTO items (name, quantity, category_id, attributes) VALUES (?, ?, ?, ?)'
            );
            const info = stmt.run(name, quantity, category, JSON.stringify(attributes));
            const itemId = info.lastInsertRowid;
            
            for (const [key, value] of Object.entries(attributes)) {
                if (value !== null && value !== undefined) {
                    insertIndexStmt.run(itemId, key, String(value));
                }
            }
            return itemId;
        }
    );
    
    const createItemBulk = db.transaction(
        (items: ItemInput[], categoryId: number | bigint) => {
            for (const item of items) {
                const info = insertItemStmt.run(
                    item.name, 
                    item.quantity || 0, 
                    categoryId, 
                    JSON.stringify(item.attributes || {})
                );
                const itemId = info.lastInsertRowid;
                
                clearIndexStmt.run(itemId);
                
                if (item.attributes) {
                    for (const [key, value] of Object.entries(item.attributes)) {
                        if (value !== null && value !== undefined) {
                            insertIndexStmt.run(itemId, key, String(value));
                        }
                    }
                }
            }
        }
    );
    
    const listItemsByCategory = (categoryId: number | bigint): Item[] => {
        const stmt = db.prepare(
            'SELECT id, name, quantity, quantity_commited, restock_point, attributes FROM items WHERE category_id = ?'
        );
        const rows = stmt.all(categoryId) as any[];
        
        return rows.map(row => ({
            ...row,
            attributes: JSON.parse(row.attributes || '{}')
        }));
    };
    
    const getItemById = (itemId: number | bigint): Item | null => {
        const stmt = db.prepare('SELECT * FROM items WHERE id = ?');
        const row = stmt.get(itemId) as any;
        if (!row) return null;
        return {
            ...row,
            attributes: JSON.parse(row.attributes || '{}')
        };
    };
    
    const deleteItem = (id: number | bigint): boolean => {
        const stmt = db.prepare('DELETE FROM items WHERE id = ?');
        return stmt.run(id).changes > 0;
    };
    
    const listAllItemsInCategoryRecursive = (categoryId: number | bigint): Item[] => {
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
        const rows = db.prepare(query).all(categoryId) as any[];
        return rows.map(row => ({
            ...row,
            attributes: JSON.parse(row.attributes || '{}')
        }));
    };
    
    const updateItem = db.transaction((id: number | bigint, updates: Partial<ItemInput> & Record<string, any> = {}) => {
        const currentItem = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as any;
        if (!currentItem) {
            throw new Error(`Item with ID ${id} not found.`);
        }
        
        const newName = updates.name !== undefined ? updates.name : currentItem.name;
        const newCategory = updates['category_id'] !== undefined ? updates['category_id'] : currentItem.category_id;
        const newQty = updates.quantity !== undefined ? updates.quantity : currentItem.quantity;
        const newCommited = updates['quantity_commited'] !== undefined ? updates['quantity_commited'] : currentItem.quantity_commited;
        const newRestock = updates['restock_point'] !== undefined ? updates['restock_point'] : currentItem.restock_point;
        
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
        
        const queryItemsUnified = ({ categoryId = null, rules = [], logicalOp = 'AND' }: QueryUnifiedOptions = {}): Item[] => {
            const safeOperators = ['=', '>=', '<=', '>', '<', 'LIKE', '!='];
            const safeLogicalOps = ['AND', 'OR'];
            const safeNativeFields = ['name', 'quantity', 'quantity_commited', 'restock_point'];
            
            if (!safeLogicalOps.includes(logicalOp.toUpperCase())) {
                throw new Error(`Unsupported logical operator: ${logicalOp}`);
            }
            
            const query = `SELECT DISTINCT i.* FROM items i`;
            const params: any[] = [];
            
            let attrJoinCount = 0;
            let joinClauses = '';
            const whereClauses: string[] = [];
            
            if (categoryId !== null) {
                whereClauses.push(`i.category_id = ?`);
                params.push(categoryId);
            }
            
            const ruleClauses: string[] = [];
            
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
            const rows = stmt.all(...params) as any[];
            
            return rows.map(row => ({
                ...row,
                attributes: JSON.parse(row.attributes || '{}')
            }));
        };
        
        const rebuildSearchIndex = (): number => {
            return db.transaction(() => {
                db.prepare('DELETE FROM item_attributes_index').run();
                const items = db.prepare('SELECT id, attributes FROM items').all() as any[];
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
        };
        
        const convert = async (version: string, space_id: number | bigint, chunk_cap: ChunkCap = 5000): Promise<void> => {
            if (!ctx.old_formats[version]) return;
            
            const spaces = listSpaces();
            
            if (!spaces.length) {
                throw new Error('No spaces detected. You must create a space in order to convert your inventory');
            }
            
            const spaceExists = spaces.find(obj => obj.id === space_id);
            if (!spaceExists) {
                throw new Error('Either there were more than one matches for the given space, or it was not found');
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
                
                let categoryId: number | bigint;
                try {
                    console.log('Creating Category "0.1.0 Inventory".');
                    const category = createCategory('0.1.0 Inventory', space_id, null, ['location', 'keywords']);
                    categoryId = typeof category === 'object' ? (category as any).id : category;
                    console.log('Created category "0.1.0 Inventory".');
                } catch (err) {
                    throw new Error(`Failed to create category: ${err}`);
                }
                
                let memoryLimitBytes = Infinity; 
                let itemThreshold = 5000;
                
                const ONE_GB = 1024 * 1024 * 1024;
                const SAFE_V8_MAX_HEAP = 1.5 * ONE_GB;
                const totalFreeMemory = os.freemem(); 
                
                if (chunk_cap === 'auto') {
                    const targetMemory = (totalFreeMemory / 2) - ONE_GB;
                    memoryLimitBytes = Math.min(SAFE_V8_MAX_HEAP, Math.max(0, targetMemory));
                    itemThreshold = 50000; 
                    console.log(`Auto-memory mode enabled. Target limit: ${(memoryLimitBytes / 1024 / 1024).toFixed(0)} MB`);
                } 
                else if (chunk_cap === 'max') {
                    const targetMemory = totalFreeMemory - ONE_GB;
                    memoryLimitBytes = Math.min(SAFE_V8_MAX_HEAP, Math.max(0, targetMemory));
                    itemThreshold = 200000; 
                    console.log(`Max-performance mode enabled. Target limit: ${(memoryLimitBytes / 1024 / 1024).toFixed(0)} MB`);
                } 
                else if (typeof chunk_cap === 'number') {
                    itemThreshold = chunk_cap;
                }
                
                const CHUNK_SIZE_LIMIT = itemThreshold;
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
                        
                        const currentHeapUsed = process.memoryUsage().heapUsed;
                        
                        if (itemChunk.length >= CHUNK_SIZE_LIMIT || currentHeapUsed >= memoryLimitBytes) {
                            createItemBulk(itemChunk, categoryId);
                            itemChunk = [];
                        }
                        
                    } catch (err) {
                        throw new Error(`Failed to process item line: ${err}`);
                    }
                }
                
                if (itemChunk.length > 0) {
                    createItemBulk(itemChunk, categoryId);
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
            queryItemsUnified,
            rebuildSearchIndex,
            convert
        };
    }