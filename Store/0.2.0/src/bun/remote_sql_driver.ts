import * as fsSync from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import * as os from 'node:os';
import { SQL } from 'bun';

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

export default function createRemoteDatabaseApi(db: SQL, ctx: AppContext) {
    const createSpace = async (name: string): Promise<number | bigint> => {
        const result = await db`
            INSERT INTO spaces (name) VALUES (${name}) RETURNING id
        `;
        return result[0].id;
    };

    const listSpaces = async (): Promise<Space[]> => {
        const rows = await db`SELECT * FROM spaces`;
        return rows as Space[];
    };

    const deleteSpace = async (id: number | bigint): Promise<boolean> => {
        const result = await db`DELETE FROM spaces WHERE id = ${id}`;
        return result.count > 0;
    };

    const createCategory = async (
        name: string,
        space: number | bigint,
        category: number | bigint | null = null,
        fields: string[] = []
    ): Promise<number | bigint> => {
        const result = await db`
            INSERT INTO categories (name, parent_space, parent_category, fields_template)
            VALUES (${name}, ${space}, ${category}, ${JSON.stringify(fields)})
            RETURNING id
        `;
        return result[0].id;
    };

    const listCategories = async (space: number | bigint): Promise<Category[]> => {
        const rows = await db`
            SELECT id, name, parent_category, fields_template 
            FROM categories 
            WHERE parent_space = ${space}
        `;
        return rows.map((row: any) => ({
            ...row,
            fields_template: typeof row.fields_template === 'string' 
                ? JSON.parse(row.fields_template || '[]') 
                : row.fields_template
        }));
    };

    const deleteCategory = async (id: number | bigint): Promise<boolean> => {
        const result = await db`DELETE FROM categories WHERE id = ${id}`;
        return result.count > 0;
    };

    const createItem = async (
        name: string, 
        quantity = 0, 
        category: number | bigint, 
        attributes: Record<string, any> = {}
    ): Promise<number | bigint> => {
        return await db.transaction(async (tx) => {
            const res = await tx`
                INSERT INTO items (name, quantity, category_id, attributes)
                VALUES (${name}, ${quantity}, ${category}, ${JSON.stringify(attributes)})
                RETURNING id
            `;
            const itemId = res[0].id;

            for (const [key, value] of Object.entries(attributes)) {
                if (value !== null && value !== undefined) {
                    await tx`
                        INSERT INTO item_attributes_index (item_id, attr_key, attr_value)
                        VALUES (${itemId}, ${key}, ${String(value)})
                        ON CONFLICT (item_id, attr_key) DO UPDATE SET attr_value = EXCLUDED.attr_value
                    `;
                }
            }
            return itemId;
        });
    };

    const createItemBulk = async (items: ItemInput[], categoryId: number | bigint): Promise<void> => {
        await db.transaction(async (tx) => {
            for (const item of items) {
                const res = await tx`
                    INSERT INTO items (name, quantity, category_id, attributes)
                    VALUES (${item.name}, ${item.quantity || 0}, ${categoryId}, ${JSON.stringify(item.attributes || {})})
                    RETURNING id
                `;
                const itemId = res[0].id;

                await tx`DELETE FROM item_attributes_index WHERE item_id = ${itemId}`;

                if (item.attributes) {
                    for (const [key, value] of Object.entries(item.attributes)) {
                        if (value !== null && value !== undefined) {
                            await tx`
                                INSERT INTO item_attributes_index (item_id, attr_key, attr_value)
                                VALUES (${itemId}, ${key}, ${String(value)})
                                ON CONFLICT (item_id, attr_key) DO UPDATE SET attr_value = EXCLUDED.attr_value
                            `;
                        }
                    }
                }
            }
        });
    };

    const listItemsByCategory = async (categoryId: number | bigint): Promise<Item[]> => {
        const rows = await db`
            SELECT id, name, quantity, quantity_commited, restock_point, attributes 
            FROM items WHERE category_id = ${categoryId}
        `;
        return rows.map((row: any) => ({
            ...row,
            attributes: typeof row.attributes === 'string' ? JSON.parse(row.attributes || '{}') : row.attributes
        }));
    };

    const getItemById = async (itemId: number | bigint): Promise<Item | null> => {
        const rows = await db`SELECT * FROM items WHERE id = ${itemId}`;
        if (!rows.length) return null;
        const row = rows[0];
        return {
            ...row,
            attributes: typeof row.attributes === 'string' ? JSON.parse(row.attributes || '{}') : row.attributes
        };
    };

    const deleteItem = async (id: number | bigint): Promise<boolean> => {
        const res = await db`DELETE FROM items WHERE id = ${id}`;
        return res.count > 0;
    };

    const listAllItemsInCategoryRecursive = async (categoryId: number | bigint): Promise<Item[]> => {
        const rows = await db`
            WITH RECURSIVE subcategories AS (
                SELECT id FROM categories WHERE id = ${categoryId}
                UNION ALL
                SELECT c.id FROM categories c
                JOIN subcategories s ON c.parent_category = s.id
            )
            SELECT i.* FROM items i
            WHERE i.category_id IN (SELECT id FROM subcategories);
        `;
        return rows.map((row: any) => ({
            ...row,
            attributes: typeof row.attributes === 'string' ? JSON.parse(row.attributes || '{}') : row.attributes
        }));
    };

    const updateItem = async (id: number | bigint, updates: Partial<ItemInput> & Record<string, any> = {}): Promise<boolean> => {
        return await db.transaction(async (tx) => {
            const currentRows = await tx`SELECT * FROM items WHERE id = ${id}`;
            if (!currentRows.length) {
                throw new Error(`Item with ID ${id} not found.`);
            }
            const currentItem = currentRows[0];

            const newName = updates.name !== undefined ? updates.name : currentItem.name;
            const newCategory = updates['category_id'] !== undefined ? updates['category_id'] : currentItem.category_id;
            const newQty = updates.quantity !== undefined ? updates.quantity : currentItem.quantity;
            const newCommited = updates['quantity_commited'] !== undefined ? updates['quantity_commited'] : currentItem.quantity_commited;
            const newRestock = updates['restock_point'] !== undefined ? updates['restock_point'] : currentItem.restock_point;

            let mergedAttributes = typeof currentItem.attributes === 'string' 
                ? JSON.parse(currentItem.attributes || '{}') 
                : (currentItem.attributes || {});

            if (updates.attributes) {
                mergedAttributes = { ...mergedAttributes, ...updates.attributes };
            }

            const res = await tx`
                UPDATE items 
                SET name = ${newName}, 
                    category_id = ${newCategory}, 
                    quantity = ${newQty}, 
                    quantity_commited = ${newCommited}, 
                    restock_point = ${newRestock}, 
                    attributes = ${JSON.stringify(mergedAttributes)}
                WHERE id = ${id}
            `;

            if (res.count > 0 && updates.attributes) {
                await tx`DELETE FROM item_attributes_index WHERE item_id = ${id}`;
                for (const [key, value] of Object.entries(mergedAttributes)) {
                    if (value !== null && value !== undefined) {
                        await tx`
                            INSERT INTO item_attributes_index (item_id, attr_key, attr_value)
                            VALUES (${id}, ${key}, ${String(value)})
                            ON CONFLICT (item_id, attr_key) DO UPDATE SET attr_value = EXCLUDED.attr_value
                        `;
                    }
                }
            }
            return res.count > 0;
        });
    };

    const rebuildSearchIndex = async (): Promise<number> => {
        return await db.transaction(async (tx) => {
            await tx`DELETE FROM item_attributes_index`;
            const items = await tx`SELECT id, attributes FROM items`;
            let count = 0;
            for (const item of items) {
                const attributes = typeof item.attributes === 'string' ? JSON.parse(item.attributes || '{}') : item.attributes;
                for (const [key, value] of Object.entries(attributes)) {
                    if (value !== null && value !== undefined) {
                        await tx`
                            INSERT INTO item_attributes_index (item_id, attr_key, attr_value)
                            VALUES (${item.id}, ${key}, ${String(value)})
                            ON CONFLICT (item_id, attr_key) DO UPDATE SET attr_value = EXCLUDED.attr_value
                        `;
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

            let memoryLimitBytes = Infinity; 
            let itemThreshold = 5000;
            const totalFreeMemory = os.freemem(); 

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
        listSpaces,
        deleteSpace,
        createCategory,
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