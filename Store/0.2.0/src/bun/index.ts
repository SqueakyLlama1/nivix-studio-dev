import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

import { BrowserView, BrowserWindow } from "electrobun/bun";
import Database from 'bun:sqlite';
import mysql from 'mysql2/promise';

import * as updater from "./updater.js";
import * as utils from "./updater_utils.ts";
import { type UpdaterRPCType } from '../shared/bun/updater_rpc_type.ts';
import { type StoreRPCType } from '../shared/bun/store_rpc_type.ts';

const studio_path = path.join(os.homedir(), 'nvxstdo');
const store_path = path.join(studio_path, 'store');
const preferences_path = path.join(store_path, 'preferences.json');

const old_formats = {
	"0.1.0-hub": path.join('appdata', 'store', 'inventory.ndjson'),
	"0.1.0": path.join('store', 'inventory.ndjson')
};

const ctx = { studio_path, old_formats };

let functions_module;
let functions: Record<string, (...args: any[]) => any> = {};
let db: Database | mysql.Pool;

const updaterRPC = BrowserView.defineRPC<UpdaterRPCType>({
	maxRequestTime: 5000,
	handlers: {
		requests: {
			async ready() {
				await init();
				return true;
			},
			async checkUpdate() {
				return await updater.updateAvailable();
			},
			storeHandoff() {
				if (updaterWindow) updaterWindow.close();
				openStore();
			},
			close() {
				if (updaterWindow) updaterWindow.close();
			}
		},
		messages: {}
	}
});

const storeRPC = BrowserView.defineRPC<StoreRPCType>({
	maxRequestTime: 5000,
	handlers: {
		requests: {
			async needsConversion() {
				try {
					const expectedOldInventoryPath = path.join(studio_path, old_formats['0.1.0-hub']);
					await fs.access(expectedOldInventoryPath);
					return "0.1.0-hub";
				} catch {
					// ignore
				}
				
				try {
					const expectedOldInventoryPath = path.join(studio_path, old_formats['0.1.0']);
					await fs.access(expectedOldInventoryPath);
					return "0.1.0";
				} catch {
					// ignore
				}
				return false;
			},
			async getPreferences() {
				try {
					const preferencesContents = await fs.readFile(preferences_path, 'utf-8');
					return JSON.parse(preferencesContents);
				} catch {
					return {};
				}
			},
			async setPreferences(preferences: object) {
				const data = JSON.stringify(preferences || {}, null, 2);
				await fs.writeFile(preferences_path, data);
				return true;
			},
			async createSpace(name: string) {
				return await functions['createSpace'](name);
			},
			async listSpaces() {
				return await functions['listSpaces']();
			},
			async deleteSpace(id: string) {
				return await functions['deleteSpace'](id);
			},
			async createCategory({
				name,
				space,
				category = null,
				fields = []
			}: {
				name: string;
				space: string;
				category?: any;
				fields?: any[]
			}) {
				return await functions['createCategory'](name, space, category, fields);
			},
			async listCategories(space: string) {
				return await functions['listCategories'](space);
			},
			async deleteCategory(category: string) {
				return await functions['deleteCategory'](category);
			},
			async createItem({
				name,
				quantity = 0,
				category,
				attributes = {}
			}: {
				name: string;
				quantity?: number;
				category: string;
				attributes?: object;
			}) {
				return await functions['createItem'](name, quantity, category, attributes);
			},
			async deleteItem(id: string) {
				return await functions['deleteItem'](id);
			},
			async updateItem({ id, updates = {} }: { id: string; updates?: object }) {
				return await functions['updateItem'](id, updates);
			},
			async listItemsByCategory(category: string) {
				return await functions['listItemsByCategory'](category);
			},
			async getItemById(id: string) {
				return await functions['getItemById'](id);
			},
			async queryItems({
				category = null,
				rules = [],
				logicalOp = 'AND'
			}: {
				category?: string | null;
				rules?: any[];
				logicalOp?: string;
			} | void = {}) {
				return await functions['queryItemsUnified']({
					categoryId: category,
					rules,
					logicalOp
				});
			},
			async rebuildSearchIndex() {
				return await functions['rebuildSearchIndex']();
			},
			async convert({
				version,
				space
			}: {
				version: string;
				space: string;
			}) {
				return await functions['convert'](version, space);
			},
			async readFile({ path: relativePath }: { path: string }) {
				const absolutePath = path.resolve(import.meta.dir, '../views/store/', relativePath);
				const file = Bun.file(absolutePath);
				return await file.text();
			},
			async setDatabase({ database, databasePath }: { database: string, databasePath?: string }) {
				if (database === 'sql') {
					if (db && 'end' in db) {
						await db.end();
					}
					
					db = mysql.createPool(databasePath!);
					functions_module = await import('./remote_sql_driver.ts');
					const init_module = await import('./init_remote_sql_database.ts');
					await init_module.init_database(db);
					functions = functions_module.default(db, ctx);
				} else if (database === 'sqlite') {
					if (db && 'end' in db) {
						await db.end();
					}
					
					db = new Database(path.join(store_path, 'inventory.db'));
					functions_module = await import('./local_sqlite_driver.ts');
					const init_module = await import('./init_local_sqlite_database.ts');
					await init_module.init_database(db);
					functions = functions_module.default(db, ctx);
				} else {
					throw new Error('Database not recognized.');
				}
			}
		},
		messages: {
			closeStore() {
				if (storeWindow) storeWindow.close();
			}
		}
	}
});

type UpdaterRPC = ReturnType<typeof BrowserView.defineRPC<UpdaterRPCType>>;
type StoreRPC = ReturnType<typeof BrowserView.defineRPC<StoreRPCType>>;

let storeWindow: BrowserWindow<StoreRPC> | null = null;
let updaterWindow: BrowserWindow<UpdaterRPC> | null = null;

function openStore() {
	const width = 800;
	const height = 600;
	const { x, y } = utils.getCenterXY(width, height);
	
	storeWindow = new BrowserWindow({
		title: "Nivix Store",
		url: "views://store/store.html",
		frame: {
			width,
			height,
			x,
			y
		},
		rpc: storeRPC
	});
}

function openUpdater() {
	const width = 700;
	const height = 400;
	const { x, y } = utils.getCenterXY(width, height);
	
	const windowInstance = new BrowserWindow({
		title: "Nivix Store",
		url: "views://updater/updater.html",
		transparent: true,
		titleBarStyle: "hidden",
		frame: {
			width,
			height,
			x,
			y
		},
		rpc: updaterRPC
	});

	updaterWindow = windowInstance;

	windowInstance.webview.on('dom-ready', () => {
		init();
	});
}

async function init() {
	if (updaterWindow) {
		updaterWindow.webview.rpc?.send.displayDebug({ message: "Initializing App Sandbox..." });
	}
	
	try {
		await updater.init();
		
		await fs.mkdir(store_path, { recursive: true });
		await fs.mkdir(studio_path, { recursive: true });
	} catch (err) {
		const message = err as string;
		if (updaterWindow) {
			updaterWindow.webview.rpc?.send.displayDebug({ message, type: 'error'});
		}
		return;
	}
	
	try {
		db = new Database(path.join(store_path, "inventory.db"));
	} catch (err) {
		const message = err as string;
		throw new Error(`Failed to open/connect SQLite Database: ${message}`);
	}
}

openUpdater();

export default {
	store_path,
	studio_path
};