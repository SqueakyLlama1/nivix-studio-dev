import * as main from './index.js';

export async function init() {
	try {
		await window.voltAPI.initSandbox();
		console.log('Sandbox Initialized');
	} catch (err) {
		console.error(err);
	}
}