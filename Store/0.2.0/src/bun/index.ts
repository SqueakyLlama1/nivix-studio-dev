import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

import { BrowserView, BrowserWindow } from "electrobun/bun";
import Database from 'bun:sqlite';
import mysql from 'mysql2/promise';

import * as updater from "./updater.js";
import * as utils from "./updater_utils";
import { type UpdaterRPCType } from '../shared/bun/updater_rpc_type';
import { type StoreRPCType } from '../shared/bun/store_rpc_type';

const studio_path = path.join(os.homedir(), 'nvxstdo');
const store_path = path.join(studio_path, 'store');
const preferences_path = path.join(store_path, 'preferences.json');

const old_formats = {
	"0.1.0-hub": path.join('appdata', 'store', 'inventory.ndjson'),
	"0.1.0": path.join('store', 'inventory.ndjson')
};

const ctx = { studio_path, old_formats };

let functions: Record<string, (...args: any[]) => any> = {};
let db: Database | mysql.Pool | null = null;
let initialization: Promise<void> | null = null;
let databaseQueue: Promise<void> = Promise.resolve();
let preferencesWrite: Promise<void> = Promise.resolve();

let activeDB: string;

function enqueueDatabaseTask<T>(task: () => Promise<T> | T): Promise<T> {
	const result = databaseQueue.then(task, task);
	databaseQueue = result.then(() => undefined, () => undefined);
	return result;
}

function withDatabase<T>(operation: (api: Record<string, (...args: any[]) => any>) => Promise<T> | T): Promise<T> {
	return enqueueDatabaseTask(() => {
		if (!db || Object.keys(functions).length === 0) {
			throw new Error('The database is not ready.');
		}
		return operation(functions);
	});
}

async function closeDatabase(): Promise<void> {
	if (!db) return;
	if ('end' in db) {
		await db.end();
	} else {
		db.close();
	}
	db = null;
	functions = {};
}

async function configureDatabase(database: string, databasePath?: string): Promise<void> {
	if (database === 'sql') {
		if (!databasePath) throw new Error('A remote database URL is required.');
		
		const remoteDb = mysql.createPool({
			uri: databasePath,
			connectTimeout: 3000,
			enableKeepAlive: true,
			keepAliveInitialDelay: 5000,
			waitForConnections: true,
			connectionLimit: 10,
		});
		
		try {
			await remoteDb.query({
				sql: 'SELECT 1',
				timeout: 3000,
			});
			
			const [{ default: createApi }, initModule] = await Promise.all([
				import('./remote_sql_driver'),
				import('./init_remote_sql_database')
			]);
			
			await initModule.init_database(remoteDb);
			await closeDatabase();
			
			db = remoteDb;
			functions = createApi(remoteDb, ctx);
			activeDB = 'sql';
		} catch (error) {
			await remoteDb.end();
			throw error;
		}
		return;
	}
	
	if (database === 'sqlite') {
		const localDb = new Database(path.join(store_path, 'inventory.db'));
		try {
			const [{ default: createApi }, initModule] = await Promise.all([
				import('./local_sqlite_driver'),
				import('./init_local_sqlite_database')
			]);
			initModule.init_database(localDb);
			await closeDatabase();
			
			db = localDb;
			functions = createApi(localDb, ctx);
			activeDB = 'sqlite';
		} catch (error) {
			localDb.close();
			throw error;
		}
		return;
	}
	
	throw new Error('Database not recognized.');
}

const updaterRPC = BrowserView.defineRPC<UpdaterRPCType>({
	maxRequestTime: 20000,
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
				// Do not destroy the WebView while it is still sending this RPC response.
				setTimeout(() => {
					const windowToClose = updaterWindow;
					openStore();
					windowToClose?.close();
					if (updaterWindow === windowToClose) updaterWindow = null;
				}, 0);
			},
			close() {
				setTimeout(() => {
					updaterWindow?.close();
					updaterWindow = null;
				}, 0);
			}
		},
		messages: {}
	}
});

const storeRPC = BrowserView.defineRPC<StoreRPCType>({
	maxRequestTime: 20000,
	handlers: {
		requests: {
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
				const write = preferencesWrite.then(() => fs.writeFile(preferences_path, data));
				preferencesWrite = write.catch(() => undefined);
				await write;
				return true;
			},
			async createSpace(name: string) {
				return withDatabase(api => api['createSpace'](name));
			},
			async renameSpace({ id, name }: { id: number; name: string }) {
				return withDatabase(api => api['renameSpace'](id, name));
			},
			async listSpaces() {
				return withDatabase(api => api['listSpaces']());
			},
			async deleteSpace(id: number) {
				return withDatabase(api => api['deleteSpace'](id));
			},
			async createCategory({
				name,
				space,
				id = null,
				fields = []
			}: {
				name: string;
				space: number;
				id?: any;
				fields?: any[]
			}) {
				return withDatabase(api => api['createCategory'](name, space, id, fields));
			},
			async renameCategory({ id, name }: { id: number; name: string }) {
				return withDatabase(api => api['renameCategory'](id, name));
			},
			async listCategories(space: number) {
				return withDatabase(api => api['listCategories'](space));
			},
			async deleteCategory(id: number) {
				return withDatabase(api => api['deleteCategory'](id));
			},
			async createItem({
				name,
				quantity = 0,
				category,
				attributes = {}
			}: {
				name: string;
				quantity?: number;
				category: number;
				attributes?: object;
			}) {
				return withDatabase(api => api['createItem'](name, quantity, category, attributes));
			},
			async deleteItem(id: number) {
				return withDatabase(api => api['deleteItem'](id));
			},
			async updateItem({ id, updates = {} }: { id: number; updates?: object }) {
				return withDatabase(api => api['updateItem'](id, updates));
			},
			async listItemsByCategory(id: number) {
				return withDatabase(api => api['listItemsByCategory'](id));
			},
			async getItemById(id: number) {
				return withDatabase(api => api['getItemById'](id));
			},
			async queryItems({
				category = null,
				rules = [],
				logicalOp = 'AND'
			}: {
				category?: number | null;
				rules?: any[];
				logicalOp?: string;
			} | void = {}) {
				return withDatabase(api => api['queryItemsUnified']({
					categoryId: category,
					rules,
					logicalOp
				}));
			},
			async rebuildSearchIndex() {
				return withDatabase(api => api['rebuildSearchIndex']());
			},
			async convert({
				version,
				space
			}: {
				version: string;
				space: number;
			}) {
				return withDatabase(api => api['convert'](version, space));
			},
			async readFile({ path: relativePath }: { path: string }) {
				const absolutePath = path.resolve(import.meta.dir, '../views/store/', relativePath);
				const file = Bun.file(absolutePath);
				return await file.text();
			},
			async setDatabase({ database, databasePath }: { database: string, databasePath?: string }) {
				await enqueueDatabaseTask(() => configureDatabase(database, databasePath));
			},
			getDatabase() {
				return activeDB;
			},
			async pingServer(): Promise<boolean> {
				if (activeDB === 'sql' && db) {
					try {
						await (db as mysql.Pool).query({
							sql: 'SELECT 1',
							timeout: 2000,
						});
						return true;
					} catch (error) {
						console.error('Database heartbeat ping failed:', error);
						return false;
					}
				}
				
				if (activeDB === 'sqlite' && db) {
					return true;
				}
				
				return false;
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
	if (storeWindow) return;
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
	if (updaterWindow) return;
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
		void init().catch(error => console.error('Failed to initialize application:', error));
	});
}

function init(): Promise<void> {
	if (!initialization) {
		initialization = (async () => {
			updaterWindow?.webview.rpc?.send.displayDebug({ message: 'Initializing App Sandbox...' });
			await fs.mkdir(studio_path, { recursive: true });
			await fs.mkdir(store_path, { recursive: true });
			await updater.init();
			await enqueueDatabaseTask(() => configureDatabase('sqlite'));
		})().catch(error => {
			initialization = null;
			const message = error instanceof Error ? error.message : String(error);
			updaterWindow?.webview.rpc?.send.displayDebug({ message, type: 'error' });
			throw error;
		});
	}
	return initialization;
}

openUpdater();

export default {
	store_path,
	studio_path
};