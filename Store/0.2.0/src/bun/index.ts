import path from 'path';
import os from 'os';
import fs from 'fs/promises';

const updaterLogicDelay = 2000; // Delay before the logic in the updater starts, in milleseconds, for flair.
const initLogicDelay = 100; // Delay after each task in the init function, in milleseconds, for flair.

import { BrowserView, BrowserWindow } from "electrobun/bun";
import Database from 'bun:sqlite';

import * as updater from "./updater.js";
import * as utils from "./launcher_utils.js";
import { type UpdaterRPCType } from '../shared/bun/updater_rpc_type.ts';
import { type StoreRPCType } from '../shared/bun/store_rpc_type.ts';

function wait(ms: number) {return new Promise(resolve => setTimeout(resolve, ms));}

const studio_path = path.join(os.homedir(), 'nvxstdo');
const store_path = path.join(studio_path, 'store');
const preferences_path = path.join(store_path, 'preferences.json');

const oldFormats = {
	"0.1.0-hub": path.join('appdata', 'store', 'inventory.ndjson'),
	"0.1.0": path.join('store', 'inventory.ndjson')
};

const ctx = { studio_path, oldFormats };

let functionsModule;
let functions: Record<string, (...args: any[]) => any> = {};
let db;

const updaterRPC = BrowserView.defineRPC<UpdaterRPCType>({
	maxRequestTime: 5000,
	handlers: {
		requests: {
			async checkUpdate() {
				return await updater.updateAvailable();
			},
			storeHandoff() {
				updaterWindow.close();
				openStore();
			},
			close() {
				updaterWindow.close();
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
					const expectedOldInventoryPath = path.join(studio_path, oldFormats['0.1.0-hub']);
					await fs.access(expectedOldInventoryPath);
					return "0.1.0-hub";
				} catch {
					// ignore and check next
				}
				
				try {
					const expectedOldInventoryPath = path.join(studio_path, oldFormats['0.1.0']);
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
			}
		}
	}
});

type UpdaterRPC = ReturnType<typeof BrowserView.defineRPC<UpdaterRPCType>>;
type StoreRPC = ReturnType<typeof BrowserView.defineRPC<StoreRPCType>>;

let storeWindow: BrowserWindow<StoreRPC>;
let updaterWindow: BrowserWindow<UpdaterRPC>;

async function init_sandbox() {
	try {
		await fs.mkdir(store_path, { recursive: true });
		await fs.mkdir(studio_path, { recursive: true });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		throw new Error(`Failed to initialize sandbox directories: ${message}`);
	}
}

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
	
	updaterWindow = new BrowserWindow({
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
}

async function init() {
	openUpdater();
	await wait(updaterLogicDelay);
	
	updaterWindow.webview.rpc?.send.displayDebug({ message: "Initializing App Sandbox..." });
	
	try {
		await updater.init();
		await init_sandbox();
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		updaterWindow.webview.rpc?.send.displayDebug({ message, type: 'error'});
		return;
	}
	
	try {
		db = new Database(path.join(store_path, "inventory.db"));
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		throw new Error(`Failed to open/connect SQLite Database: ${message}`);
	}
	
	await wait(initLogicDelay);
	updaterWindow.webview.rpc?.send.displayDebug({ message: "Initializing SQLite Database..." });
	
	try {
		const initModule = await import('./init_database_function.js');
		await initModule.init_database(db);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error(message);
		updaterWindow.webview.rpc?.send.displayDebug({ message, type: 'error'});
		throw new Error(`Database Migration Failed: ${message}`);
	}
	
	await wait(initLogicDelay);
	updaterWindow.webview.rpc?.send.displayDebug({ message: "Loading Functions..." });
	
	try {
		functionsModule = await import('./functions.ts');
		const initFunctions = functionsModule.default || functionsModule;
		
		if (typeof initFunctions === 'function') {
			functions = initFunctions(db, ctx);
		} else {
			functions = initFunctions || {};
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error(`Error loading functions.ts module: ${message}`);
		functions = {};
	}
	
	await wait(initLogicDelay);
	updaterWindow.webview.rpc?.send.readyToCheckUpdates();
}

init();

export default {
    store_path,
    studio_path
};