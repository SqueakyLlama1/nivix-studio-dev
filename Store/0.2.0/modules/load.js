import { loadCSS, unloadCSS } from './file_loader.js';
import { visualSettings } from './settings.js';
import * as tabs from './tabs.js';
import * as index from './index.js';
import * as welcome_back from './welcome_back.js';
import * as select_space from './select_space.js';

function getEBD(id) {return document.getElementById(id);}
function wait(ms) {return new Promise(resolve => setTimeout(resolve, ms));}

const menuDelay = visualSettings.menuDelay || 750;
const load_menu = getEBD('load_menu');

const versionLabel = getEBD('load_footer_version');

let load_stylesheet;
let tooltip_stylesheet;

let isFinishing = false;

export async function init() {
    versionLabel.innerText = `v${index.store.sessionVersion}` || "Failed to get session version";
    
    load_stylesheet = loadCSS('sheets/load.css');
    tooltip_stylesheet = loadCSS('sheets/tooltips.css');

    try {
        await window.storeAPI.initSandbox();
        console.log('Initialized Sandbox');
    } catch (err) {
        console.error(`Failed to initialize sandbox: ${err}`);
        return;
    }
}

async function finish_loading() {
    if (isFinishing) return;
    isFinishing = true;
    
    await tabs.remove('load_menu');
    unloadCSS(load_stylesheet);

    const versionToConvert = await window.storeAPI.needsConversion();
    if (versionToConvert) {
        console.log('Old inventory found, showing welcome back screen');
        welcome_back.init();
        return;
    }
    select_space.init();
}

window.addEventListener('load', async () => {
    await wait(menuDelay);
    await finish_loading();
});