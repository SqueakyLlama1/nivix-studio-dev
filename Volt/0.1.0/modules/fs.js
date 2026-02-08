const fs = require('fs').promises;
import * as main from './index.js'

export async function init() {
	try {
		await fs.mkdir(main.volt.sandbox, { recursive: true });
		console.log('Sandbox ready!');
	} catch (err) {
		console.error('Failed to create sandbox:', err);
	}
}