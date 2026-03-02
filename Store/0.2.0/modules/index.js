import * as fs from './fs.js'
import * as load from './load.js'
import * as tabs from './tabs.js'
import * as tooltipsLib from '../libraries/tooltips.js'
const os = require('os');
const path = require('path');

function wait(ms) {return new Promise((resolve) => {setTimeout(resolve, ms)})}

export const store = {
    sessionVersion: "0.2.0",
    sandbox: path.join(os.homedir(), 'nvxstdo', 'store'),
    sandboxPlain: path.join('nvxstdo', 'store')
}

async function main() {
    try {
        await fs.init();
    } catch {
        document.body.innerHTML = "Failed to create files, Store has stopped execution for your safety.";
    }
    load.init();
    const animationDelay = 1000;
    
    try {
        await wait(animationDelay);
        tabs.remove('load');
        tooltipsLib.initDelayedTooltips();
        tabs.show('select-space');
    } catch(err) {
        console.warn(`Failed to remove loadElement from parent: ${err}`);
    }
}

export function quit() {
    window.close();
}

main();